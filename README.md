# PathAI — AI Learning & Career Assistant

Built for the AICTE / IBM SkillsBuild GenAI & Cloud Computing Internship
(BharatCares / CSRBOX, 2026 cohort).

A single web app combining 8 AI-powered study & career tools:

| # | Feature | What it does |
|---|---------|---------------|
| 1 | 🤖 AI Chatbot | General-purpose learning/career Q&A chat |
| 2 | 📄 PDF Chat | Upload a PDF of notes, ask questions about it |
| 3 | 📝 Quiz Generator | Turns a topic or notes into a multiple-choice quiz |
| 4 | 📚 Notes Summarizer | Condenses long notes into revision bullet points |
| 5 | 💼 Resume Analyzer | Scores your resume against a job description |
| 6 | 🎤 Interview Practice | Mock interview Q&A with feedback, one role at a time |
| 7 | 📅 Study Planner | Generates a milestone roadmap for any learning goal |
| 8 | 📊 Progress Dashboard | Tracks usage across all features + milestone completion |

The UI uses a "Nothing OS" inspired design system (dark / chalk-white theme
toggle, dot-matrix telemetry, glyph accents) in plain HTML/CSS/JS.

## Architecture

```
Browser (single-page dashboard, templates/index.html + static/)
      |  fetch() calls
      v
Express server (server.ts)  ---- REST API ----
      |
      +--> src/db.ts        (JSON-file persistence layer)
      +--> src/aiService.ts (GenAI provider, currently Gemini, with offline demo mode)
```

- **Frontend**: `templates/index.html` + `static/css/style.css` +
  `static/js/app.js`. No framework/build step — plain HTML/CSS/JS calling
  the API with `fetch()`.
- **Backend**: `server.ts` (Express + TypeScript) defines all REST
  endpoints, one group per feature.
- **AI layer**: `src/aiService.ts` is the *only* place that talks to an AI
  provider. Every feature calls `generateText(prompt, system, maxTokens)`.
- **Database**: `src/db.ts` stores everything in `data/pathai.json`
  (created automatically on first run).

## Setup (local)

1. **Install Node.js 20+** if you don't have it already.

2. **Install dependencies:**
   ```bash
   cd pathai
   npm install
   ```

3. **Configure AI provider(s) — optional:**
   ```bash
   cp .env.example .env
   ```
   - Leave all keys empty to run in **offline demo mode** — every feature
     works immediately with a clear placeholder message, so you can test the
     whole app before you have a key.
   - Add any provider key for live AI answers. You can add **several** and
     list them as a fallback chain in `AI_PROVIDER`, e.g.
     `AI_PROVIDER=gemini,groq,openai,mock`. The app tries
     them left to right and falls through to the next if one is missing,
     rate-limited or down.

   | Provider | Key variable | Where to get one |
   |----------|--------------|------------------|
   | Google Gemini | `GEMINI_API_KEY` | https://aistudio.google.com/apikey (free) |
   | Groq | `GROQ_API_KEY` | https://console.groq.com (free) |
   | OpenAI / ChatGPT | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |

   Each provider also has a `*_MODEL` variable if you want a different model.

4. **Run it:**
   ```bash
   npm start
   ```
   Open **http://localhost:3000** in your browser.

The database file (`data/pathai.json`) is created automatically on first run.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm start` | Run the server (`tsx server.ts`) |
| `npm run dev` | Same as start |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Project report notes (for your submission)

Things worth screenshotting / writing up for your capstone report:

- The prompt templates in `server.ts` for each feature (this is your
  "prompt engineering" evidence)
- The data model in `src/db.ts` (your "cloud data & persistence" evidence)
- A screenshot of the Progress Dashboard after using a few features
- The AWS deployment steps + screenshot of the live URL (see
  `DEPLOYMENT.md`)

## Folder structure

```
pathai/
├── server.ts             # Express routes (all 8 features)
├── src/
│   ├── aiService.ts      # GenAI provider (Gemini) + offline demo fallback
│   └── db.ts             # JSON-file persistence layer
├── templates/
│   └── index.html        # single-page dashboard
├── static/
│   ├── css/style.css
│   └── js/app.js
├── data/pathai.json      # auto-created database
├── package.json
├── .env.example          # copy to .env and fill in your API key
└── DEPLOYMENT.md          # AWS deployment steps
```
