# LearnMate — Backend

**Agentic AI for Personalized Course Pathways** — IBM AICTE Problem Statement No. 12

LearnMate is an agentic AI coaching system that interacts with a student, assesses their skill level, and builds a personalized course roadmap that adapts over time based on progress and stated preferences — powered by **IBM Granite** via **IBM watsonx.ai**, running on **IBM Cloud Lite**.

This repo is the backend: a Node.js/Express REST API that implements the agent's perceive-decide-act loop, a RAG-style retrieval layer, and the watsonx.ai integration.

Live API: `https://learnmate-backend-1.onrender.com`
Frontend repo: [learnmate-frontend](https://github.com/Theertha1507/learnmate-frontend)

---

## How it works

1. **Perceive** — the agent reads the student's current state: assessed skill level, completed courses, and their stated goal.
2. **Retrieve (RAG)** — `retriever.js` looks up the selected track in a structured course knowledge base and filters courses by prerequisites already completed.
3. **Decide** — a preference engine detects urgency vs. depth signals in the student's stated goal and reorders (and resizes) the recommended course set accordingly.
4. **Act** — `watsonx.js` calls IBM Granite (via watsonx.ai's chat completions endpoint) to generate a personalized explanation grounded in the retrieved, reordered courses.
5. **Adapt** — marking a course complete re-runs the entire loop, producing a genuinely updated roadmap rather than a cached response.

## Tech stack

- **Node.js + Express** — REST API
- **IBM watsonx.ai** — model deployment / chat completions endpoint
- **IBM Granite (`granite-4-h-small`)** — foundation model powering reasoning and guidance generation
- **IBM Cloud Lite (Watson Machine Learning Runtime)** — hosts the Granite model
- **Retrieval-Augmented Generation** — structured JSON knowledge base + prerequisite graph filtering

## Project structure

```
├── server.js         # Express app, route definitions
├── agent.js          # Perceive-decide-act loop, preference engine
├── retriever.js       # RAG retrieval over the knowledge base
├── watsonx.js         # IBM watsonx.ai / Granite API client
├── knowledgeBase.json # Course catalog, prerequisites, resource links
└── package.json
```

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tracks` | List available interest tracks |
| POST | `/api/roadmap` | Generate a roadmap given interest, assessed level, and goal |
| POST | `/api/progress` | Mark a course complete and trigger replanning |

## Setup

1. Clone this repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (see `.env.example`) with your IBM Cloud credentials:
   ```
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   WATSONX_PROJECT_ID=your_project_id
   WATSONX_API_KEY=your_ibm_cloud_api_key
   WATSONX_MODEL_ID=ibm/granite-4-h-small
   PORT=5050
   ```

   You'll need:
   - An **IBM Cloud Lite** account
   - A **watsonx.ai** project with an associated **Watson Machine Learning Runtime** service instance
   - An **IBM Cloud API key** (Manage → Access (IAM) → API keys)
   - Your **watsonx.ai project ID** (inside your project → Manage → General)

3. Run the server:
   ```bash
   npm start
   ```

4. Test it:
   ```bash
   curl http://localhost:5050/api/tracks
   ```

## Deployment

Deployed on **Render** (free tier). Environment variables are set directly in the Render dashboard rather than committed to the repo.

## Novelty

- **Real skill assessment** — a scored quiz genuinely changes the starting point of the roadmap, not just cosmetic framing.
- **Preference-driven reordering** — stating "placement in 3 months" vs. "I want to master this" produces a *different set and count* of recommended courses, not just different wording.
- **Grounded reasoning** — every explanation from Granite is grounded in retrieved, prerequisite-filtered course data.
- **Genuine replanning** — marking progress re-runs the full agent loop.


