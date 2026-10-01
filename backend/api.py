"""HTTP API for Research Hub.

Run from the project root:
    uvicorn backend.api:app --port 8000

Or from inside backend/:
    uvicorn api:app --port 8000

Serves the built React app from frontend/dist when present.
"""
# Load .env from the project root before anything else
import os
from pathlib import Path
_env_file = Path(__file__).parent.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())
import json, logging, re, threading, time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from hub import Hub, CAPABILITIES, DEMO          # when run from inside backend/
except ModuleNotFoundError:
    from backend.hub import Hub, CAPABILITIES, DEMO  # when run as backend.api from root

log = logging.getLogger("hub.api")
hub = Hub()
running: set[str] = set()
app = FastAPI(title="Research Hub")

# ── startup check ─────────────────────────────────────────────────────────────
# api.py lives in  backend/
# frontend/dist is at  <project_root>/frontend/dist
# so we go two levels up from __file__: backend/ -> project root
DIST = Path(__file__).parent.parent / "frontend" / "dist"
_dist_missing_warned = False
if not DIST.exists():
    log.warning(
        "frontend/dist not found. The React UI will not be served. "
        "Build it with:  cd frontend && npm install && npm run build"
    )
    _dist_missing_warned = True


# ── request / response models ─────────────────────────────────────────────────
class ResearchIn(BaseModel):
    topic: str
    instructions: str = ""


class ResumeIn(BaseModel):
    instructions: str = ""


class ResolveIn(BaseModel):
    folder: Optional[str] = None   # null = discard


class FolderIn(BaseModel):
    path: str


# ── internal helpers ──────────────────────────────────────────────────────────
def _start(sid: str):
    """Kick off a research round in a background thread."""
    if sid in running:
        raise HTTPException(409, "This session is already running")
    running.add(sid)

    def work():
        try:
            hub.run_agent(sid, interactive=False)
        except Exception as e:
            hub.notice("access",
                       f"Could not start research: {type(e).__name__}: {e}", sid)
        finally:
            running.discard(sid)

    threading.Thread(target=work, daemon=True).start()


def _session(sid: str, s: dict) -> dict:
    return {
        "id":           sid,
        "topic":        s["topic"],
        "instructions": s["instructions"],
        "rounds":       s["rounds"],
        "filed":        len(s["filed"]),
        "summary":      s.get("summary", ""),
        "next":         s.get("next", ""),
        "updated":      s["updated"],
        "running":      sid in running,
    }


# ── overview ──────────────────────────────────────────────────────────────────
@app.get("/api/overview")
def overview():
    st = hub.state
    return {
        "pending":      len(st["pending"]),
        "notices":      sum(n["open"] for n in st["notices"]),
        "sessions":     len(st["sessions"]),
        "running":      len(running),
        "findings":     sum(1 for _ in hub.lib.rglob("*.md")),
        "demo":         DEMO(),
        "capabilities": CAPABILITIES,
        "dist_missing": _dist_missing_warned,
    }


# ── sessions ──────────────────────────────────────────────────────────────────
@app.get("/api/sessions")
def sessions():
    out = [_session(k, v) for k, v in hub.state["sessions"].items()]
    return sorted(out, key=lambda x: -x["updated"])


@app.post("/api/research")
def research(b: ResearchIn):
    if not b.topic.strip():
        raise HTTPException(422, "Topic is required")
    sid = hub.new_session(b.topic.strip(), b.instructions.strip())
    _start(sid)
    return {"id": sid}


@app.post("/api/sessions/{sid}/resume")
def resume(sid: str, b: ResumeIn):
    s = hub.state["sessions"].get(sid)
    if not s:
        raise HTTPException(404, "No such session")
    if b.instructions.strip():
        s["instructions"] += "\n" + b.instructions.strip()
        hub.save()
    _start(sid)
    return {"id": sid}


@app.get("/api/sessions/{sid}")
def get_session(sid: str):
    s = hub.state["sessions"].get(sid)
    if not s:
        raise HTTPException(404, "No such session")
    return _session(sid, s)


# ── library tree ──────────────────────────────────────────────────────────────
@app.get("/api/tree")
def tree():
    files = []
    for p in sorted(hub.lib.rglob("*.md")):
        body = p.read_text(encoding="utf-8", errors="replace")
        t    = re.search(r"^title: (.*)$", body, re.M)
        rel  = p.relative_to(hub.lib)
        files.append({
            "path":   str(rel).replace("\\", "/"),
            "folder": str(rel.parent).replace("\\", "/") if str(rel.parent) != "." else "",
            "title":  t.group(1) if t else p.stem,
        })
    return {"folders": hub.folders(), "files": files}


@app.get("/api/file")
def read_file(path: str):
    p = (hub.lib / path).resolve()
    if hub.lib.resolve() not in p.parents or p.suffix != ".md" or not p.is_file():
        raise HTTPException(404, "Not found")
    return {"path": path, "content": p.read_text(encoding="utf-8", errors="replace")}


@app.delete("/api/file")
def delete_file(path: str):
    """Delete a single finding from the library."""
    p = (hub.lib / path).resolve()
    if hub.lib.resolve() not in p.parents or p.suffix != ".md" or not p.is_file():
        raise HTTPException(404, "Not found")
    p.unlink()
    for s in hub.state["sessions"].values():
        rel = path.replace("\\", "/")
        if rel in s["filed"]:
            s["filed"].remove(rel)
    hub.log("deleted", path)
    hub.save()
    return {"ok": True}


@app.post("/api/folders")
def make_folder(b: FolderIn):
    f = hub.clean_folder(b.path)
    (hub.lib / f).mkdir(parents=True, exist_ok=True)
    hub.log("folder", "created " + f)
    return {"path": f}


# ── pending review ────────────────────────────────────────────────────────────
@app.get("/api/pending")
def pending():
    return hub.state["pending"]


@app.post("/api/pending/{pid}/resolve")
def resolve(pid: str, b: ResolveIn):
    if not any(p["id"] == pid for p in hub.state["pending"]):
        raise HTTPException(404, "Not found")
    return {"filed": hub.resolve_pending(pid, b.folder)}


# ── notices ───────────────────────────────────────────────────────────────────
@app.get("/api/notices")
def notices():
    return [n for n in hub.state["notices"] if n["open"]][::-1]


@app.post("/api/notices/{nid}/dismiss")
def dismiss(nid: str):
    for n in hub.state["notices"]:
        if n["id"] == nid:
            n["open"] = False
    hub.save()
    return {"ok": True}


# ── filing decisions (user-taught patterns) ───────────────────────────────────
@app.get("/api/decisions")
def decisions():
    """Return past user filing decisions so the UI can display them."""
    return list(reversed(hub.state.get("decisions", [])))


@app.delete("/api/decisions/{idx}")
def delete_decision(idx: int):
    """Remove a decision by index so the user can correct a bad pattern."""
    d = hub.state.get("decisions", [])
    if idx < 0 or idx >= len(d):
        raise HTTPException(404, "No such decision")
    removed = d.pop(idx)
    hub.log("decision_removed", removed.get("title", "?"))
    hub.save()
    return {"ok": True, "removed": removed}


# ── search ────────────────────────────────────────────────────────────────────
@app.get("/api/search")
def search(q: str = ""):
    return hub.search(q, 40)


# ── activity log ──────────────────────────────────────────────────────────────
@app.get("/api/log")
def log_entries(limit: int = 200, session: str = ""):
    """Return recent activity log entries, optionally filtered by session id."""
    p = hub.meta / "activity.jsonl"
    if not p.exists():
        return []
    rows = [json.loads(x) for x in p.read_text().splitlines() if x.strip()]
    if session:
        rows = [r for r in rows if r.get("session") == session]
    return rows[-limit:][::-1]


# ── SPA static files ──────────────────────────────────────────────────────────
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full:path}")
    def spa(full: str):
        return FileResponse(DIST / "index.html")
else:
    @app.get("/")
    def no_ui():
        return JSONResponse(
            {"error": "React UI not built",
             "fix": "cd frontend && npm install && npm run build"},
            status_code=503,
        )
