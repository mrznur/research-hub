# Research Hub

A Groq-powered research assistant that investigates any topic using live web search and automatically organises findings into a real folder library. Every finding is a plain Markdown file you can open in any editor — nothing is locked inside a database.

---

## How it works

1. You give it a topic (and optional instructions)
2. The Groq LLM searches the web, reads results, and writes structured findings
3. Findings are auto-filed into your library folders based on confidence scoring
4. Uncertain placements are held in a pending queue for your review
5. Filing decisions are remembered and reused in future research runs

---

## Project structure

```
research-hub/
├── backend/                   # Python – FastAPI + Hub engine
│   ├── __init__.py
│   ├── hub.py                 # Core Hub class, CLI, Groq agent loop
│   ├── api.py                 # FastAPI REST API (serves frontend/dist in prod)
│   └── requirements.txt       # Pinned Python dependencies
│
├── frontend/                  # React + Vite UI
│   ├── index.html
│   ├── vite.config.js         # Dev proxy → :8000, build → dist/
│   ├── package.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # All UI components
│       └── styles.css         # Design tokens + layout
│
├── docs/
│   └── SYSTEM_DESIGN.md
│
├── research_hub_data/         # Created at runtime – not committed
│   ├── library/               # Filed findings (Markdown)
│   │   └── Inbox/
│   └── .hub/
│       ├── state.json         # Sessions, pending queue, decisions, notices
│       └── activity.jsonl     # Append-only event log
│
├── .env.example               # Copy to .env and fill in your API keys
├── .gitignore
└── README.md
```

---

## Requirements

- Python 3.10+
- Node.js 18+ (for the React frontend)
- A free [Groq API key](https://console.groq.com) — no credit card needed
- (Optional) A free [Tavily API key](https://app.tavily.com) for live web search — 1000 searches/month free

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/mrznur/research-hub.git
cd research-hub

# 2. Create and activate a Python virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Open .env and set:
#   GROQ_API_KEY=gsk_...        (required)
#   TAVILY_API_KEY=tvly-...     (optional, enables live web search)

# 5. Build the React UI
cd frontend && npm install && npm run build && cd ..
```

---

## Run

### Web app (React UI + REST API)

```bash
uvicorn backend.api:app --port 8000
# Open http://localhost:8000
```

### Frontend dev server (hot-reload, proxies /api → :8000)

Start the backend first, then in a second terminal:

```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

### Rebuild the UI for production

```bash
cd frontend && npm run build
# Output goes to frontend/dist/ — picked up automatically by api.py
```

---

## CLI reference

All commands run from the project root with the venv active.

```bash
# Start new research
python -m backend.hub research "Solar panel costs" -i "residential, last 3 years, cite sources"

# Continue from where it stopped
python -m backend.hub resume [session-id] -i "also compare inverters"

# Review uncertain findings (new folder or low confidence)
python -m backend.hub review

# See limitations, access problems, open questions
python -m backend.hub notices [--clear]

# Full-text search with snippet previews
python -m backend.hub search perovskite

# Show library folder tree
python -m backend.hub tree

# List all sessions
python -m backend.hub sessions

# Full activity log
python -m backend.hub log

# View filing patterns the system has learned
python -m backend.hub decisions

# Show what the system can do
python -m backend.hub capabilities
```

---

## Auto-filing rules

| Situation | What happens |
|---|---|
| Existing folder + confidence ≥ 0.7 | Filed automatically |
| New folder **or** confidence < 0.7 | Held in pending queue for your review |
| You approve with a folder choice | Filed; pattern saved to `decisions` for future runs |
| You discard | Logged; not filed |
| Blocked page / failed search | Recorded as a limitation notice; research continues |

---

## Demo mode (no API key needed)

```bash
HUB_DEMO=1 uvicorn backend.api:app --port 8000
```

Runs all UI features — filing, review queue, notices, search, history, resume, decisions — with scripted placeholder findings. No real research happens and a warning banner is shown.

---

## Backing up your research

Everything lives in one directory:

```bash
# Back up
cp -r research_hub_data my_backup/

# Sync to cloud
rsync -av research_hub_data/ user@server:research_hub_data/
```

Findings are plain Markdown — open them in Obsidian, VS Code, Typora, or any editor. Delete `.hub/` to reset state while keeping your filed findings.

---

## Tech stack

| Layer | Technology |
|---|---|
| LLM | [Groq](https://console.groq.com) (`openai/gpt-oss-120b` by default) |
| Web search | [Tavily](https://app.tavily.com) (optional) |
| Backend | Python, FastAPI, uvicorn |
| Frontend | React 18, Vite, Lucide icons |
| Storage | Plain Markdown files + JSON state |
