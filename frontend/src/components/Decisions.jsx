import { Clock, Folder, Layers, Trash2 } from "lucide-react";
import { api, useFetch, fmt } from "../api.js";

export default function Decisions() {
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
