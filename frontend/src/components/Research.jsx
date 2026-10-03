import { useState, useRef, useEffect } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Loader2, Microscope, Play, RotateCcw } from "lucide-react";
import { api, useFetch, fmt } from "../api.js";

function SessionCard({ s, onDone }) {
  const [ins, setIns]           = useState("");
  const [err, setErr]           = useState("");
  const [expanded, setExpanded] = useState(false);

  const resume = async () => {
    try {
      await api(`/sessions/${s.id}/resume`, { body: { instructions: ins } });
      setIns(""); onDone();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="session-card-header">
        <div className={`session-dot ${s.running ? "running" : "idle"}`} style={{ marginTop: 6 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.topic}</span>
            {s.running
              ? <span className="pill blue"><Loader2 size={10} className="spin-icon" /> Researching</span>
              : <span className="pill gray">Idle</span>}
            {s.filed > 0 && <span className="pill green"><CheckCircle2 size={10} /> {s.filed} filed</span>}
          </div>
          <div className="mu" style={{ marginTop: 3 }}>
            {s.rounds} round{s.rounds !== 1 ? "s" : ""} · updated {fmt(s.updated)} · <code style={{ fontSize: 11 }}>{s.id}</code>
          </div>
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
            <input
              className="grow"
              placeholder="Extra instructions for next round (optional)"
              value={ins}
              onChange={e => setIns(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !s.running && resume()}
            />
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

export default function Research({ ov, refresh }) {
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
      const tzOffset = new Date().getTimezoneOffset();
      await api("/research", { body: { topic, instructions: ins, tz_offset: tzOffset } });
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
        <input
          placeholder="e.g. Solar energy trends 2025"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !busy && start()}
        />
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
    {sessions?.map(s => (
      <SessionCard key={s.id} s={s} onDone={() => { reloadSessions(); refresh(); }} />
    ))}
  </>);
}
