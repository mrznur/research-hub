# Research Hub

An AI-powered research assistant that investigates topics using live web search and organises findings into a structured Markdown library. Built with a Python/FastAPI backend and a React frontend.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Autonomous research** — give it a topic and optional instructions; the AI searches the web and writes structured findings
- **Smart auto-filing** — findings above a confidence threshold are filed automatically; uncertain ones go to a review queue
- **Decision memory** — filing choices are remembered and applied to future research sessions
- **Full-text search** — search across all findings with snippet previews
- **Resume sessions** — pick up exactly where a previous research round ended
- **Activity log** — complete audit trail of every action across all sessions
- **Demo mode** — run the full UI without any API key

---

## Tech stack

| Layer | Technology |
|---|---|
| LLM | [Groq](https://console.groq.com) — `openai/gpt-oss-120b` |
| Web search | [Tavily](https://app.tavily.com) (optional) |
| Backend | Python, FastAPI, uvicorn |
| Frontend | React 18, Vite 5, Lucide icons |
| Storage | Plain Markdown files + JSON state |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com) — no credit card required
- (Optional) A free [Tavily API key](https://app.tavily.com) — 1,000 searches/month free

---

## Getting started

```bash
# Clone the repository
git clone https://github.com/mrznur/research-hub.git
cd research-hub

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Install Python dependencies
pip install -r backend/requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and set GROQ_API_KEY and optionally TAVILY_API_KEY

# Build the React frontend
cd frontend && npm install && npm run build && cd ..

# Start the server
uvicorn backend.api:app --port 8000
# Open http://localhost:8000
```

---

## Development

Run the backend and frontend separately for hot-reload during development:

```bash
# Terminal 1 — backend
uvicorn backend.api:app --port 8000 --reload

# Terminal 2 — frontend
cd frontend && npm run dev
# Opens http://localhost:5173 — API calls are proxied to :8000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key — [console.groq.com](https://console.groq.com) |
| `TAVILY_API_KEY` | No | Tavily search key — [app.tavily.com](https://app.tavily.com) |
| `HUB_HOME` | No | Data directory (default: `./research_hub_data`) |
| `HUB_MODEL` | No | Groq model (default: `openai/gpt-oss-120b`) |
| `HUB_DEMO` | No | Set to `1` to run without any API key |

---

## CLI reference

```bash
# Start new research
python -m backend.hub research "Solar panel costs" -i "residential, last 3 years"

# Resume a session
python -m backend.hub resume [session-id]

# Review pending findings
python -m backend.hub review

# Search the library
python -m backend.hub search "query"

# View all sessions
python -m backend.hub sessions

# View activity log
python -m backend.hub log

# Show library folder tree
python -m backend.hub tree
```

---

## Project structure

```
research-hub/
├── backend/
│   ├── hub.py              Core engine — agent loop, tools, CLI
│   ├── api.py              FastAPI REST API (17 endpoints)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx         All UI components
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── vite.config.js
│   └── package.json
├── docs/
│   └── SYSTEM_DESIGN.md    Full architecture documentation
├── .env.example
├── nixpacks.toml           Railway build config
├── railway.json            Railway deployment config
└── README.md
```

---

## Deployment

This project is configured for [Railway](https://railway.app). To deploy your own instance:

1. Fork this repository
2. Create a new project on Railway and connect the repo
3. Add a volume mounted at `/data` for persistent storage
4. Set the following environment variables in Railway:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `HUB_HOME` = `/data/research_hub_data`

Railway will detect `railway.json` and `nixpacks.toml` automatically and handle the build.

---

## Data and privacy

All research data is stored as plain Markdown files in `research_hub_data/`. This directory is excluded from git by default. To back up your library:

```bash
cp -r research_hub_data my_backup/
```

Findings can be opened in any Markdown editor — Obsidian, VS Code, Typora, etc.

---

## License

MIT
