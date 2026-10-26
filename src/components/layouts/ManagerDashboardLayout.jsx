import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui";
import NotificationBell from "../notifications/NotificationBell";
import {
  FiGrid,
  FiHome,
  FiUsers,
  FiInbox,
  FiKey,
  FiFileText,
  FiDollarSign,
  FiMessageSquare,
  FiTool,
  FiLogOut,
  FiMenu,
  FiX,
  FiSettings,
  FiClipboard,
  FiActivity,
  FiRadio,
  FiCalendar,
  FiBarChart2,
  FiSidebar,
  FiChevronsLeft,
  FiShield,
  FiLink,
} from "react-icons/fi";

const COLLAPSE_KEY = "rr_manager_nav_collapsed";

/** Day-to-day mediation desk (property_manager) */
const opsLinks = [
  { to: "/manager", label: "Overview", icon: FiGrid, end: true },
  { to: "/manager/owners", label: "Owners", icon: FiUsers },
  { to: "/manager/properties", label: "Properties", icon: FiHome },
  { to: "/manager/inventory", label: "Rooms & Beds", icon: FiKey },
  { to: "/manager/share-links", label: "Share links", icon: FiLink },
  { to: "/manager/applicants", label: "Applicants", icon: FiInbox },
  { to: "/manager/allocations", label: "Allocation", icon: FiClipboard },
  { to: "/manager/contracts", label: "Contracts", icon: FiFileText },
  { to: "/manager/rent", label: "Rent", icon: FiDollarSign },
  { to: "/manager/messages", label: "Messages", icon: FiMessageSquare },
  { to: "/manager/whatsapp", label: "WhatsApp", icon: FiRadio },
  { to: "/manager/maintenance", label: "Maintenance", icon: FiTool },
  { to: "/manager/lifecycle", label: "Move-in/out", icon: FiCalendar },
  { to: "/manager/reports", label: "Reports", icon: FiBarChart2 },
];

/** Superadmin (role: admin) — platform analytics & control only */
const superadminLinks = [
  { to: "/manager", label: "Analytics", icon: FiBarChart2, end: true },
  { to: "/manager/reports", label: "Full report", icon: FiGrid },
  { to: "/manager/users", label: "Users", icon: FiUsers },
  { to: "/manager/audit", label: "Audit log", icon: FiActivity },
  { to: "/manager/settings", label: "Settings", icon: FiSettings },
];

function GlassNavItem({ link, collapsed, onClick }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      title={link.label}
      aria-label={link.label}
      className={({ isActive }) =>
        [
          collapsed ? "glass-rail-btn" : "glass-nav-row",
          isActive ? (collapsed ? "glass-rail-btn--active" : "glass-nav-row--active") : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {collapsed ? (
        <link.icon className="h-4 w-4" aria-hidden />
      ) : (
        <>
          <span className="glass-nav-chip">
            <link.icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="glass-nav-label">{link.label}</span>
        </>
      )}
    </NavLink>
  );
}

function GlassSidebar({
  mode,
  placement = "desktop",
  onToggleCollapse,
  onNavigate,
  onClose,
  isSuperAdmin = false,
}) {
  const collapsed = mode === "rail";
  const links = isSuperAdmin ? superadminLinks : opsLinks;
  const brand = isSuperAdmin ? "Superadmin" : "Manager";

  return (
    <aside
      className={[
        "glass-float",
        collapsed ? "glass-float--rail" : "glass-float--expanded",
        placement === "desktop" ? "glass-float--desktop" : "",
        placement === "drawer" ? "glass-float--drawer" : "",
        placement === "chip" ? "glass-float--chip" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={isSuperAdmin ? "Superadmin navigation" : "Manager navigation"}
    >
      <div className="glass-float__glow" aria-hidden />

      {collapsed ? (
        <div className="glass-float__rail-head">
          {onToggleCollapse && (
            <button
              type="button"
              className="glass-rail-btn glass-rail-btn--control"
              onClick={onToggleCollapse}
              aria-label="Expand navigation"
              title="Expand navigation"
            >
              <FiSidebar className="h-4 w-4" aria-hidden />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="glass-rail-btn glass-rail-btn--control"
              onClick={onClose}
              aria-label="Close navigation"
              title="Close"
            >
              <FiX className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <div className="glass-float__head">
          <Link to="/manager" className="glass-float__brand" onClick={onNavigate}>
            <span className="glass-float__mark">
              {isSuperAdmin ? <FiShield className="h-3.5 w-3.5" /> : "M"}
            </span>
            <span className="glass-float__wordmark">{brand}</span>
          </Link>
          <div className="glass-float__head-actions">
            {onToggleCollapse && (
              <button
                type="button"
                className="glass-float__ctrl"
                onClick={onToggleCollapse}
                aria-label="Collapse navigation"
                title="Collapse to icon rail"
              >
                <FiChevronsLeft className="h-4 w-4" aria-hidden />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="glass-float__ctrl"
                onClick={onClose}
                aria-label="Close navigation"
                title="Close"
              >
                <FiX className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="glass-float__nav">
        {links.map((link) => (
          <GlassNavItem
            key={link.to + link.label}
            link={link}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
}

export default function ManagerDashboardLayout() {
  const { userProfile, logout } = useAuth();
  const isSuperAdmin = userProfile?.role === "admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileRail, setMobileRail] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileRail(false);
  };

  const floatingNav =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="hidden lg:contents">
              <GlassSidebar
                mode={collapsed ? "rail" : "expanded"}
                placement="desktop"
                onToggleCollapse={() => setCollapsed((c) => !c)}
                onNavigate={() => {}}
                isSuperAdmin={isSuperAdmin}
              />
            </div>

            {mobileOpen && (
              <>
                <div
                  className="glass-float-backdrop lg:hidden"
                  onClick={closeMobile}
                  aria-hidden
                />
                <div className="lg:hidden">
                  <GlassSidebar
                    mode={mobileRail ? "rail" : "expanded"}
                    placement={mobileRail ? "chip" : "drawer"}
                    onToggleCollapse={() => setMobileRail((r) => !r)}
                    onNavigate={closeMobile}
                    onClose={closeMobile}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              </>
            )}
          </>,
          document.body
        )
      : null;

  return (
    <div className="manager-shell min-h-screen">
      {floatingNav}

      <div
        className={`manager-shell__content ${
          collapsed ? "manager-shell__content--rail" : "manager-shell__content--expanded"
        }`}
      >
        <header className="manager-topbar">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="glass-topbar-btn lg:hidden"
              onClick={() => {
                setMobileRail(false);
                setMobileOpen(true);
              }}
              aria-label="Open navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-[#2C1810]/55 sm:block">
              {isSuperAdmin ? "Platform analytics" : "Operations workspace"}
            </p>
          </div>
          <div className="manager-topbar__cluster">
            <NotificationBell />
            <Avatar name={userProfile?.displayName || (isSuperAdmin ? "Superadmin" : "Manager")} size="sm" />
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-xl p-2 text-[#2C1810]/60 transition hover:bg-white/60 hover:text-[#2C1810]"
              title="Sign out"
            >
              <FiLogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
