#!/usr/bin/env python3
"""Research Hub: Groq LLM researches topics and files findings into real folders.

Folders live in  <HUB_HOME>/library/   (plain markdown files you can open anywhere)
State/history in <HUB_HOME>/.hub/      (state.json, activity.jsonl)

Requires: no extra packages — uses stdlib urllib only
Set:      GROQ_API_KEY   free key from console.groq.com
          TAVILY_API_KEY free key from app.tavily.com  (optional, enables live web search)
"""
import argparse, json, os, re, sys, time, uuid
from pathlib import Path
from types import SimpleNamespace as NS

MODEL         = os.environ.get("HUB_MODEL", "openai/gpt-oss-120b")
CONFIDENCE_MIN = 0.7
MAX_TURNS     = 12
GROQ_API_URL  = "https://api.groq.com/openai/v1/chat/completions"
TAVILY_URL    = "https://api.tavily.com/search"
# Retry config for 429 rate-limit responses
MAX_RETRIES   = 3
RETRY_DELAY   = 20   # seconds to wait before each retry

# ── Tool definitions (OpenAI function-calling format) ─────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for current, real-world information on a query. "
                "Use this FIRST before filing any finding to get up-to-date facts and sources. "
                "Only available when TAVILY_API_KEY is set."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_folders",
            "description": "List existing folders in the library.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_library",
            "description": "Search previously collected research to avoid duplicates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search terms"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "file_finding",
            "description": (
                "File one research finding into the library. "
                "Prefer an EXISTING folder. Give honest confidence (0-1) that the "
                "folder is right. Low confidence or a new folder holds it for user approval."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title":      {"type": "string"},
                    "summary":    {
                        "type": "string",
                        "description": (
                            "Detailed, informative summary of the finding. "
                            "Write 5-8 sentences covering: what happened or was found, "
                            "key facts, specific numbers/dates/names, why it matters, "
                            "and any important context. Do NOT write just 1-2 sentences."
                        ),
                    },
                    "sources":    {
                        "type": "array", "items": {"type": "string"},
                        "description": "URLs from web_search results — include ALL relevant sources found",
                    },
                    "folder":     {"type": "string", "description": "e.g. Topic/Subtopic"},
                    "confidence": {"type": "number", "description": "0.0 – 1.0"},
                },
                "required": ["title", "summary", "folder", "confidence"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ask_user",
            "description": "Ask the user a clarifying question before continuing.",
            "parameters": {
                "type": "object",
                "properties": {"question": {"type": "string"}},
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "report_limitation",
            "description": "Report anything you could not do or verify.",
            "parameters": {
                "type": "object",
                "properties": {"message": {"type": "string"}},
                "required": ["message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_progress",
            "description": (
                "REQUIRED — call before finishing each round. "
                "Record what was done and the exact next step so research can resume."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "summary":   {"type": "string"},
                    "next_step": {"type": "string"},
                },
                "required": ["summary", "next_step"],
            },
        },
    },
]

CAPABILITIES = """Research Hub can:
  research:    Start researching any topic using live web search (Tavily) + AI reasoning
  resume:      Continue a session from exactly where it previously stopped
  review:      Approve or discard uncertain findings before they are filed
  notices:     See limitations, access problems, and open questions from the AI
  decisions:   View and remove the folder-filing patterns you have taught it
  search:      Full-text search across every finding, session, and activity log
  tree:        Show the complete folder structure of your library
  sessions:    List all research sessions with their status and summaries
  log:         Browse the full activity history, filterable by session
Everything is saved as plain Markdown files under HUB_HOME (default ./research_hub_data).
Set TAVILY_API_KEY (free at app.tavily.com) to enable live web search."""


def DEMO():
    return os.environ.get("HUB_DEMO") == "1"


# ── demo client ───────────────────────────────────────────────────────────────

class DemoClient:
    """HUB_DEMO=1: scripted responses in OpenAI chat format. No real API calls."""

    def __init__(self, topic: str, rnd: int):
        self.topic, self.rnd, self.calls = topic, rnd, 0

    def chat(self, messages: list, **_) -> dict:
        self.calls += 1
        if self.calls > 1:
            return {"choices": [{"message": {"role": "assistant", "content": "Done.", "tool_calls": None}, "finish_reason": "stop"}]}
        t, r = self.topic, self.rnd
        note = "DEMO placeholder – not real research. "
        def tc(name, **args):
            return {"id": f"demo_{name}", "type": "function",
                    "function": {"name": name, "arguments": json.dumps(args)}}
        return {"choices": [{"finish_reason": "tool_calls", "message": {
            "role": "assistant", "content": None, "tool_calls": [
                tc("file_finding", title=f"[DEMO] {t}: overview (round {r})",
                   summary=note + "Auto-filed sample finding.", folder="Inbox", confidence=0.9),
                tc("file_finding", title=f"[DEMO] {t}: key players (round {r})",
                   summary=note + "New-folder sample — waits for your approval.",
                   folder=f"{t}/Key players", confidence=0.9),
                tc("file_finding", title=f"[DEMO] {t}: uncertain item (round {r})",
                   summary=note + "Low-confidence sample.", folder="Inbox", confidence=0.4),
                tc("report_limitation", message="Demo mode: no live research happens."),
                tc("ask_user", question=f"[DEMO] Should round {r+1} focus on recent news or history?"),
                tc("save_progress", summary=f"Demo round {r} complete.",
                   next_step=f"Demo round {r+1}: dig into recent developments."),
            ]}}]}


# ── utilities ─────────────────────────────────────────────────────────────────

def slug(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60] or "untitled"


# ── hub ───────────────────────────────────────────────────────────────────────

class Hub:
    def __init__(self, root=None):
        self.root = Path(root or os.environ.get("HUB_HOME", "research_hub_data"))
        self.lib  = self.root / "library"
        self.meta = self.root / ".hub"
        (self.lib / "Inbox").mkdir(parents=True, exist_ok=True)
        self.meta.mkdir(parents=True, exist_ok=True)
        self.sf    = self.meta / "state.json"
        self.state = json.loads(self.sf.read_text(encoding="utf-8")) if self.sf.exists() else {}
        for k, v in (("sessions", {}), ("pending", []), ("decisions", []), ("notices", [])):
            self.state.setdefault(k, v)

    # ── persistence ───────────────────────────────────────────────────────────

    def save(self):
        tmp = self.sf.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.state, indent=2), encoding="utf-8")
        tmp.replace(self.sf)

    def log(self, kind: str, detail: str, sid: str = None):
        with open(self.meta / "activity.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"t": time.time(), "kind": kind,
                                "detail": detail, "session": sid}) + "\n")

    def notice(self, kind: str, msg: str, sid: str = None):
        # Dedup: skip if an open notice with same kind+session already exists
        # (prevents flooding from repeated 429s in the same session)
        msg_prefix = msg[:80]
        for n in self.state["notices"]:
            if (n["open"] and n["kind"] == kind and n["session"] == sid
                    and n["msg"][:80] == msg_prefix):
                return  # already recorded
        self.state["notices"].append({
            "id": uuid.uuid4().hex[:6], "t": time.time(),
            "kind": kind, "msg": msg, "session": sid, "open": True,
        })
        self.log("notice:" + kind, msg, sid)
        self.save()

    # ── folders ───────────────────────────────────────────────────────────────

    def clean_folder(self, p) -> str:
        parts = [re.sub(r"[^\w\- .]", "", x).strip()
                 for x in str(p).replace("\\", "/").split("/")]
        parts = [x for x in parts if x and x not in (".", "..")]
        return "/".join(parts) or "Inbox"

    def folders(self) -> list[str]:
        return sorted(
            str(d.relative_to(self.lib)).replace("\\", "/")
            for d in self.lib.rglob("*") if d.is_dir()
        )

    def write_finding(self, f: dict, sid: str, folder: str) -> str:
        d = self.lib / folder
        d.mkdir(parents=True, exist_ok=True)
        path, n = d / (slug(f["title"]) + ".md"), 2
        while path.exists():
            path = d / f"{slug(f['title'])}-{n}.md"
            n += 1
        src = "\n".join(f"- {s}" for s in f.get("sources", [])) or "- (none given)"
        path.write_text(
            f"---\ntitle: {f['title']}\nsession: {sid}\n"
            f"filed: {time.strftime('%Y-%m-%d %H:%M')}\n"
            f"confidence: {f.get('confidence', '')}\n---\n\n"
            f"{f['summary']}\n\n## Sources\n{src}\n",
            encoding="utf-8",
        )
        rel = str(path.relative_to(self.lib)).replace("\\", "/")
        if sid in self.state["sessions"]:
            self.state["sessions"][sid]["filed"].append(rel)
        self.log("filed", rel, sid)
        self.save()
        return rel

    # ── tool handlers ─────────────────────────────────────────────────────────

    def call_tool(self, name: str, a: dict, sid: str, interactive: bool = False) -> str:
        if name == "web_search":
            return self._tavily_search(a.get("query", ""), sid)

        if name == "list_folders":
            return json.dumps(self.folders())

        if name == "search_library":
            r = self.search(a.get("query", ""), 6)
            return (
                "\n".join(f"[{x['kind']}] {x['title']} ({x['where']})" for x in r)
                or "No matches."
            )

        if name == "file_finding":
            folder = self.clean_folder(a.get("folder"))
            conf   = float(a.get("confidence") or 0)
            folder_exists = (self.lib / folder).is_dir()
            # Auto-file if: existing folder + conf >= 0.7, OR new folder + conf >= 0.85
            if (folder_exists and conf >= CONFIDENCE_MIN) or \
               (not folder_exists and conf >= 0.85):
                return "Filed at " + self.write_finding(a, sid, folder)
            why = ("needs a new folder"
                   if not folder_exists
                   else "low confidence in placement")
            self.state["pending"].append({
                "id":      uuid.uuid4().hex[:6],
                "session": sid,
                "finding": {**a, "folder": folder},
                "why":     why,
            })
            self.log("held", f"{a.get('title')} ({why})", sid)
            self.save()
            return f"Held for user approval ({why}). Do not retry; continue."

        if name == "ask_user":
            if interactive and sys.stdin.isatty():
                ans = input(f"\nClaude asks: {a['question']}\n> ")
                self.log("answer", f"{a['question']} -> {ans}", sid)
                return ans or "(no answer)"
            self.notice("question", a["question"], sid)
            return "Queued for the user. Continue with your best assumption and say so."

        if name == "report_limitation":
            self.notice("limitation", a["message"], sid)
            return "Recorded."

        if name == "save_progress":
            s = self.state["sessions"][sid]
            s["summary"] = a["summary"]
            s["next"]    = a["next_step"]
            s["updated"] = time.time()
            self.log("progress", a["next_step"], sid)
            self.save()
            return "Saved."

        return "Unknown tool."

    # ── review decisions ──────────────────────────────────────────────────────

    def resolve_pending(self, pid: str, folder) -> str | None:
        """folder=None discards. Records the decision so future runs follow it."""
        item = next((p for p in self.state["pending"] if p["id"] == pid), None)
        if not item:
            return None
        self.state["pending"].remove(item)
        f = item["finding"]
        if folder is None:
            self.log("discarded", f["title"], item["session"])
            self.save()
            return None
        folder = self.clean_folder(folder)
        rel = self.write_finding(f, item["session"], folder)
        self.state["decisions"].append({
            "title":   f["title"],
            "folder":  folder,
            "t":       time.time(),
            "session": item["session"],
        })
        self.log("approved", f"{f['title']} -> {folder}", item["session"])
        self.save()
        return rel

    def review_interactive(self):
        while self.state["pending"]:
            p  = self.state["pending"][0]
            f  = p["finding"]
            fl = self.folders()
            print(f"\n{f['title']}  [{p['why']}]\n{f['summary']}\nSuggested: {f['folder']}")
            for i, x in enumerate(fl, 1):
                print(f"  {i}. {x}")
            c = input(
                "Enter = accept suggestion | number | new/path | d = discard | q = stop\n> "
            ).strip()
            if c == "q":
                return
            if c == "d":
                self.resolve_pending(p["id"], None)
            elif c == "":
                self.resolve_pending(p["id"], f["folder"])
            elif c.isdigit() and 0 < int(c) <= len(fl):
                self.resolve_pending(p["id"], fl[int(c) - 1])
            else:
                self.resolve_pending(p["id"], c)

    # ── search ────────────────────────────────────────────────────────────────

    def search(self, query: str, limit: int = 15) -> list[dict]:
        """Full-text search with partial/substring matching and snippet previews.

        Scoring:
          +3 per term found in title   (exact word or substring)
          +1 per term found in body
        Each result includes a short ``snippet`` of surrounding context.
        """
        raw_terms = re.findall(r"\w+", query.lower())
        if not raw_terms:
            return []

        def _score(title: str, body: str) -> int:
            tl, bl = title.lower(), body.lower()
            s = 0
            for t in raw_terms:
                if t in tl:
                    s += 3
                elif t in bl:
                    s += 1
            return s

        def _snippet(body: str, terms: list[str], length: int = 160) -> str:
            """Return a short excerpt around the first term hit."""
            bl = body.lower()
            best_pos = len(body)
            for t in terms:
                idx = bl.find(t)
                if idx != -1 and idx < best_pos:
                    best_pos = idx
            if best_pos == len(body):
                return body[:length].replace("\n", " ").strip()
            start = max(0, best_pos - 60)
            end   = min(len(body), best_pos + length - 60)
            excerpt = body[start:end].replace("\n", " ").strip()
            return ("…" if start else "") + excerpt + ("…" if end < len(body) else "")

        out: list[dict] = []

        # ── findings (markdown files) ──────────────────────────────────────
        for p in self.lib.rglob("*.md"):
            body = p.read_text(encoding="utf-8", errors="replace")
            m    = re.search(r"^title: (.*)$", body, re.M)
            title = m.group(1) if m else p.stem
            sc = _score(title, body)
            if sc:
                out.append({
                    "kind":    "finding",
                    "title":   title,
                    "where":   str(p.relative_to(self.lib)).replace("\\", "/"),
                    "score":   sc,
                    "snippet": _snippet(body, raw_terms),
                })

        # ── sessions ──────────────────────────────────────────────────────
        for sid, s in self.state["sessions"].items():
            combined = f"{s['topic']} {s.get('summary','')} {s.get('next','')} {s.get('instructions','')}"
            sc = _score(s["topic"], combined)
            if sc:
                out.append({
                    "kind":    "session",
                    "title":   s["topic"],
                    "where":   sid,
                    "score":   sc,
                    "snippet": _snippet(combined, raw_terms),
                })

        # ── activity log ──────────────────────────────────────────────────
        al = self.meta / "activity.jsonl"
        if al.exists():
            for line in al.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                e  = json.loads(line)
                sc = _score(e["kind"], e["detail"])
                if sc:
                    out.append({
                        "kind":    "log",
                        "title":   e["detail"][:80],
                        "where":   time.strftime("%m-%d %H:%M", time.localtime(e["t"])),
                        "score":   sc,
                        "snippet": _snippet(e["detail"], raw_terms),
                    })

        return sorted(out, key=lambda x: -x["score"])[:limit]

    # ── agent ─────────────────────────────────────────────────────────────────

    def _tavily_search(self, query: str, sid: str) -> str:
        """Call Tavily search API. Returns formatted results or a notice if unavailable."""
        import urllib.request, urllib.error
        api_key = os.environ.get("TAVILY_API_KEY", "")
        if not api_key:
            return (
                "Web search unavailable (TAVILY_API_KEY not set). "
                "Use your training knowledge and note the limitation."
            )
        try:
            payload = json.dumps({
                "api_key": api_key, "query": query,
                "max_results": 5, "search_depth": "basic",
                "include_answer": True,
            }).encode("utf-8")
            req = urllib.request.Request(
                TAVILY_URL, data=payload,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.loads(r.read().decode("utf-8"))
            lines = []
            if data.get("answer"):
                lines.append(f"Summary: {data['answer']}")
            for res in data.get("results", []):
                lines.append(f"- {res.get('title','')}: {res.get('url','')} — {res.get('content','')[:200]}")
            return "\n".join(lines) or "No results."
        except urllib.error.HTTPError as e:
            self.notice("access", f"Tavily search error {e.code}: {query}", sid)
            return f"Search failed ({e.code}). Use training knowledge."
        except Exception as e:
            return f"Search unavailable: {e}. Use training knowledge."

    def system_prompt(self, sid: str) -> str:
        """Compact system prompt — keeps token count low on every turn."""
        s      = self.state["sessions"][sid]
        # cap lists tightly to reduce tokens
        filed  = [Path(x).stem for x in s["filed"]][-10:]
        dec    = [f"'{d['title'][:40]}'->{d['folder']}"
                  for d in self.state["decisions"]][-10:]
        folders = self.folders()[:20]          # at most 20 folder names
        instr   = (s["instructions"] or "")[:200]  # truncate long instructions
        has_web = bool(os.environ.get("TAVILY_API_KEY"))
        search_rule = (
            "Use web_search to get current facts before filing each finding."
            if has_web else
            "No live search available — use your training knowledge and note uncertainty."
        )
        return (
            f"You are a research assistant. Topic: {s['topic']}\n"
            f"Instructions: {instr or 'none'}\n"
            f"Round: {s['rounds']} | Resume from: {s.get('next') or 'beginning'}\n"
            f"Already filed (skip these): {filed}\n"
            f"Filing patterns to follow: {dec}\n"
            f"Folders: {folders}\n\n"
            f"{search_rule}\n"
            "Rules: call search_library first. File 3-5 findings with file_finding. "
            "Use existing folders when they fit (confidence >= 0.7). "
            "If no folder fits, propose a clear new folder name with confidence >= 0.85 — it will be created automatically. "
            "Only use confidence < 0.85 for genuinely uncertain placements. "
            "Write DETAILED summaries (5-8 sentences, specific facts, numbers, dates). "
            "Include ALL source URLs found from web_search. "
            "Use report_limitation for anything uncertain. "
            "ALWAYS end by calling save_progress(summary, next_step)."
        )

    def _groq_request(self, api_key: str, messages: list) -> dict:
        """POST to Groq with automatic retry on 429 rate-limit errors."""
        import httpx
        payload = {
            "model":       MODEL,
            "messages":    messages,
            "tools":       TOOLS,
            "tool_choice": "auto",
            "max_tokens":  2048,
            "temperature": 0.5,
        }
        last_err = None
        for attempt in range(MAX_RETRIES):
            try:
                resp = httpx.post(
                    GROQ_API_URL,
                    json=payload,
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=60,
                )
                if resp.status_code == 429:
                    wait = RETRY_DELAY * (attempt + 1)
                    time.sleep(wait)
                    last_err = f"429 rate limit (waited {wait}s)"
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                last_err = str(e)
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                continue
        raise Exception(f"Groq request failed after {MAX_RETRIES} attempts: {last_err}")

    def run_agent(self, sid: str, interactive: bool = True, client=None):
        """Run one research round using Groq (or DemoClient in demo mode)."""
        s = self.state["sessions"][sid]
        s["rounds"] += 1
        self.log("round", f"round {s['rounds']} started", sid)
        self.save()

        first_msg = "Begin." if s["rounds"] == 1 else "Continue from the saved next step."

        # ── demo mode ──────────────────────────────────────────────────────
        if client is None and DEMO():
            demo = DemoClient(s["topic"], s["rounds"])
            resp = demo.chat([])
            for tc in (resp["choices"][0]["message"].get("tool_calls") or []):
                name = tc["function"]["name"]
                args = json.loads(tc["function"]["arguments"])
                self.call_tool(name, args, sid, interactive)
            if not s.get("next"):
                s["next"] = "Demo round ended; resume to continue."
            s["updated"] = time.time()
            self.save()
            return s

        # ── real Groq API ──────────────────────────────────────────────────
        filed_this_round: list[str] = []
        try:
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                self.notice("access",
                            "GROQ_API_KEY is not set. "
                            "Get a free key at console.groq.com and add it to your .env file.", sid)
                s["updated"] = time.time()
                self.save()
                return s

            messages = [
                {"role": "system",  "content": self.system_prompt(sid)},
                {"role": "user",    "content": first_msg},
            ]

            for _ in range(MAX_TURNS):
                try:
                    resp = self._groq_request(api_key, messages)
                except Exception as he:
                    self.notice("access", f"Groq API error: {he}", sid)
                    break

                choice     = resp["choices"][0]
                message    = choice["message"]
                messages.append(message)

                tool_calls = message.get("tool_calls") or []
                if not tool_calls:
                    break

                for tc in tool_calls:
                    name   = tc["function"]["name"]
                    args   = json.loads(tc["function"]["arguments"])
                    result = self.call_tool(name, args, sid, interactive)
                    if name == "file_finding" and "Filed at" in result:
                        filed_this_round.append(args.get("title", "?"))
                    messages.append({
                        "role":         "tool",
                        "tool_call_id": tc["id"],
                        "content":      result,
                    })
            else:
                self.notice("limitation",
                            "Stopped at the turn limit; run `resume` to continue.", sid)

        except Exception as e:
            self.notice("access",
                        f"Run interrupted: {type(e).__name__}: {e}. "
                        "Progress so far is saved; use `resume`.", sid)

        # ── auto-synthesize save_progress if model skipped it ──────────────
        if not s.get("next") or s["next"].startswith("Round ended without"):
            if filed_this_round:
                s["summary"] = f"Round {s['rounds']}: filed {len(filed_this_round)} finding(s): {', '.join(filed_this_round[:3])}."
                s["next"]    = f"Continue researching '{s['topic']}': expand on filed findings or explore related subtopics."
            else:
                s["next"] = f"Resume '{s['topic']}': no findings were filed this round, try again."
            self.log("progress", s["next"], sid)

        s["updated"] = time.time()
        self.save()
        return s

    def new_session(self, topic: str, instructions: str) -> str:
        sid = uuid.uuid4().hex[:6]
        self.state["sessions"][sid] = {
            "topic":        topic,
            "instructions": instructions,
            "rounds":       0,
            "filed":        [],
            "created":      time.time(),
            "updated":      time.time(),
        }
        self.log("session", f"created: {topic}", sid)
        self.save()
        return sid

    def latest_session(self) -> str | None:
        ss = self.state["sessions"]
        return max(ss, key=lambda k: ss[k]["updated"]) if ss else None


# ── CLI helpers ───────────────────────────────────────────────────────────────

def summarize(h: Hub, sid: str):
    s  = h.state["sessions"][sid]
    op = [n for n in h.state["notices"] if n["open"]]
    print(
        f"\nSession {sid}: {s['topic']} | filed {len(s['filed'])} "
        f"| awaiting you: {len(h.state['pending'])} | open notices: {len(op)}"
    )
    print("Next step:", s.get("next"))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="hub", description="Research Hub")
    sp = ap.add_subparsers(dest="cmd", required=True)

    r  = sp.add_parser("research")
    r.add_argument("topic")
    r.add_argument("-i", "--instructions", default="")

    rs = sp.add_parser("resume")
    rs.add_argument("session", nargs="?")
    rs.add_argument("-i", "--instructions", default="")

    se = sp.add_parser("search")
    se.add_argument("query")

    nt = sp.add_parser("notices")
    nt.add_argument("--clear", action="store_true")

    sp.add_parser("review")
    sp.add_parser("tree")
    sp.add_parser("sessions")
    sp.add_parser("log")
    sp.add_parser("decisions")
    sp.add_parser("capabilities")

    a = ap.parse_args(argv)
    h = Hub()

    if a.cmd in ("research", "resume"):
        if a.cmd == "research":
            sid = h.new_session(a.topic, a.instructions)
        else:
            sid = a.session or h.latest_session()
            if not sid or sid not in h.state["sessions"]:
                return print("No such session. Try `sessions`.")
            if a.instructions:
                h.state["sessions"][sid]["instructions"] += "\n" + a.instructions
        h.run_agent(sid, interactive=sys.stdin.isatty())
        summarize(h, sid)
        if (h.state["pending"]
                and sys.stdin.isatty()
                and input("Review held findings now? [y/N] ").lower() == "y"):
            h.review_interactive()

    elif a.cmd == "review":
        h.review_interactive() if h.state["pending"] else print("Nothing waiting.")

    elif a.cmd == "search":
        for x in h.search(a.query):
            print(f"[{x['kind']}] {x['title']}  ({x['where']})")
            if x.get("snippet"):
                print(f"    {x['snippet']}")

    elif a.cmd == "notices":
        for n in h.state["notices"]:
            if n["open"]:
                print(f"{n['id']} [{n['kind']}] {n['msg']}")
        if a.clear:
            for n in h.state["notices"]:
                n["open"] = False
            h.save()

    elif a.cmd == "decisions":
        dec = h.state.get("decisions", [])
        if not dec:
            print("No filing decisions recorded yet.")
        for i, d in enumerate(dec):
            print(f"{i:3}  '{d['title']}'  ->  {d['folder']}")

    elif a.cmd == "tree":
        for f in h.folders():
            print("  " * f.count("/") + f.split("/")[-1] + "/")

    elif a.cmd == "sessions":
        for k, s in h.state["sessions"].items():
            print(
                f"{k}  {s['topic']}  rounds={s['rounds']} "
                f"filed={len(s['filed'])}  next: {s.get('next', '-')}"
            )

    elif a.cmd == "log":
        p = h.meta / "activity.jsonl"
        for line in (p.read_text(encoding="utf-8").splitlines() if p.exists() else []):
            if not line.strip():
                continue
            e = json.loads(line)
            print(time.strftime("%m-%d %H:%M", time.localtime(e["t"])),
                  e["kind"], e["detail"])

    else:  # capabilities
        print(CAPABILITIES)


if __name__ == "__main__":
    main()
