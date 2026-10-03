import { AlertTriangle, CheckSquare, ExternalLink, FileText, Layers, Loader2, Plus, TrendingUp } from "lucide-react";
import { useFetch, fmt } from "../api.js";

function getSnippet(summary, maxLen = 150) {
  if (!summary) return "";
  const text = summary.replace(/\*\*|__|[*_`]/g, "").trim();
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
}

function RecentFindingCard({ f, openFile }) {
  return (
    <div
      onClick={() => openFile(f.path)}
      className="recent-finding-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <FileText size={14} style={{ color: "var(--ac)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4, color: "var(--tx)" }}>{f.title}</div>
      </div>
      {f.summary && (
        <p style={{ fontSize: 12.5, color: "var(--mu)", lineHeight: 1.6, margin: "0 0 8px 24px" }}>
          {getSnippet(f.summary)}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginLeft: 24 }}>
        <span style={{ fontSize: 11, color: "var(--mu)" }}>{f.folder || "Inbox"}</span>
        <span style={{ fontSize: 11, color: "var(--ac)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          Read <ExternalLink size={10} />
        </span>
      </div>
    </div>
  );
}

export default function Dashboard({ ov, setTab, openFile }) {
  const [sessions] = useFetch("/sessions", 3000);
  const [tree]     = useFetch("/tree", 5000);
  const [log]      = useFetch("/log?limit=60", 5000);
  const [pending]  = useFetch("/pending", 4000);
  const [notices]  = useFetch("/notices", 4000);

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
    .map(s => ({ topic: s.topic, filed: s.filed, rounds: s.rounds, id: s.id }))
    .sort((a, b) => b.filed - a.filed).slice(0, 5);
  const maxFiled = Math.max(1, ...topTopics.map(t => t.filed));

  const recentFiles = tree?.files?.slice(-4).reverse() || [];
  const topicColors = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#e11d48"];
  const hasReview = (pending?.length ?? 0) + (notices?.length ?? 0) > 0;

  return (<>
    <div className="page-header">
      <h1 className="page-title">Dashboard</h1>
      <div className="page-actions">
        <button className="btn pri" onClick={() => setTab("research")}>
          <Plus size={14} /> New Research
        </button>
      </div>
    </div>

    {/* Stat cards */}
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: "rgba(10,124,255,.12)", color: "var(--ac)" }}><FileText size={18} /></div>
        </div>
        <div>
          <div className="stat-label">Total Findings</div>
          <div className="stat-value">{ov?.findings ?? "—"}</div>
          <div className="stat-sub">filed in library</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: "rgba(124,58,237,.12)", color: "#7c3aed" }}><Layers size={18} /></div>
        </div>
        <div>
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{ov?.sessions ?? "—"}</div>
          <div className="stat-sub">research sessions</div>
        </div>
      </div>
      <div className={`stat-card ${ov?.running > 0 ? "running" : ""}`}>
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: ov?.running > 0 ? "rgba(10,124,255,.12)" : "rgba(107,114,128,.1)", color: ov?.running > 0 ? "var(--ac)" : "var(--mu)" }}>
            <Loader2 size={18} className={ov?.running > 0 ? "spin-icon" : ""} />
          </div>
        </div>
        <div>
          <div className="stat-label">Active Now</div>
          <div className="stat-value">{ov?.running ?? "—"}</div>
          <div className="stat-sub">running sessions</div>
        </div>
      </div>
      <div className={`stat-card ${hasReview ? "alert" : "ok"}`}>
        <div className="stat-icon-row">
          <div className="stat-icon-wrap" style={{ background: hasReview ? "rgba(220,38,38,.12)" : "rgba(48,209,88,.12)", color: hasReview ? "var(--dan)" : "var(--ok)" }}>
            <CheckSquare size={18} />
          </div>
        </div>
        <div>
          <div className="stat-label">Needs Review</div>
          <div className="stat-value">{ov ? ov.pending + ov.notices : "—"}</div>
          <div className="stat-sub">{ov?.pending ?? 0} pending · {ov?.notices ?? 0} notices</div>
        </div>
      </div>
    </div>

    {/* Charts row */}
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

    {/* Awaiting Review — only shown when there's something */}
    {hasReview && (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Awaiting Review</span>
          <button className="btn sm" onClick={() => setTab("review")}>Review all</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 4 }}>
          {pending?.slice(0, 3).map(p => (
            <div className="notice-row" key={p.id} style={{ borderBottom: 0 }}>
              <div className="notice-icon"><FileText size={14} style={{ color: "var(--wa)" }} /></div>
              <div className="notice-body">
                <div className="notice-msg" style={{ fontWeight: 600, fontSize: 13 }}>{p.finding.title}</div>
                <div className="notice-time"><span className="pill yellow">{p.why}</span></div>
              </div>
            </div>
          ))}
          {notices?.slice(0, 2).map(n => (
            <div className="notice-row" key={n.id} style={{ borderBottom: 0 }}>
              <div className="notice-icon"><AlertTriangle size={14} style={{ color: "var(--wa)" }} /></div>
              <div className="notice-body">
                <div className="notice-msg" style={{ fontSize: 13 }}>{n.msg.slice(0, 90)}{n.msg.length > 90 ? "…" : ""}</div>
                <div className="notice-time">{fmt(n.t)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recent Findings — full width, card grid with snippet */}
    <div className="card">
      <div className="card-header">
        <span className="card-title">Recent Findings</span>
        <button className="btn sm" onClick={() => setTab("library")}>See more →</button>
      </div>
      {recentFiles.length === 0 ? (
        <div className="empty-state" style={{ padding: "20px 0" }}>
          <FileText size={28} /><p>No findings yet — start researching above.</p>
        </div>
      ) : (
        <div className="recent-findings-grid">
          {recentFiles.map(f => (
            <RecentFindingCard key={f.path} f={f} openFile={openFile} />
          ))}
        </div>
      )}
    </div>
  </>);
}
