import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, HelpCircle, Trash2, X } from "lucide-react";
import { api, useFetch, fmt } from "../api.js";

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

export default function Review({ refresh }) {
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
    {notices?.length > 0 && (
      <div className="card">
        {notices.map(n => (
          <div className="notice-row" key={n.id}>
            <div className="notice-icon">
              {n.kind === "access"   ? <AlertTriangle size={15} style={{ color: "var(--dan)" }} />
              : n.kind === "question" ? <HelpCircle    size={15} style={{ color: "var(--ac)" }} />
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
    )}
  </>);
}
