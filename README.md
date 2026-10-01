# Research Hub

Claude researches any topic with live web search and automatically organises the
findings into a real folder library. Every finding is a plain Markdown file you
can open in any editor. Nothing is locked inside a database.

---

## Project structure

```
research-hub/
├── backend/                   # Python – FastAPI + Hub engine
│   ├── __init__.py
│   ├── hub.py                 # Core Hub class, CLI, Claude agent loop
│   ├── api.py                 # FastAPI REST API (serves frontend/dist in prod)
│   └── requirements.txt       # Pinned Python dependencies
│
├── frontend/                  # React + Vite UI
│   ├── index.html             # Vite HTML shell
│   ├── vite.config.js         # Vite config (dev proxy → :8000, build → dist/)
│   ├── package.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # All UI components
│       └── styles.css         # Design tokens + layout
│
├── docs/                      # Additional documentation (add your own)
│
├── research_hub_data/         # Created at runtime – not committed
│   ├── library/               # Filed findings (Markdown)
│   │   └── Inbox/
│   └── .hub/
│       ├── state.json         # Sessions, pending queue, decisions, notices
│       └── activity.jsonl     # Append-only event log
│
├── .env.example               # Copy to .env and fill in ANTHROPIC_API_KEY
├── .gitignore
└── README.md
```

---

## Requirements coverage

| # | Requirement | Where it lives |
|---|---|---|
| 1 | Research specific topics from your instructions | `backend/hub.py` `run_agent` → Claude + `web_search` tool |
| 2 | Auto-organise into folders/subfolders | `file_finding` tool → `write_finding` → `library/<Folder>/` |
| 3 | Decide placement by context (confidence gate) | Claude scores confidence; ≥ 0.7 in existing folder = auto-filed |
| 4 | Ask permission when unsure | Pending queue → **Review** tab / `hub review` CLI |
| 5 | Track capabilities | `CAPABILITIES` string → **About** tab |
| 6 | Notify on limitations / errors | `report_limitation` tool → **Review → Limitations** / `hub notices` |
| 7 | Powerful search across all research | Full-text + partial match, snippet previews → **Search** tab / `hub search` |
| 8 | Research history and activity logs | `activity.jsonl` → **Activity** tab (filterable by session) / `hub log` |
| 9 | Resume from exactly where you stopped | `save_progress` tool → **Resume** button / `hub resume` |
| 10 | Remember previous decisions for future runs | `decisions` list fed into every system prompt → **Decisions** tab / `hub decisions` |
| 11 | Structured, traceable, easy to manage | Plain-file library + full audit log + delete finding in Library UI |

---

## Setup

```bash
# 1. Clone / download the project
cd research-hub

# 2. Python backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt

# 3. Get a FREE Gemini API key
#    → https://aistudio.google.com  (sign in with Google, click "Get API key")
#    No credit card required.

# 4. Set your API key (copy .env.example → .env and edit)
cp .env.example .env        # then open .env and set GEMINI_API_KEY=AIza...

# 5. (Optional) build the React UI once
cd frontend && npm install && npm run build && cd ..
```

---

## Run

### Web app  (React UI + REST API)

```bash
# From the project root, run uvicorn pointing at backend/api.py:
uvicorn backend.api:app --port 8000
# Then open http://localhost:8000
```

### Frontend development server  (hot-reload, proxies /api → :8000)

Start the backend first, then in a second terminal:

```bash
cd frontend
npm run dev          # opens http://localhost:5173
```

### Rebuild the UI for production

```bash
cd frontend && npm run build
# Output goes to frontend/dist/ which api.py picks up automatically
```

---

## CLI reference

All commands run from the **project root** with the venv active.

```bash
# Start new research
python -m backend.hub research "Solar panel costs" -i "residential, last 3 years, cite sources"

# Continue from where it stopped
python -m backend.hub resume [session-id] -i "also compare inverters"

# Review uncertain findings (new folder or low confidence)
python -m backend.hub review

# See limitations, access problems, open questions
python -m backend.hub notices [--clear]

# Full-text + partial search with snippet previews
python -m backend.hub search perovskite

# Show library folder tree
python -m backend.hub tree

# List all sessions
python -m backend.hub sessions

# Full activity log
python -m backend.hub log

# View filing patterns you have taught the system
python -m backend.hub decisions

# Show what the system can do
python -m backend.hub capabilities
```

---

## How organisation works

**Filing rules:**

| Situation | What happens |
|---|---|
| Existing folder + confidence ≥ 0.7 | Filed automatically |
| New folder **or** confidence < 0.7 | Held in pending queue for your approval |
| You approve with a folder choice | Filed; pattern added to `decisions` for future runs |
| You discard | Logged; not filed |
| Blocked page / failed search | Recorded as a `limitation` notice; research continues |

---

## Demo mode  (no API key needed)

```bash
HUB_DEMO=1 uvicorn backend.api:app --port 8000
```

Runs all UI features (filing, review queue, notices, search, history, resume,
decisions) with scripted placeholder findings. No real research happens and a
warning banner is shown.

---

## Tests

```bash
# From the project root (neither test requires an API key):
python -m pytest backend/tests/          # if you have a tests/ folder
# or run individual test files:
python backend/test_hub.py
python backend/test_api.py
```

---

## Backing up your research

Everything lives in one directory:

```bash
# Back up
cp -r research_hub_data my_backup/

# Sync to cloud
rsync -av research_hub_data/ user@server:research_hub_data/
```

Findings are plain Markdown — open them in Obsidian, VS Code, Typora, or any
editor. The `.hub/` subfolder holds the state; delete it to start fresh while
keeping your filed findings.
