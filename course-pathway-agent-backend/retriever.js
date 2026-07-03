const kb = require('./knowledgeBase.json');

/**
 * RAG-style retrieval .
 */
function retrieveTrack(trackName) {
  const track = kb.tracks.find(
    (t) => t.track.toLowerCase() === trackName.toLowerCase()
  );
  if (!track) return null;
  return track;
}

function listTracks() {
  return kb.tracks.map((t) => t.track);
}


function getUnlockedCourses(track, completedIds = []) {
  const completed = new Set(completedIds);
  const allLevels = ['beginner', 'intermediate', 'advanced'];
  const unlocked = [];

  for (const level of allLevels) {
    const courses = track.levels[level] || [];
    for (const course of courses) {
      if (completed.has(course.id)) continue;
      const prereq = course.prereq || [];
      const satisfied = prereq.every((p) => completed.has(p));
      if (satisfied) unlocked.push({ ...course, level });
    }
  }
  return unlocked;
}

module.exports = { retrieveTrack, listTracks, getUnlockedCourses };
