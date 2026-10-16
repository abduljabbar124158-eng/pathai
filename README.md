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

## Why this maps to the course

This project was built to demonstrate everything covered across the five
masterclasses:

- **Prompt engineering** — every feature above is powered by a carefully
  written prompt (see `ai_service.py` call sites in `app.py`) that shapes
  what the AI returns and in what format.
- **Vibe coding** — this entire app was built with AI-assisted development,
  same idea as the masterclass demo.
- **Cloud data, persistence & API architecture** — a REST API (Flask)
  backed by a persistent database (SQLite; upgradeable to AWS RDS), with
  clean, separate endpoints per feature.
- **Deploying on AWS** — see `DEPLOYMENT.md` for exact steps to put this
  live on an AWS EC2 instance.

## Architecture

```
Browser (single-page dashboard)
      |  fetch() calls
      v
Flask app (app.py)  ---- REST API ----
      |
      +--> db.py          (SQLite persistence layer)
      +--> ai_service.py  (swappable GenAI provider: OpenAI / Gemini /
                            HuggingFace / mock)
```

- **Frontend**: `templates/index.html` + `static/css/style.css` +
  `static/js/app.js`. No framework/build step — plain HTML/CSS/JS calling
  the Flask API with `fetch()`.
- **Backend**: `app.py` defines all REST endpoints, one group per feature.
- **AI layer**: `ai_service.py` is the *only* place that talks to an AI
  provider. Every feature calls `ai_service.generate_text(prompt, system)`.
  This means switching AI providers is a one-line change in `.env` — no
  code in `app.py` needs to change.
- **Database**: `db.py` uses Python's built-in `sqlite3` (no ORM
  dependency). Each feature has its own table(s) — see the `SCHEMA` string
  in `db.py` for the full data model.

## Setup (local)

1. **Install Python 3.10+** if you don't have it already.

2. **Create a virtual environment and install dependencies:**
   ```bash
   cd pathai
   python3 -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure your AI provider:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `AI_PROVIDER` to one of:
   - `mock` — no API key needed. Every feature works immediately with
     realistic placeholder output. **Great for testing the whole app
     before you have a key, and start here to confirm everything runs.**
   - `openai` — set `OPENAI_API_KEY`
   - `gemini` — set `GEMINI_API_KEY` (free tier available at
     https://aistudio.google.com/apikey)
   - `huggingface` — set `HUGGINGFACE_API_KEY` (free tier available at
     https://huggingface.co/settings/tokens)

4. **Run it:**
   ```bash
   python app.py
   ```
   Open **http://localhost:5000** in your browser.

That's it — the database file (`pathai.db`) is created automatically on
first run.

## Project report notes (for your submission)

Things worth screenshotting / writing up for your capstone report:

- The prompt templates in `app.py` for each feature (this is your
  "prompt engineering" evidence)
- The database schema in `db.py` (your "cloud data & persistence"
  evidence)
- A screenshot of the Progress Dashboard after using a few features
- The AWS deployment steps + screenshot of the live URL (see
  `DEPLOYMENT.md`)

## Folder structure

```
pathai/
├── app.py              # Flask routes (all 8 features)
├── ai_service.py        # AI provider abstraction (swap providers here)
├── db.py                 # SQLite persistence layer
├── requirements.txt
├── .env.example          # copy to .env and fill in your API key
├── templates/
│   └── index.html        # single-page dashboard
├── static/
│   ├── css/style.css
│   └── js/app.js
├── uploads/              # uploaded PDFs land here (gitignored in practice)
└── DEPLOYMENT.md          # AWS deployment steps
```
