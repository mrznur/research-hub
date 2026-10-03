# Research Hub

An AI-powered research assistant that investigates topics using live web search and organises findings into a structured Markdown library. Built with a Python/FastAPI backend and a React frontend.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Autonomous research** — give it a topic and optional instructions; the AI searches the web and writes detailed findings
- **Smart auto-filing** — findings above a confidence threshold are filed automatically; uncertain ones go to a review queue
- **Decision memory** — filing choices are remembered and reused in future sessions
- **Move findings** — drag any finding to a different folder from the library viewer
- **Full-text search** — search across all findings with snippet previews
- **Resume sessions** — pick up exactly where a previous research round ended
- **Activity log** — complete audit trail of every action across all sessions
- **Demo mode** — run the full UI without any API key
- **Mobile-friendly** — slide-in drawer navigation, responsive layout

---

## Tech stack

| Layer | Technology |
|---|---|
| LLM | [Groq](https://console.groq.com) — `openai/gpt-oss-120b` |
| Web search | [Tavily](https://app.tavily.com) (optional) |
| Backend | Python 3.10+, FastAPI, uvicorn |
| Frontend | React 18, Vite 5, Lucide icons |
| Storage | Plain Markdown files + JSON state |
| Deployment | [Railway](https://railway.app) |

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

Run backend and frontend separately for hot-reload:

```bash
# Terminal 1 — backend
uvicorn backend.api:app --port 8000 --reload

# Terminal 2 — frontend (hot reload, proxies /api → :8000)
cd frontend && npm run dev
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) |
| `TAVILY_API_KEY` | No | [app.tavily.com](https://app.tavily.com) — enables live web search |
| `HUB_HOME` | No | Data directory (default: `./research_hub_data`) |
| `HUB_MODEL` | No | Groq model (default: `openai/gpt-oss-120b`) |
| `HUB_DEMO` | No | Set to `1` to run without any API key |

---

## CLI reference

```bash
python -m backend.hub research "Solar panel costs" -i "residential, last 3 years"
python -m backend.hub resume [session-id]
python -m backend.hub review
python -m backend.hub search "query"
python -m backend.hub sessions
python -m backend.hub log
python -m backend.hub tree
```

---

## Project structure

```
research-hub/
├── backend/
│   ├── hub.py              Core engine — agent loop, tools, CLI
│   ├── api.py              FastAPI REST API (18 endpoints)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── hooks/
│   │   │   └── useDarkMode.js
│   │   ├── components/
│   │   │   ├── About.jsx
│   │   │   ├── Activity.jsx
│   │   │   ├── ClockWidget.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Decisions.jsx
│   │   │   ├── Library.jsx
│   │   │   ├── MarkdownDoc.jsx
│   │   │   ├── Research.jsx
│   │   │   ├── Review.jsx
│   │   │   ├── Search.jsx
│   │   │   └── Sidebar.jsx
│   │   └── styles.css
│   └── package.json
├── docs/
│   └── SYSTEM_DESIGN.md
├── .env.example
├── nixpacks.toml
├── railway.json
└── README.md
```

---

## Deployment (Railway)

1. Fork this repository
2. Create a new project on [Railway](https://railway.app) and connect the repo
3. Add a volume mounted at `/data` for persistent storage
4. Set environment variables in Railway:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `HUB_HOME` = `/data/research_hub_data`

Railway detects `railway.json` and `nixpacks.toml` automatically.

---

## Backing up your research

All findings are plain Markdown files in `research_hub_data/library/`. Back up the whole directory:

```bash
cp -r research_hub_data my_backup/
```

Works with Obsidian, VS Code, Typora, or any Markdown editor.

---

## License

MIT
