import { useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";

import { useFetch } from "./api.js";
import useDarkMode from "./hooks/useDarkMode.js";

import Sidebar    from "./components/Sidebar.jsx";
import ClockWidget from "./components/ClockWidget.jsx";
import Dashboard  from "./components/Dashboard.jsx";
import Research   from "./components/Research.jsx";
import Library    from "./components/Library.jsx";
import Review     from "./components/Review.jsx";
import Search     from "./components/Search.jsx";
import Activity   from "./components/Activity.jsx";
import Decisions  from "./components/Decisions.jsx";
import About      from "./components/About.jsx";

import "./styles.css";

export default function App() {
  const [tab,        setTab]        = useState("dashboard");
  const [open,       setOpen]       = useState(null);
  const [collapsed,  setCollapsed]  = useState(() => localStorage.getItem("hub-collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, toggleDark]          = useDarkMode();
  const [ov, reloadOv, ovErr]       = useFetch("/overview", 3000);

  const toggleCollapse = () => setCollapsed(c => {
    localStorage.setItem("hub-collapsed", c ? "0" : "1");
    return !c;
  });

  const navigate = key => { setTab(key); setMobileOpen(false); };
  const openFile = path => { setOpen(path); setTab("library"); setMobileOpen(false); };

  const reviewBadge = ov ? ov.pending + ov.notices : 0;

  return (
    <div className={`app${collapsed ? " collapsed" : ""}`}>
      <Sidebar
        tab={tab}
        navigate={navigate}
        dark={dark}
        toggleDark={toggleDark}
        collapsed={collapsed}
        toggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        reviewBadge={reviewBadge}
      />

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

        {tab === "dashboard" && <div className="page-fade"><Dashboard  ov={ov} setTab={setTab} openFile={openFile} /></div>}
        {tab === "research"  && <div className="page-fade"><Research   ov={ov} refresh={reloadOv} /></div>}
        {tab === "library"   && <div className="page-fade"><Library    open={open} setOpen={setOpen} /></div>}
        {tab === "review"    && <div className="page-fade"><Review     refresh={reloadOv} /></div>}
        {tab === "search"    && <div className="page-fade"><Search     openFile={openFile} /></div>}
        {tab === "activity"  && <div className="page-fade"><Activity   /></div>}
        {tab === "decisions" && <div className="page-fade"><Decisions  /></div>}
        {tab === "about"     && <div className="page-fade"><About      ov={ov} /></div>}
      </main>

      <ClockWidget />
    </div>
  );
}
