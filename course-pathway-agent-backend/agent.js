const { retrieveTrack, getUnlockedCourses } = require('./retriever');
const { generateGuidance } = require('./watsonx');

/**
 * If a student self-assesses as intermediate/advanced, auto-clear the
 * lower-level courses in that track so the roadmap starts at the right
 * point instead of always beginning at absolute beginner.
 */
function applyAssessedLevel(track, level) {
  const order = ['beginner', 'intermediate', 'advanced'];
  const levelIndex = order.indexOf(level);
  if (levelIndex <= 0) return [];

  const autoCompleted = [];
  for (let i = 0; i < levelIndex; i++) {
    const lvl = order[i];
    (track.levels[lvl] || []).forEach((c) => autoCompleted.push(c.id));
  }
  return autoCompleted;
}

const URGENCY_SIGNALS = [
  'asap', 'fast', 'quick', 'urgent', 'placement', 'job ready', 'job-ready',
  'interview', '3 month', 'three month', 'soon', 'deadline', 'rush',
];

const DEPTH_SIGNALS = [
  'master', 'deep', 'thorough', 'expert', 'strong foundation',
  'really understand', 'mastery', 'in-depth', 'in depth', 'comprehensive',
];

/**
 * Reads the student's stated goal and classifies it into a priority mode.
 * This is what makes "adapts based on preferences" real: the mode changes
 * which courses actually get recommended, not just how they're described.
 */
function detectPreferenceMode(goal) {
  const g = (goal || '').toLowerCase();
  if (URGENCY_SIGNALS.some((sig) => g.includes(sig))) return 'urgency';
  if (DEPTH_SIGNALS.some((sig) => g.includes(sig))) return 'depth';
  return 'balanced';
}

/**
 * Reorders unlocked courses based on the detected preference mode, before
 * the top 3 are sliced off. This actually changes the recommended set,
 * not just the explanation text.
 */
function applyPreferenceOrdering(unlocked, mode) {
  const sorted = [...unlocked];
  if (mode === 'urgency') {
    // Shortest, fastest-impact courses first — get moving quickly
    sorted.sort((a, b) => a.hours - b.hours);
  } else if (mode === 'depth') {
    // Longer, more comprehensive courses first — build real mastery
    sorted.sort((a, b) => b.hours - a.hours);
  }
  // 'balanced' — leave in natural prereq/level order
  return sorted;
}

/**
 * The agent loop. Holds state (completed courses, assessed level, stated
 * goal), perceives changes, and re-plans the roadmap every time progress
 * or preferences are reported.
 */
async function planPathway({ interest, level = 'beginner', completedIds = [], goal = '' }) {
  // 1. PERCEIVE — read current track + student state
  const track = retrieveTrack(interest);
  if (!track) {
    throw new Error(`No knowledge base entry for track: ${interest}`);
  }

  // 2. DECIDE — merge assessed-level skip-ahead with completed courses,
  //    retrieve what's unlocked, then reorder by stated preference
  const assessedCompleted = applyAssessedLevel(track, level);
  const effectiveCompleted = [...new Set([...assessedCompleted, ...completedIds])];
  const unlocked = getUnlockedCourses(track, effectiveCompleted);

  const preferenceMode = detectPreferenceMode(goal);
  const reordered = applyPreferenceOrdering(unlocked, preferenceMode);

  // Urgency -> fewer, sharper picks (move fast). Depth -> more courses
  // shown upfront (build a fuller foundation). This is what makes the
  // effect actually visible, not just reordered.
  const batchSize = preferenceMode === 'urgency' ? 2 : preferenceMode === 'depth' ? 4 : 3;
  const nextBatch = reordered.slice(0, batchSize);

  const progressSummary = completedIds.length
    ? `${completedIds.length} course(s) completed since starting`
    : `starting at ${level} level`;

  // 3. ACT — call Granite, grounded in the preference-ordered courses
  let guidance;
  try {
    guidance = await generateGuidance({
      interest,
      level,
      unlockedCourses: nextBatch,
      progressSummary,
      goal,
      preferenceMode,
    });
  } catch (err) {
    console.error('WATSONX ERROR:', err.response?.data || err.message);
    guidance = `Based on your progress (${progressSummary}), focus next on: ${nextBatch
      .map((c) => c.title)
      .join(', ')}. These unlock directly from what you've already completed.`;
  }

  return {
    track: track.track,
    level,
    goal,
    preferenceMode,
    completed: effectiveCompleted,
    recommended: nextBatch,
    guidance,
  };
}

async function updateProgressAndReplan({ interest, level, completedIds, newlyCompletedId, goal }) {
  const updated = [...new Set([...completedIds, newlyCompletedId])];
  return planPathway({ interest, level, completedIds: updated, goal });
}

module.exports = { planPathway, updateProgressAndReplan };