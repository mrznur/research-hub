import { useState, useEffect, useCallback } from "react";

export async function api(path, opts) {
  const r = await fetch("/api" + path, opts && {
    method: opts.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts.body ?? {}),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

export function useFetch(path, every = 0) {
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

export const fmt = t =>
  new Date(t * 1000).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
