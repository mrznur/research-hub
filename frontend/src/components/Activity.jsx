import { useState } from "react";
import { useFetch, fmt } from "../api.js";

export default function Activity() {
  const [filter,   setFilter] = useState("");
  const [sessions]            = useFetch("/sessions");
  const [log]                 = useFetch(
    "/log?limit=200" + (filter ? "&session=" + encodeURIComponent(filter) : ""),
    4000,
  );

  const chipClass = k => {
    if (k.includes("filed") || k.includes("approved")) return "log-kind-chip filed";
    if (k.includes("notice"))  return "log-kind-chip notice";
    if (k.includes("session")) return "log-kind-chip session";
    if (k.includes("progress"))return "log-kind-chip progress";
    if (k.includes("round"))   return "log-kind-chip round";
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
          <tr><th>Time</th><th>Event</th><th>Detail</th><th>Session</th></tr>
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
