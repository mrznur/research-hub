import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon } from "lucide-react";
import { api } from "../api.js";

export default function Search({ openFile }) {
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
      <input
        autoFocus
        placeholder="Search findings, sessions, and history…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
    </div>
    {q && res.length === 0 && <p className="empty">No matches for "{q}"</p>}
    {res.map((r, i) => (
      <div
        className="card search-result"
        key={i}
        style={{ cursor: r.kind === "finding" ? "pointer" : "default", marginBottom: 8 }}
        onClick={() => r.kind === "finding" && openFile(r.where)}
      >
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
