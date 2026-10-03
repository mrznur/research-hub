import { useState, useEffect } from "react";
import { AlertTriangle, FileText, Folder, FolderOpen, FolderPlus, Trash2 } from "lucide-react";
import { api, useFetch } from "../api.js";
import MarkdownDoc from "./MarkdownDoc.jsx";

function buildTree(folders, files) {
  const root = { kids: {}, files: [] };
  const node = p => p.split("/").reduce(
    (n, part, i, a) => (n.kids[part] ??= { name: part, path: a.slice(0, i + 1).join("/"), kids: {}, files: [] }), root);
  folders.forEach(node);
  files.forEach(f => (f.folder ? node(f.folder) : root).files.push(f));
  return root;
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

export default function Library({ open, setOpen }) {
  const [tree, reloadTree] = useFetch("/tree", 4000);
  const [doc,  setDoc]     = useState(null);
  const [nf,   setNf]      = useState("");
  const [delErr,    setDelErr]    = useState("");
  const [moving,    setMoving]    = useState(false);
  const [moveFolder, setMoveFolder] = useState("");
  const [moveErr,   setMoveErr]   = useState("");

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

  const moveFinding = async () => {
    if (!open || !moveFolder.trim()) return;
    setMoveErr("");
    try {
      const res = await api("/file/move", { body: { path: open, folder: moveFolder } });
      setOpen(res.path); setMoving(false); setMoveFolder(""); reloadTree();
    } catch (e) { setMoveErr(e.message); }
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
          <input
            style={{ fontSize: 12, padding: "5px 8px" }}
            placeholder="New folder…"
            value={nf}
            onChange={e => setNf(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addFolder()}
          />
          <button className="btn sm" onClick={addFolder}><FolderPlus size={13} /></button>
        </div>
      </div>

      <div className="doc-viewer">
        {doc ? (<>
          <div className="doc-viewer-titlebar">
            <div className="doc-viewer-dots">
              <div className="doc-viewer-dot red" />
              <div className="doc-viewer-dot yellow" />
              <div className="doc-viewer-dot green" />
            </div>
            <span className="doc-viewer-path">{open}</span>
            <div className="doc-viewer-actions">
              <button className="btn sm" onClick={() => { setMoving(m => !m); setMoveErr(""); setMoveFolder(""); }}>
                <FolderOpen size={13} /> Move
              </button>
              <button className="btn sm danger" onClick={deleteFinding}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>

          {moving && (
            <div className="doc-viewer-move">
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>Move to folder</div>
              <div className="form-row">
                <div className="grow">
                  <input
                    list="move-folders"
                    placeholder="Folder name or path…"
                    value={moveFolder}
                    onChange={e => setMoveFolder(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && moveFinding()}
                    autoFocus
                  />
                  <datalist id="move-folders">
                    {tree?.folders?.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
                <button className="btn pri sm" onClick={moveFinding} disabled={!moveFolder.trim()}>
                  <FolderOpen size={13} /> Move here
                </button>
                <button className="btn sm" onClick={() => setMoving(false)}>Cancel</button>
              </div>
              {moveErr && <div className="err" style={{ marginTop: 6 }}><AlertTriangle size={13} /> {moveErr}</div>}
            </div>
          )}

          <div className="doc-viewer-content">
            {delErr && <div className="err" style={{ marginBottom: 12 }}>{delErr}</div>}
            <MarkdownDoc content={doc.content} />
          </div>
        </>) : (
          <div style={{ color: "#555", paddingTop: 60, textAlign: "center" }}>
            <FileText size={32} style={{ marginBottom: 10, opacity: .3 }} />
            <div style={{ fontSize: 13 }}>Select a finding to read it</div>
          </div>
        )}
      </div>
    </div>
  </>);
}
