require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { planPathway, updateProgressAndReplan } = require('./agent');
const { listTracks } = require('./retriever');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/tracks', (req, res) => {
  res.json({ tracks: listTracks() });
});

app.post('/api/roadmap', async (req, res) => {
  try {
    const { interest, level, completedIds, goal } = req.body;
    if (!interest) return res.status(400).json({ error: 'interest is required' });

    const plan = await planPathway({
      interest,
      level: level || 'beginner',
      completedIds: completedIds || [],
      goal: goal || '',
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { interest, level, completedIds, newlyCompletedId, goal } = req.body;
    if (!interest || !newlyCompletedId) {
      return res.status(400).json({ error: 'interest and newlyCompletedId are required' });
    }

    const plan = await updateProgressAndReplan({
      interest,
      level: level || 'beginner',
      completedIds: completedIds || [],
      newlyCompletedId,
      goal: goal || '',
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Course Pathway Agent running on :${PORT}`));