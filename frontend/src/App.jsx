import { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard, BookOpen, CheckSquare, ScanSearch,
  ClipboardList, FolderOpen, Info, Bell, AlertTriangle, HelpCircle,
  Play, RotateCcw, Trash2, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FileText, Folder, FolderPlus, Loader2, CheckCircle2,
  TrendingUp, Clock, Layers, Microscope, X, ExternalLink,
  Sun, Moon, Search as SearchIcon, Menu,
} from "lucide-react";

// ── API ───────────────────────────────────────────────────────────────────────
async function api(path, opts) {
  const r = await fetch("/api" + path, opts && {
    method: opts.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts.body ?? {}),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

function useFetch(path, every = 0) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState("");
  const load = useCallback(
    () => api(path).then(d => { setData(d); setErr(""); }).catch(e => setErr(e.message)),
    [path],
  );
  useEffect(() => {
    load();
    if (!every) return;
    const t = setInterval(load, every);
    return () => clearInterval(t);
  }, [load, every]);
  return [data, load, err];
}

const fmt = t => new Date(t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Dark mode ─────────────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("hub-dark");
    return saved !== null ? saved === "1" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("hub-dark", dark ? "1" : "0");
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

// ── Clock widget ──────────────────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="clock-widget">
      <Clock size={14} />
      <div>
        <div className="clock-time">{timeStr}</div>
        <div className="clock-date">{dateStr}</div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Dashboard",  Icon: LayoutDashboard },
  { key: "research",  label: "Research",   Icon: Microscope },
  { key: "library",   label: "Library",    Icon: BookOpen },
  { key: "review",    label: "Review",     Icon: CheckSquare },
  { key: "search",    label: "Search",     Icon: ScanSearch },
  { key: "activity",  label: "Activity",   Icon: ClipboardList },
  { key: "decisions", label: "Decisions",  Icon: Layers },
  { key: "about",     label: "About",      Icon: Info },
];

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]   = useState("dashboard");
  const [open, setOpen] = useState(null);
  const [ov, reloadOv, ovErr] = useFetch("/overview", 3000);
  const [dark, toggleDark] = useDarkMode();
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("hub-collapsed") === "1"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => setCollapsed(c => {
    localStorage.setItem("hub-collapsed", c ? "0" : "1");
    return !c;
  });

  // close drawer when a nav item is tapped on mobile
  const navigate = key => { setTab(key); setMobileOpen(false); };

  const reviewBadge = ov ? ov.pending + ov.notices : 0;
  const openFile = p => { setOpen(p); setTab("library"); setMobileOpen(false); };

  return (
    <div className={`app${collapsed ? " collapsed" : ""}`}>
      {/* mobile top bar — only visible on small screens via CSS */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <span className="mobile-brand">Research Hub</span>
        {reviewBadge > 0 && <span className="badge">{reviewBadge}</span>}
        <button className="hamburger" onClick={toggleDark} aria-label="Toggle theme" style={{ marginLeft: "auto" }}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* dim overlay when drawer is open */}
      {mobileOpen && <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`side${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Microscope size={16} /></div>
          <span className="brand-text">Research Hub</span>
          <button className="collapse-btn" onClick={toggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-group-label">Main</div>
          <nav className="nav">
            {NAV.slice(0, 4).map(({ key, label, Icon }) => (
              <button key={key} className={tab === key ? "on" : ""} onClick={() => navigate(key)} data-tip={label}>
                <span className="nav-icon"><Icon size={15} /></span>
                <span className="nav-label-text">{label}</span>
                {key === "review" && reviewBadge > 0 && <span className="badge">{reviewBadge}</span>}
              </button>
            ))}
          </nav>

          <div className="nav-divider" />
          <div className="nav-group-label">Manage</div>
          <nav className="nav">
            {NAV.slice(4).map(({ key, label, Icon }) => (
              <button key={key} className={tab === key ? "on" : ""} onClick={() => navigate(key)} data-tip={label}>
                <span className="nav-icon"><Icon size={15} /></span>
                <span className="nav-label-text">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button className="theme-toggle" onClick={toggleDark}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span className="theme-label">{dark ? "Light mode" : "Dark mode"}</span>
        </button>
      </aside>

      <main>
        {ovErr && (
          <div className="card warn" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <AlertTriangle size={15} /> Can't reach the backend — start with <code>uvicorn backend.api:app --port 8000</code>
          </div>
        )}
        {ov?.demo && (
          <div className="card warn" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <Bell size={15} /> <b>Demo mode</b> — findings are placeholders. Set <code>GROQ_API_KEY</code> for real research.
          </div>
        )}

        {tab === "dashboard"  && <div className="page-fade"><Dashboard  ov={ov} setTab={setTab} openFile={openFile} /></div>}
        {tab === "research"   && <div className="page-fade"><Research   ov={ov} refresh={reloadOv} /></div>}
        {tab === "library"    && <div className="page-fade"><Library    open={open} setOpen={setOpen} /></div>}
        {tab === "review"     && <div className="page-fade"><Review     refresh={reloadOv} /></div>}
        {tab === "search"     && <div className="page-fade"><Search     openFile={openFile} /></div>}
        {tab === "activity"   && <div className="page-fade"><Activity   /></div>}
        {tab === "decisions"  && <div className="page-fade"><Decisions  /></div>}
        {tab === "about"      && <div className="page-fade"><About      ov={ov} /></div>}
      </main>

      {/* always-visible clock */}
      <ClockWidget />
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ ov, setTab, openFile }) {
  const [sessions] = useFetch("/sessions", 3000);
  const [tree]     = useFetch("/tree",     5000);
  const [log]      = useFetch("/log?limit=60", 5000);
  const [pending]  = useFetch("/pending",  4000);
  const [notices]  = useFetch("/notices",  4000);

  const chartData = (() => {
    const days = 10;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      return { label: d.toLocaleDateString([], { month: "short", day: "numeric" }), count: 0 };
    });
    if (log) log.forEach(e => {
      if (e.kind !== "filed") return;
      const label = new Date(e.t * 1000).toLocaleDateString([], { month: "short", day: "numeric" });
      const b = buckets.find(x => x.label === label);
      if (b) b.count++;
    });
    return buckets;
  })();
  const chartMax = Math.max(1, ...chartData.map(b => b.count));

  const topTopics = (sessions || [])
    .map(s => ({ topic: s.topic, filed: s.filed, rounds: s.rounds, id: s.id, running: s.running }))
    .sort((a, b) => b.filed - a.filed).slice(0, 5);
  const maxFiled = Math.max(1, ...topTopics.map(t => t.filed));

  const recentFiles = tree?.files?.slice(-5).reverse() || [];
  const topicColors = ["#2563eb","#16a34a","#d97706","#9333ea","#e11d48"];

  return (<>
    <div className="page-header">
      <h1 className="page-title">Dashboard</h1>
      <div className="page-actions">
        <button className="btn pri" onClick={() => setTab("research")}>
          <Plus size={14} /> New Research
        </button>
      </div>
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: "rgba(37,99,235,.1)", color: "var(--ac)" }}><FileText size={18} /></div>
        </div>
        <div>
          <div className="stat-label">Total Findings</div>
          <div className="stat-value">{ov?.findings ?? "—"}</div>
          <div className="stat-sub">filed in library</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}><Layers size={18} /></div>
        </div>
        <div>
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{ov?.sessions ?? "—"}</div>
          <div className="stat-sub">research sessions</div>
        </div>
      </div>
      <div className={`stat-card ${ov?.running > 0 ? "running" : ""}`}>
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: ov?.running > 0 ? "rgba(37,99,235,.1)" : "rgba(107,114,128,.1)", color: ov?.running > 0 ? "var(--ac)" : "var(--mu)" }}><Loader2 size={18} className={ov?.running > 0 ? "spin-icon" : ""} /></div>
        </div>
        <div>
          <div className="stat-label">Active Now</div>
          <div className="stat-value">{ov?.running ?? "—"}</div>
          <div className="stat-sub">running sessions</div>
        </div>
      </div>
      <div className={`stat-card ${(ov?.pending + ov?.notices) > 0 ? "alert" : "ok"}`}>
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: (ov?.pending + ov?.notices) > 0 ? "rgba(220,38,38,.1)" : "rgba(22,163,74,.1)", color: (ov?.pending + ov?.notices) > 0 ? "var(--dan)" : "var(--ok)" }}><CheckSquare size={18} /></div>
        </div>
        <div>
          <div className="stat-label">Needs Review</div>
          <div className="stat-value">{ov ? ov.pending + ov.notices : "—"}</div>
          <div className="stat-sub">{ov?.pending ?? 0} pending · {ov?.notices ?? 0} notices</div>
        </div>
      </div>
    </div>

    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Filing Activity</span>
          <span className="mu" style={{ fontSize: 12 }}>last 10 days</span>
        </div>
        <div className="chart-wrap">
          {chartData.map((b, i) => (
            <div className="chart-bar-col" key={i} title={`${b.label}: ${b.count} filed`}>
              <div className="chart-bar" style={{ height: `${Math.round((b.count / chartMax) * 88) + 2}px` }} />
              <span className="chart-x">{b.label.split(" ")[1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Research Topics</span>
          <button className="btn sm" onClick={() => setTab("research")}>View all</button>
        </div>
        {topTopics.length === 0 && <p className="empty">No sessions yet.</p>}
        {topTopics.map((t, i) => (
          <div className="topic-row" key={t.id}>
            <div className="topic-icon" style={{ background: topicColors[i] + "18", color: topicColors[i] }}>
              <TrendingUp size={14} />
            </div>
            <div className="topic-info">
              <div className="topic-name" title={t.topic}>{t.topic}</div>
              <div className="topic-meta">{t.rounds} round{t.rounds !== 1 ? "s" : ""} · {t.filed} filed</div>
            </div>
            <div className="topic-bar-wrap">
              <div className="topic-bar-bg">
                <div className="topic-bar-fill" style={{ width: `${Math.round((t.filed / maxFiled) * 100)}%`, background: topicColors[i] }} />
              </div>
              <div className="topic-pct">{t.filed}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Awaiting Review</span>
          {(pending?.length > 0 || notices?.length > 0) && (
            <button className="btn sm" onClick={() => setTab("review")}>Review all</button>
          )}
        </div>
        {(!pending?.length && !notices?.length) && <p className="empty">Nothing needs your attention.</p>}
        {pending?.slice(0, 3).map(p => (
          <div className="notice-row" key={p.id}>
            <div className="notice-icon"><FileText size={15} style={{ color: "var(--wa)" }} /></div>
            <div className="notice-body">
              <div className="notice-msg" style={{ fontWeight: 600 }}>{p.finding.title}</div>
              <div className="notice-time">
                <span className="pill yellow">{p.why}</span>
              </div>
            </div>
          </div>
        ))}
        {notices?.slice(0, 2).map(n => (
          <div className="notice-row" key={n.id}>
            <div className="notice-icon"><AlertTriangle size={15} style={{ color: "var(--wa)" }} /></div>
            <div className="notice-body">
              <div className="notice-msg">{n.msg.slice(0, 100)}{n.msg.length > 100 ? "…" : ""}</div>
              <div className="notice-time">{fmt(n.t)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Findings</span>
          <button className="btn sm" onClick={() => setTab("library")}>Library</button>
        </div>
    {recentFiles.length === 0 && <div className="empty-state" style={{ padding: "20px 0" }}><FileText size={28} /><p>No findings filed yet.</p></div>}
        {recentFiles.map(f => (
          <div className="notice-row" key={f.path} style={{ cursor: "pointer" }} onClick={() => openFile(f.path)}>
            <div className="notice-icon"><FileText size={15} style={{ color: "var(--ac)" }} /></div>
            <div className="notice-body">
              <div className="notice-msg" style={{ fontWeight: 600 }}>{f.title}</div>
              <div className="notice-time">{f.folder || "Inbox"}</div>
            </div>
            <ExternalLink size={12} style={{ color: "var(--mu)", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ── Research ──────────────────────────────────────────────────────────────────
function Research({ ov, refresh }) {
  const [topic, setTopic] = useState("");
  const [ins,   setIns]   = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);
  const [sessions, reloadSessions] = useFetch("/sessions", 2500);
  const prevRunning = useRef(0);

  useEffect(() => {
    if (ov && prevRunning.current > 0 && ov.running === 0) reloadSessions();
    if (ov) prevRunning.current = ov.running;
  }, [ov?.running]);

  const start = async () => {
    if (!topic.trim()) return;
    setBusy(true); setErr("");
    try {
      await api("/research", { body: { topic, instructions: ins } });
      setTopic(""); setIns(""); reloadSessions(); refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (<>
    <div className="page-header"><h1 className="page-title">Research</h1></div>

    <div className="form-card" style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 14 }}>Start new research</div>
      <div className="form-field" style={{ marginBottom: 10 }}>
        <label className="form-label">Topic</label>
        <input placeholder="e.g. Solar energy trends 2025" value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !busy && start()} />
      </div>
      <div className="form-field" style={{ marginBottom: 12 }}>
        <label className="form-label">Instructions <span className="mu">(optional)</span></label>
        <textarea placeholder="Focus, depth, sources to prefer or avoid…" value={ins} onChange={e => setIns(e.target.value)} />
      </div>
      {err && <div className="err" style={{ display: "flex", gap: 6, alignItems: "center" }}><AlertTriangle size={13} /> {err}</div>}
      <button className="btn pri" disabled={busy || !topic.trim()} onClick={start}>
        {busy ? <><Loader2 size={14} className="spin-icon" /> Starting…</> : <><Play size={14} /> Start Research</>}
      </button>
    </div>

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}>Sessions</span>
      <span className="pill gray">{sessions?.length ?? 0} total</span>
    </div>
    {sessions?.length === 0 && (
      <div className="empty-state">
        <Microscope size={40} />
        <p>No sessions yet — start your first research above.</p>
      </div>
    )}
    {sessions?.map(s => <SessionCard key={s.id} s={s} onDone={() => { reloadSessions(); refresh(); }} />)}
  </>);
}

function SessionCard({ s, onDone }) {
  const [ins, setIns]         = useState("");
  const [err, setErr]         = useState("");
  const [expanded, setExpanded] = useState(false);

  const resume = async () => {
    try {
      await api(`/sessions/${s.id}/resume`, { body: { instructions: ins } });
      setIns(""); onDone();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className={`session-dot ${s.running ? "running" : "idle"}`} style={{ marginTop: 6 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.topic}</span>
            {s.running
              ? <span className="pill blue"><Loader2 size={10} className="spin-icon" /> Researching</span>
              : <span className="pill gray">Idle</span>}
            {s.filed > 0 && <span className="pill green"><CheckCircle2 size={10} /> {s.filed} filed</span>}
          </div>
          <div className="mu" style={{ marginTop: 3 }}>{s.rounds} round{s.rounds !== 1 ? "s" : ""} · updated {fmt(s.updated)} · <code style={{ fontSize: 11 }}>{s.id}</code></div>
          {s.summary && <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{s.summary}</div>}
          {s.next && !s.running && <div className="mu" style={{ marginTop: 4, fontStyle: "italic" }}>Next: {s.next}</div>}
        </div>
        <button className="btn sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Hide" : "Resume"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bd)" }}>
          <div className="form-row">
            <input className="grow" placeholder="Extra instructions for next round (optional)"
              value={ins} onChange={e => setIns(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !s.running && resume()} />
            <button className="btn pri sm" disabled={s.running} onClick={resume}>
              <RotateCcw size={13} /> Resume
            </button>
          </div>
          {err && <div className="err" style={{ display: "flex", gap: 6, marginTop: 6 }}><AlertTriangle size={13} /> {err}</div>}
        </div>
      )}
    </div>
  );
}

// ── Library ───────────────────────────────────────────────────────────────────
function buildTree(folders, files) {
  const root = { kids: {}, files: [] };
  const node = p => p.split("/").reduce(
    (n, part, i, a) => (n.kids[part] ??= { name: part, path: a.slice(0, i + 1).join("/"), kids: {}, files: [] }), root);
  folders.forEach(node);
  files.forEach(f => (f.folder ? node(f.folder) : root).files.push(f));
  return root;
}

function Library({ open, setOpen }) {
  const [tree, reloadTree] = useFetch("/tree", 4000);
  const [doc,  setDoc]     = useState(null);
  const [nf,   setNf]      = useState("");
  const [delErr, setDelErr] = useState("");

  useEffect(() => {
    if (open) api("/file?path=" + encodeURIComponent(open)).then(setDoc).catch(() => setDoc(null));
    else setDoc(null);
  }, [open]);

  const root = tree && buildTree(tree.folders, tree.files);

  const addFolder = async () => {
    if (!nf.trim()) return;
    await api("/folders", { body: { path: nf } }); setNf(""); reloadTree();
  };

  const deleteFinding = async () => {
    if (!open || !window.confirm(`Delete "${open}"?`)) return;
    try {
      await api("/file?path=" + encodeURIComponent(open), { method: "DELETE", body: undefined });
      setOpen(null); setDoc(null); reloadTree();
    } catch (e) { setDelErr(e.message); }
  };

  return (<>
    <div className="page-header">
      <h1 className="page-title">Library</h1>
      <span className="pill gray">{tree?.files?.length ?? 0} findings</span>
    </div>
    <div className="lib-layout">
      <div className="tree-card tree">
        {root && <TreeNode n={root} open={open} setOpen={setOpen} top />}
        <div style={{ marginTop: 12, display: "flex", gap: 6, borderTop: "1px solid var(--bd)", paddingTop: 10 }}>
          <input style={{ fontSize: 12, padding: "5px 8px" }} placeholder="New folder…"
            value={nf} onChange={e => setNf(e.target.value)} onKeyDown={e => e.key === "Enter" && addFolder()} />
          <button className="btn sm" onClick={addFolder}><FolderPlus size={13} /></button>
        </div>
      </div>

      <div className="doc-viewer">
        {doc ? (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "var(--mu)" }}>{open}</span>
            <button className="btn sm danger" onClick={deleteFinding}><Trash2 size={13} /> Delete</button>
          </div>
          {delErr && <div className="err">{delErr}</div>}
          <pre className="doc">{doc.content}</pre>
        </>) : (
          <div style={{ color: "var(--mu)", paddingTop: 40, textAlign: "center" }}>
            <FileText size={32} style={{ marginBottom: 10, opacity: .3 }} />
            <div>Select a finding to read it</div>
          </div>
        )}
      </div>
    </div>
  </>);
}

function TreeNode({ n, open, setOpen, top }) {
  const [exp, setExp] = useState(true);
  const body = (<>
    {Object.values(n.kids).sort((a, b) => a.name.localeCompare(b.name)).map(k =>
      <TreeNode key={k.path} n={k} open={open} setOpen={setOpen} />)}
    {n.files.map(f => (
      <div key={f.path} className={"file" + (open === f.path ? " on" : "")} onClick={() => setOpen(f.path)}>
        <FileText size={12} style={{ flexShrink: 0 }} /> {f.title}
      </div>
    ))}
  </>);
  if (top) return body;
  return (
    <div>
      <div className="f" onClick={() => setExp(!exp)}>
        {exp ? <FolderOpen size={13} /> : <Folder size={13} />} {n.name}
      </div>
      {exp && <div className="k">{body}</div>}
    </div>
  );
}

// ── Review ────────────────────────────────────────────────────────────────────
function Review({ refresh }) {
  const [pending, rp] = useFetch("/pending", 3000);
  const [notices, rn] = useFetch("/notices", 3000);
  const [tree]        = useFetch("/tree");
  const act = async fn => { await fn(); rp(); rn(); refresh(); };

  return (<>
    <div className="page-header">
      <h1 className="page-title">Review</h1>
      {(pending?.length > 0 || notices?.length > 0) && (
        <span className="pill red">{(pending?.length ?? 0) + (notices?.length ?? 0)} items need attention</span>
      )}
    </div>

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontWeight: 600 }}>Uncertain Findings</span>
      <span className="pill gray">{pending?.length ?? 0}</span>
    </div>
    {pending?.length === 0 && (
      <div className="empty-state" style={{ padding: "24px 0" }}>
        <CheckCircle2 size={36} />
        <p>Nothing waiting. Uncertain findings appear here.</p>
      </div>
    )}
    {pending?.map(p => (
      <PendingCard key={p.id} p={p} folders={tree?.folders || []}
        onResolve={f => act(() => api(`/pending/${p.id}/resolve`, { body: { folder: f } }))} />
    ))}

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 10px" }}>
      <span style={{ fontWeight: 600 }}>Limitations &amp; Questions</span>
      <span className="pill gray">{notices?.length ?? 0}</span>
    </div>
    {notices?.length === 0 && <p className="empty">No open notices.</p>}
    <div className="card">
      {notices?.map(n => (
        <div className="notice-row" key={n.id}>
          <div className="notice-icon">
            {n.kind === "access" ? <AlertTriangle size={15} style={{ color: "var(--dan)" }} />
              : n.kind === "question" ? <HelpCircle size={15} style={{ color: "var(--ac)" }} />
              : <Bell size={15} style={{ color: "var(--wa)" }} />}
          </div>
          <div className="notice-body">
            <div className="notice-msg">{n.msg}</div>
            <div className="notice-time">{fmt(n.t)} · <span className="pill gray">{n.kind}</span></div>
          </div>
          <button className="btn sm" onClick={() => act(() => api(`/notices/${n.id}/dismiss`, { body: {} }))}>
            <X size={13} /> Dismiss
          </button>
        </div>
      ))}
    </div>
  </>);
}

function PendingCard({ p, folders, onResolve }) {
  const [folder, setFolder] = useState(p.finding.folder);
  const f = p.finding;
  return (
    <div className="card pending-card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</span>
        <span className="pill yellow">{p.why}</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--mu)", margin: "0 0 8px", lineHeight: 1.6 }}>{f.summary}</p>
      {(f.sources || []).map(s => (
        <div key={s} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <ExternalLink size={11} style={{ color: "var(--mu)" }} />
          <a href={s} target="_blank" rel="noreferrer">{s}</a>
        </div>
      ))}
      <div className="form-row" style={{ marginTop: 10 }}>
        <div className="grow">
          <input list={"fl" + p.id} value={folder} onChange={e => setFolder(e.target.value)} placeholder="Folder path" />
          <datalist id={"fl" + p.id}>{folders.map(x => <option key={x} value={x} />)}</datalist>
        </div>
        <button className="btn pri sm" onClick={() => onResolve(folder)}><CheckCircle2 size={13} /> File here</button>
        <button className="btn sm" onClick={() => onResolve(null)}><Trash2 size={13} /> Discard</button>
      </div>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function Search({ openFile }) {
  const [q,   setQ]   = useState("");
  const [res, setRes] = useState([]);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(() => {
      if (!q.trim()) return setRes([]);
      api("/search?q=" + encodeURIComponent(q)).then(r => id === seq.current && setRes(r));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const kindPill = k => k === "finding" ? "blue" : k === "session" ? "green" : "gray";

  return (<>
    <div className="page-header"><h1 className="page-title">Search</h1></div>
    <div className="search-input-wrap">
      <span className="search-icon"><SearchIcon size={14} /></span>
      <input autoFocus placeholder="Search findings, sessions, and history…" value={q} onChange={e => setQ(e.target.value)} />
    </div>
    {q && res.length === 0 && <p className="empty">No matches for "{q}"</p>}
    {res.map((r, i) => (
      <div className="card search-result" key={i}
        style={{ cursor: r.kind === "finding" ? "pointer" : "default", marginBottom: 8 }}
        onClick={() => r.kind === "finding" && openFile(r.where)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className={`pill ${kindPill(r.kind)}`}>{r.kind}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
        </div>
        <div className="mu">{r.where}</div>
        {r.snippet && <div className="snippet">{r.snippet}</div>}
      </div>
    ))}
  </>);
}

// ── Activity ──────────────────────────────────────────────────────────────────
function Activity() {
  const [filter,   setFilter] = useState("");
  const [sessions]            = useFetch("/sessions");
  const [log]                 = useFetch("/log?limit=200" + (filter ? "&session=" + encodeURIComponent(filter) : ""), 4000);

  const chipClass = k => {
    if (k.includes("filed") || k.includes("approved")) return "log-kind-chip filed";
    if (k.includes("notice")) return "log-kind-chip notice";
    if (k.includes("session")) return "log-kind-chip session";
    if (k.includes("progress")) return "log-kind-chip progress";
    if (k.includes("round")) return "log-kind-chip round";
    return "log-kind-chip";
  };

  return (<>
    <div className="page-header"><h1 className="page-title">Activity Log</h1></div>
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label className="form-label" style={{ whiteSpace: "nowrap" }}>Filter by session:</label>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">All sessions</option>
          {sessions?.map(s => <option key={s.id} value={s.id}>{s.topic} ({s.id})</option>)}
        </select>
      </div>
    </div>
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th><th>Event</th><th>Detail</th><th>Session</th>
          </tr>
        </thead>
        <tbody>
          {log?.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--mu)", padding: 24 }}>No activity yet.</td></tr>
          )}
          {log?.map((e, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: "nowrap", color: "var(--mu)" }}>{fmt(e.t)}</td>
              <td><span className={chipClass(e.kind)}>{e.kind}</span></td>
              <td>{e.detail}</td>
              <td style={{ color: "var(--mu)", fontFamily: "monospace", fontSize: 11 }}>{e.session || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>);
}

// ── Decisions ─────────────────────────────────────────────────────────────────
function Decisions() {
  const [decisions, reload] = useFetch("/decisions", 5000);
  const remove = async idx => {
    if (!window.confirm("Remove this filing pattern?")) return;
    await api(`/decisions/${idx}`, { method: "DELETE", body: undefined });
    reload();
  };

  return (<>
    <div className="page-header">
      <h1 className="page-title">Filing Decisions</h1>
      <span className="pill gray">{decisions?.length ?? 0} patterns</span>
    </div>
    <div className="card info" style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, margin: 0 }}>
        These are the folder choices you've made when reviewing uncertain findings.
        The AI uses them to automatically file similar findings in future sessions.
      </p>
    </div>
    {decisions?.length === 0 && (
      <div className="empty-state">
        <Layers size={36} />
        <p>No decisions yet. Review uncertain findings to build your patterns.</p>
      </div>
    )}
    {decisions?.map((d, i) => (
      <div className="card decision-card" key={i} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</span>
          <button className="btn sm danger" onClick={() => remove(i)}><Trash2 size={13} /> Remove</button>
        </div>
        <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill green"><Folder size={11} /> {d.folder}</span>
          {d.t && <span className="mu" style={{ display: "flex", gap: 4 }}><Clock size={11} /> {fmt(d.t)}</span>}
        </div>
      </div>
    ))}
  </>);
}

// ── About ─────────────────────────────────────────────────────────────────────
function About({ ov }) {
  const raw  = ov?.capabilities || "";
  const lines = raw.split("\n").filter(l => l.trim());

  // separate header/footer lines from keyword: description lines
  const capLines  = lines.filter(l => l.includes(":") && l.trim().match(/^\s+\w/));
  const otherLines = lines.filter(l => !l.includes(":") || !l.trim().match(/^\s+\w/));

  const hasTavily = raw.includes("TAVILY_API_KEY");
  const model     = ov?.capabilities?.includes("gpt-oss") ? "openai/gpt-oss-120b" : "qwen/qwen3.8-27b";

  return (<>
    <div className="page-header"><h1 className="page-title">About</h1></div>
    <div className="grid-2">

      {/* capabilities card */}
      <div className="card">
        <div className="card-header"><span className="card-title">What it can do</span></div>
        {otherLines.slice(0,1).map((l,i) => (
          <p key={i} style={{ fontSize: 12, color: "var(--mu)", marginBottom: 10 }}>{l.trim()}</p>
        ))}
        {capLines.map((l, i) => {
          const colonIdx = l.indexOf(":");
          const kw   = l.slice(0, colonIdx).trim();
          const desc = l.slice(colonIdx + 1).trim();
          return (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "7px 0",
              borderBottom: i < capLines.length - 1 ? "1px solid var(--bd)" : "none",
              alignItems: "flex-start",
            }}>
              <span style={{
                fontStyle: "italic", fontWeight: 600, fontSize: 13,
                color: "var(--ac)", minWidth: 80, flexShrink: 0,
              }}>{kw}</span>
              <span style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.5 }}>{desc}</span>
            </div>
          );
        })}
        {otherLines.slice(1).map((l,i) => (
          <p key={i} style={{ fontSize: 11, color: "var(--mu)", marginTop: 10, lineHeight: 1.6 }}>{l.trim()}</p>
        ))}
      </div>

      {/* info cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card ok">
          <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Auto-filing
          </div>
          <p style={{ fontSize: 13, color: "var(--mu)", margin: 0 }}>
            Findings in existing folders with confidence ≥ 0.7 are filed automatically. Everything else waits for your approval.
          </p>
        </div>
        <div className="card warn">
          <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertTriangle size={14} style={{ color: "var(--wa)" }} /> Your approval matters
          </div>
          <p style={{ fontSize: 13, color: "var(--mu)", margin: 0 }}>
            New folders or low-confidence placements always ask first. Your decisions teach the AI your filing preferences.
          </p>
        </div>
        <div className="card info">
          <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <RotateCcw size={14} style={{ color: "var(--ac)" }} /> Resume any time
          </div>
          <p style={{ fontSize: 13, color: "var(--mu)", margin: 0 }}>
            Every session saves its exact stopping point. Resume with extra instructions whenever you want to go deeper.
          </p>
        </div>
      </div>
    </div>

    {/* rate limit warning */}
    <div className="card warn" style={{ marginTop: 4 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
        <AlertTriangle size={14} style={{ color: "var(--wa)" }} /> Rate Limit Warning — Groq Free Tier
      </div>
      <div style={{ fontSize: 13, color: "var(--mu)", lineHeight: 1.8 }}>
        <div>Current model: <span style={{ fontStyle: "italic", color: "var(--tx)", fontWeight: 600 }}>{model}</span></div>
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>• <b>Per-minute limit:</b> Groq enforces tokens-per-minute (TPM) caps. A research round uses ~2,000–4,000 tokens. If you hit 429, the system retries automatically up to 3× with a 20s pause between each attempt.</div>
          <div>• <b>Daily limit:</b> Free tier allows a fixed number of requests per day. If you exhaust it, wait until midnight Pacific Time for the quota to reset.</div>
          <div>• <b>How to avoid limits:</b> Space out research sessions by a few minutes. Use focused instructions to get more findings per round rather than running multiple short rounds.</div>
          {!hasTavily && (
            <div style={{ marginTop: 4, color: "var(--dan)" }}>• <b>No live web search:</b> <code>TAVILY_API_KEY</code> is not set. Research uses AI training knowledge only — no current sources or URLs. Add a free key from <a href="https://app.tavily.com" target="_blank" rel="noreferrer">app.tavily.com</a>.</div>
          )}
        </div>
      </div>
    </div>
  </>);
}
