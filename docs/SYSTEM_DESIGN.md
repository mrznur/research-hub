# Research Hub — Full System Design

---

## 1. Project structure

```
research-hub/
│
├── backend/                        Python — all server-side logic
│   ├── __init__.py
│   ├── hub.py                      Core engine (Hub class, agent loop, search, CLI)
│   ├── api.py                      FastAPI HTTP layer — 17 REST endpoints
│   └── requirements.txt            fastapi, uvicorn, pydantic, httpx
│
├── frontend/                       React SPA — single page application
│   ├── src/
│   │   ├── main.jsx                Entry point — mounts <App /> into #root
│   │   ├── App.jsx                 All UI components (~750 lines, no router)
│   │   └── styles.css              All CSS — tokens, dark mode, layout
│   ├── index.html                  Vite HTML shell
│   ├── vite.config.js              Build config + dev proxy (/api → :8000)
│   └── package.json                react 18, vite 5, lucide-react
│
├── docs/
│   └── SYSTEM_DESIGN.md            This file
│
├── research_hub_data/              Created at runtime — NOT in git
│   ├── library/                    All findings as plain Markdown files
│   │   └── Inbox/                  Default folder for new findings
│   └── .hub/
│       ├── state.json              All application state (atomic writes)
│       └── activity.jsonl          Append-only event log
│
├── .env                            Your API keys — never committed
├── .env.example                    Template
├── .gitignore
└── README.md
```

---

## 2. Is this a SPA?

Yes. The entire UI is one HTML file (`index.html`) with one JS bundle (`dist/assets/index-*.js`).

- **No page reloads** — tab switching is `useState("dashboard")` in React
- **No URL changes** — all navigation is in-memory React state
- **No router** — not needed; all tabs are simple conditional renders
- **Backend serves the SPA** — FastAPI has a catch-all route `GET /{full:path}` that returns `index.html` for every non-API path
- **Dev mode** — Vite dev server on `:5173` proxies `/api/*` to the FastAPI backend on `:8000`, so you can hot-reload the UI without rebuilding

```
Browser → GET / → FastAPI → returns frontend/dist/index.html
Browser → GET /assets/index-*.js → FastAPI static files → JS bundle
Browser → POST /api/research → FastAPI → Hub.new_session() + thread
Browser → GET /api/sessions → FastAPI → returns JSON
```

---

## 3. How each file works in detail

### `backend/hub.py` — The Brain

**`Hub` class** — owns everything. Instantiated once at API startup and shared.

```python
Hub.__init__()
  └─ creates research_hub_data/library/Inbox/
  └─ creates research_hub_data/.hub/
  └─ loads state.json into self.state (dict in memory)
```

**Key methods:**

| Method | What it does |
|---|---|
| `new_session(topic, instructions)` | Creates a session entry in `state["sessions"]`, saves state.json |
| `run_agent(sid)` | Full research round — builds prompt, calls Groq, executes tools, saves |
| `system_prompt(sid)` | Builds a compact (~300 token) prompt from session state |
| `_groq_request(api_key, messages)` | HTTP POST to Groq via httpx, OpenAI-compatible format |
| `_tavily_search(query, sid)` | HTTP POST to Tavily for live web results, stdlib urllib |
| `call_tool(name, args, sid)` | Routes tool calls: web_search, file_finding, search_library, etc. |
| `write_finding(f, sid, folder)` | Writes a `.md` file, appends to session.filed, logs to activity.jsonl |
| `resolve_pending(pid, folder)` | Files a held finding, adds to decisions[], logs approval |
| `search(query, limit)` | Full-text + partial match across .md files + sessions + activity log |
| `notice(kind, msg, sid)` | Deduplicated notification — skips if same kind+session already open |
| `save()` | Atomic write: state.json.tmp → rename → state.json |
| `log(kind, detail, sid)` | Append one JSON line to activity.jsonl |

**Agent loop in detail:**

```
run_agent(sid)
  │
  ├─ s["rounds"] += 1
  ├─ build messages = [system_prompt, "Begin." or "Continue..."]
  │
  ├─ loop (max 12 turns):
  │    ├─ POST to Groq → get response
  │    ├─ append assistant message to history
  │    ├─ if no tool_calls → break (model finished)
  │    └─ for each tool_call:
  │         ├─ call_tool(name, args) → result string
  │         ├─ if file_finding + Filed → add title to filed_this_round[]
  │         └─ append tool result to history
  │
  ├─ if model never called save_progress:
  │    └─ auto-synthesize: "Round N: filed X findings: title1, title2..."
  │
  └─ s["updated"] = now; save state.json
```

**Tool handlers:**

| Tool | Handler | Effect |
|---|---|---|
| `web_search` | `_tavily_search()` | Returns top 5 Tavily results with URLs and summaries |
| `list_folders` | `self.folders()` | Returns sorted list of all library subdirectories |
| `search_library` | `self.search()` | Searches existing .md files to avoid duplicates |
| `file_finding` | `write_finding()` or pending | confidence ≥ 0.7 + folder exists → write .md; else → pending[] |
| `ask_user` | `self.notice()` | Queues a "question" notice for the user |
| `report_limitation` | `self.notice()` | Queues a "limitation" notice (deduplicated) |
| `save_progress` | updates session | Sets session.summary + session.next, logs to activity.jsonl |

**System prompt (compact by design):**
```
You are a research assistant. Topic: {topic}
Instructions: {instructions[:200]}
Round: {N} | Resume from: {next or 'beginning'}
Already filed (skip): [last 10 stems]
Filing patterns to follow: [last 10 decisions as 'title->folder']
Folders: [up to 20 folder names]

{search rule: use web_search first OR use training knowledge}
Rules: call search_library first. File 3-5 findings...
ALWAYS end by calling save_progress(summary, next_step).
```

Token budget per round: ~300 prompt + ~200 per tool turn × 8 turns ≈ ~2000 tokens total.

---

### `backend/api.py` — The HTTP Layer

Thin wrapper. Does three things:

1. **Loads `.env`** — reads the file manually at import time before anything else:
   ```python
   _env_file = Path(__file__).parent.parent / ".env"
   for line in _env_file.read_text().splitlines():
       k, _, v = line.partition("=")
       os.environ.setdefault(k.strip(), v.strip())
   ```

2. **Starts research in a background thread** — so HTTP returns immediately:
   ```python
   def _start(sid):
       running.add(sid)
       def work():
           hub.run_agent(sid, interactive=False)
           running.discard(sid)
       threading.Thread(target=work, daemon=True).start()
   ```

3. **Serves the SPA** — mounts `frontend/dist/assets/` as static files, catch-all returns `index.html`.

**All 17 endpoints:**

```
GET  /api/overview              stats for dashboard (findings, sessions, running, pending)
GET  /api/sessions              all sessions sorted by updated desc
POST /api/research              start new session → non-blocking thread
POST /api/sessions/{sid}/resume resume a session → non-blocking thread
GET  /api/sessions/{sid}        single session detail
GET  /api/tree                  folder tree + file list for Library tab
GET  /api/file?path=            read a finding's Markdown content
DELETE /api/file?path=          delete a finding, update session.filed counts
POST /api/folders               create a folder manually
GET  /api/pending               findings waiting for user folder approval
POST /api/pending/{pid}/resolve approve (with folder) or discard a pending finding
GET  /api/notices               open limitation/error/question notifications
POST /api/notices/{nid}/dismiss mark a notice as closed
GET  /api/decisions             past user filing choices (fed back to AI)
DELETE /api/decisions/{idx}     remove a bad filing pattern
GET  /api/search?q=             full-text search across findings + sessions + log
GET  /api/log?limit=&session=   activity log, filterable by session id
```

---

### `frontend/src/App.jsx` — The UI

Single-file React app. Structure:

```
App()                     ← root, owns tab state + dark mode + overview polling
  ├─ useDarkMode()        ← reads/writes localStorage, toggles html.dark class
  ├─ ClockWidget          ← fixed bottom-right, updates every second
  ├─ <aside.side>         ← sidebar nav + dark mode toggle button
  └─ <main>
       ├─ Dashboard       ← stat tiles, bar chart, topic bars, pending/recent panels
       ├─ Research        ← new research form + session cards with expand/resume
       ├─ Library         ← folder tree (left) + Markdown viewer (right)
       ├─ Review          ← pending findings + notices/limitations
       ├─ Search          ← debounced live search, results with snippet preview
       ├─ Activity        ← filterable event log table with coloured chips
       ├─ Decisions       ← user filing patterns, removable
       └─ About           ← capabilities list + 3 info cards
```

**Key patterns:**

- `useFetch(path, interval)` — all data fetching. Polls automatically when interval > 0.
- `page-fade` class — CSS `@keyframes fadeIn` on every tab, 180ms fade+slide.
- No state management library — all state is co-located with the component that owns it.
- Dashboard stats come from polling `/api/overview` every 3s. Sessions refresh when `running` drops to 0 (detected by comparing previous vs current value in a `useRef`).

**Why the Search tab was blank:** `Search as SearchIcon` import alias was dropped in a refactor but the component still referenced `SearchIcon`. React threw an error rendering the tab, showing a blank page. Fixed by re-adding the alias.

---

### `frontend/src/styles.css` — All CSS

- CSS custom properties (`--bg`, `--card`, `--ac`, etc.) as design tokens
- `html.dark { ... }` overrides same variables — toggling dark mode costs zero JS
- `color-mix(in srgb, ...)` for dynamic tints — no hardcoded semi-transparent colours
- `@keyframes fadeIn` for tab transitions
- `@keyframes pulse-dot` for running session indicator
- Responsive at 768px — sidebar collapses to horizontal scrollable nav

---

## 4. Data storage — permanent flat files

**Not a database.** Everything is plain files on disk. Survives server restarts. Portable — zip the folder and move it anywhere.

### `state.json` — the single source of truth

Written atomically on every change:
```python
tmp = sf.with_suffix(".tmp")
tmp.write_text(json.dumps(state, indent=2))
tmp.replace(sf)     # atomic rename — no partial writes
```

Full structure:
```json
{
  "sessions": {
    "abc123": {
      "topic":        "AI regulation 2025",
      "instructions": "focus on EU AI Act",
      "rounds":       2,
      "filed":        ["AI Regulation/eu-ai-act.md", "AI Regulation/gpai.md"],
      "summary":      "Round 2: filed 3 findings on EU AI Act and GPAI...",
      "next":         "Continue with US federal AI legislation and state laws",
      "created":      1727000000.0,
      "updated":      1727003600.0
    }
  },
  "pending": [
    {
      "id":      "a1b2c3",
      "session": "abc123",
      "finding": {
        "title":      "US AI Safety Institute mandate",
        "summary":    "The AISI was established under...",
        "sources":    ["https://www.nist.gov/aisi"],
        "folder":     "AI Regulation/US",
        "confidence": 0.55
      },
      "why": "low confidence in placement"
    }
  ],
  "decisions": [
    {
      "title":   "EU AI Act phased application timeline",
      "folder":  "AI Regulation/EU",
      "t":       1727003000.0,
      "session": "abc123"
    }
  ],
  "notices": [
    {
      "id":      "x1y2z3",
      "t":       1727001000.0,
      "kind":    "limitation",
      "msg":     "Could not verify exact enforcement dates — filed with lower confidence",
      "session": "abc123",
      "open":    true
    }
  ]
}
```

### `activity.jsonl` — the audit trail

Append-only. One JSON object per line. Never overwritten.

```jsonl
{"t": 1727000100, "kind": "session", "detail": "created: AI regulation 2025", "session": "abc123"}
{"t": 1727000200, "kind": "round", "detail": "round 1 started", "session": "abc123"}
{"t": 1727000250, "kind": "filed", "detail": "AI Regulation/eu-ai-act.md", "session": "abc123"}
{"t": 1727000300, "kind": "notice:limitation", "detail": "Could not verify...", "session": "abc123"}
{"t": 1727000350, "kind": "progress", "detail": "Continue with US federal AI...", "session": "abc123"}
{"t": 1727000400, "kind": "approved", "detail": "EU AI Act timeline -> AI Regulation/EU", "session": "abc123"}
```

### Each finding `.md` file

```markdown
---
title: EU AI Act phased application timeline (2025-2028)
session: abc123
filed: 2026-10-01 14:30
confidence: 0.85
---

The EU AI Act enters application in phases from August 2025 through 2028.
High-risk AI systems face the strictest requirements...

## Sources
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
- https://artificialintelligenceact.eu/the-act/
```

---

## 5. Notice deduplication

Before this was fixed, a single research session hitting rate limits 8 times would create 8 identical notices, flooding the Review tab.

```python
def notice(self, kind, msg, sid=None):
    msg_prefix = msg[:80]
    for n in self.state["notices"]:
        if (n["open"] and n["kind"] == kind
                and n["session"] == sid
                and n["msg"][:80] == msg_prefix):
            return  # already recorded — skip
    # ... create notice
```

Result: one notice per unique error type per session.

---

## 6. Token efficiency — what was reduced

| Setting | Before | After | Saving |
|---|---|---|---|
| `max_tokens` per request | 4096 | 2048 | ~50% output |
| `MAX_TURNS` per round | 15 | 12 | 20% fewer API calls |
| `temperature` | 0.7 | 0.5 | More focused, less rambling |
| Filed stems in prompt | last 30 | last 10 | ~200 tokens |
| Decisions in prompt | last 25 | last 10 | ~150 tokens |
| Folders in prompt | unlimited | capped at 20 | ~50-200 tokens |
| Instructions in prompt | unlimited | capped at 200 chars | ~50-100 tokens |

**Total saving per round: ~40% fewer tokens.**

---

## 7. Environment variables

| Variable | Required | Description | Where to get |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | Powers the AI model | console.groq.com — free |
| `TAVILY_API_KEY` | Recommended | Live web search | app.tavily.com — 1000/month free |
| `HUB_HOME` | No | Data directory (default: `./research_hub_data`) | — |
| `HUB_MODEL` | No | Groq model (default: `qwen/qwen3.8-27b`) | — |
| `HUB_DEMO` | No | `1` = run without any API key | — |

---

## 8. `.gitignore` — what is excluded and why

```gitignore
# Python bytecode — regenerated automatically, no value in git
__pycache__/
*.py[cod]
.venv/
venv/

# Node — 200MB+ of dependencies, fully described by package.json
node_modules/

# Built output — regenerated by `npm run build`, not source
frontend/dist/

# SECRETS — API keys, never commit
.env

# Research data — your personal library, private, back up separately
# Remove this line if you want to commit your research to git
research_hub_data/

# OS clutter
.DS_Store
Thumbs.db
```

---

## 9. Deployment

### Why Vercel won't work for the full stack

| Requirement | Research Hub needs | Vercel provides |
|---|---|---|
| Long-running processes | 30–60s per research round | 10s function timeout |
| Persistent filesystem | `research_hub_data/` on disk | Ephemeral — wiped on deploy |
| Stateful server | `running` set in memory | Stateless serverless functions |

### Option A — Railway (recommended)

1. Push to GitHub
2. railway.app → New Project → Deploy from GitHub
3. Set env vars: `GROQ_API_KEY`, `TAVILY_API_KEY`, `HUB_HOME=/data`
4. Add a volume at `/data` (so research_hub_data persists across deploys)

Add `Procfile` to project root:
```
web: pip install -r backend/requirements.txt && cd frontend && npm install && npm run build && cd .. && uvicorn backend.api:app --host 0.0.0.0 --port $PORT
```

### Option B — Render (free tier)

Add `render.yaml` to project root:
```yaml
services:
  - type: web
    name: research-hub
    env: python
    buildCommand: pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
    startCommand: uvicorn backend.api:app --host 0.0.0.0 --port $PORT
    disk:
      name: research-data
      mountPath: /data
      sizeGB: 1
    envVars:
      - key: HUB_HOME
        value: /data/research_hub_data
      - key: GROQ_API_KEY
        sync: false
      - key: TAVILY_API_KEY
        sync: false
```

### Option C — Frontend only on Vercel + backend elsewhere

The React UI is just static files after `npm run build`. You can deploy `frontend/dist/` to Vercel and run the Python backend on Railway/Render/any VPS.

The only change needed: in `vite.config.js`, set the API base URL as an env variable so the frontend knows where to find the backend.

```js
// vite.config.js — add this
define: {
  __API_BASE__: JSON.stringify(process.env.VITE_API_URL || "")
}
```

Then in production, set `VITE_API_URL=https://your-backend.railway.app` when building.

### Local development

```bash
# Terminal 1 — backend
python -m uvicorn backend.api:app --port 8000 --reload

# Terminal 2 — frontend (hot reload)
cd frontend && npm run dev
# Opens http://localhost:5173
# /api/* proxied to :8000 via vite.config.js
```

### Production build and run

```bash
# Build frontend once
cd frontend && npm install && npm run build && cd ..

# Run everything from one process
python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000
# Opens http://localhost:8000 (serves built React UI + API)
```
