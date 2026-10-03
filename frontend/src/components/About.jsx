import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

export default function About({ ov }) {
  const raw       = ov?.capabilities || "";
  const lines     = raw.split("\n").filter(l => l.trim());
  const capLines  = lines.filter(l => l.includes(":") && l.trim().match(/^\s+\w/));
  const otherLines = lines.filter(l => !l.includes(":") || !l.trim().match(/^\s+\w/));
  const hasTavily = raw.includes("TAVILY_API_KEY");
  const model     = ov?.capabilities?.includes("gpt-oss") ? "openai/gpt-oss-120b" : "qwen/qwen3.8-27b";

  return (<>
    <div className="page-header"><h1 className="page-title">About</h1></div>
    <div className="grid-2">

      <div className="card">
        <div className="card-header"><span className="card-title">What it can do</span></div>
        {otherLines.slice(0, 1).map((l, i) => (
          <p key={i} style={{ fontStyle: "italic", fontWeight: 700, fontSize: 12, color: "var(--mu)", marginBottom: 10 }}>{l.trim()}</p>
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
              <span style={{ fontStyle: "italic", fontWeight: 700, fontSize: 13, color: "var(--ac)", minWidth: 80, flexShrink: 0 }}>{kw}</span>
              <span style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.5 }}>{desc}</span>
            </div>
          );
        })}
        {otherLines.slice(1).map((l, i) => (
          <p key={i} style={{ fontSize: 11, color: "var(--mu)", marginTop: 10, lineHeight: 1.6 }}>{l.trim()}</p>
        ))}
      </div>

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

    <div className="card warn" style={{ marginTop: 4 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
        <AlertTriangle size={14} style={{ color: "var(--wa)" }} /> Rate Limit Warning — Groq Free Tier
      </div>
      <div style={{ fontSize: 13, color: "var(--mu)", lineHeight: 1.8 }}>
        <div>Current model: <span style={{ fontStyle: "italic", color: "var(--tx)", fontWeight: 600 }}>{model}</span></div>
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>• <b>Per-minute limit:</b> Groq enforces tokens-per-minute caps. A research round uses ~2,000–4,000 tokens. If you hit 429, the system retries automatically up to 3× with a 20s pause.</div>
          <div>• <b>Daily limit:</b> Free tier has a fixed daily quota. If exhausted, wait until midnight Pacific Time.</div>
          <div>• <b>How to avoid limits:</b> Space out sessions by a few minutes. Use focused instructions to get more per round.</div>
          {!hasTavily && (
            <div style={{ marginTop: 4, color: "var(--dan)" }}>
              • <b>No live web search:</b> <code>TAVILY_API_KEY</code> is not set. Research uses AI training knowledge only.{" "}
              <a href="https://app.tavily.com" target="_blank" rel="noreferrer">Get a free key at app.tavily.com</a>.
            </div>
          )}
        </div>
      </div>
    </div>
  </>);
}
