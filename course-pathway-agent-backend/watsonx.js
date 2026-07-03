const axios = require('axios');

const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const API_KEY = process.env.WATSONX_API_KEY;
const MODEL_ID = process.env.WATSONX_MODEL_ID || 'ibm/granite-4-h-small';

let cachedToken = null;
let tokenExpiry = 0;

async function getIamToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: API_KEY,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return cachedToken;
}

const MODE_INSTRUCTIONS = {
  urgency: 'The student is on a time pressure. Emphasize that these courses were chosen because they are the fastest path to real competence, not the most thorough one.',
  depth: 'The student wants real mastery. Emphasize that these courses were chosen because they go deep rather than fast, building durable understanding.',
  balanced: '',
};

async function generateGuidance({ interest, level, unlockedCourses, progressSummary, goal, preferenceMode }) {
  const token = await getIamToken();

  const goalLine = goal
    ? `The student's stated goal: "${goal}". Tailor your reasoning to this goal specifically.`
    : '';

  const modeLine = MODE_INSTRUCTIONS[preferenceMode] || '';

  const prompt = `You are LearnMate, a career-pathway coaching agent. Write ONLY the final message to the student — no titles, no meta-commentary about tone or writing style, no markdown headers.

Student interest: ${interest}
Assessed skill level: ${level}
Progress so far: ${progressSummary}
${goalLine}
${modeLine}

Recommended next courses:
${unlockedCourses.map((c) => `- ${c.title} (${c.level}, ${c.hours}h)`).join('\n')}

Write a single short paragraph (under 100 words) directly addressing the student, explaining why these specific courses and this specific order are the right next step given their level${goal ? ' and stated goal' : ''}. Start immediately with the explanation — do not restate these instructions.`;

  const res = await axios.post(
    `${WATSONX_URL}/ml/v1/text/chat?version=2024-05-01`,
    {
      model_id: MODEL_ID,
      project_id: PROJECT_ID,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return res.data.choices[0].message.content.trim();
}

module.exports = { generateGuidance };