import {
  LayoutDashboard, BookOpen, CheckSquare, ScanSearch,
  ClipboardList, Info, Layers, Microscope,
  ChevronLeft, ChevronRight, Sun, Moon, Bell,
} from "lucide-react";
import { Menu } from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard",  Icon: LayoutDashboard },
  { key: "research",  label: "Research",   Icon: Microscope },
  { key: "library",   label: "Library",    Icon: BookOpen },
  { key: "review",    label: "Review",     Icon: CheckSquare },
  { key: "search",    label: "Search",     Icon: ScanSearch },
  { key: "activity",  label: "Activity",   Icon: ClipboardList },
  { key: "decisions", label: "Decisions",  Icon: Layers },
  { key: "about",     label: "About",      Icon: Info },
];

export default function Sidebar({
  tab, navigate, dark, toggleDark,
  collapsed, toggleCollapse,
  mobileOpen, setMobileOpen,
  reviewBadge,
}) {
  return (
    <>
      {/* mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <span className="mobile-brand">Research Hub</span>
        {reviewBadge > 0 && (
          <button
            className="mob-notif-btn"
            onClick={() => navigate("review")}
            aria-label={`${reviewBadge} items need review`}
          >
            <Bell size={17} />
            <span className="mob-notif-dot">{reviewBadge}</span>
          </button>
        )}
        <button
          className="hamburger"
          onClick={toggleDark}
          aria-label="Toggle theme"
          style={{ marginLeft: reviewBadge > 0 ? 0 : "auto" }}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* overlay */}
      {mobileOpen && <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`side${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Microscope size={16} /></div>
          <span className="brand-text">Research Hub</span>
          <button
            className="collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-group-label">Main</div>
          <nav className="nav">
            {NAV.slice(0, 4).map(({ key, label, Icon }) => (
              <button
                key={key}
                className={tab === key ? "on" : ""}
                onClick={() => navigate(key)}
                data-tip={label}
              >
                <span className="nav-icon"><Icon size={15} /></span>
                <span className="nav-label-text">{label}</span>
                {key === "review" && reviewBadge > 0 && (
                  <span className="badge">{reviewBadge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="nav-divider" />
          <div className="nav-group-label">Manage</div>
          <nav className="nav">
            {NAV.slice(4).map(({ key, label, Icon }) => (
              <button
                key={key}
                className={tab === key ? "on" : ""}
                onClick={() => navigate(key)}
                data-tip={label}
              >
                <span className="nav-icon"><Icon size={15} /></span>
                <span className="nav-label-text">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button className="theme-toggle" onClick={toggleDark}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span className="theme-label">{dark ? "Light mode" : "Dark mode"}</span>
        </button>
      </aside>
    </>
  );
}
