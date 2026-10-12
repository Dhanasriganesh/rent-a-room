import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui";
import NotificationBell from "../notifications/NotificationBell";
import {
  FiShield,
  FiUsers,
  FiHome,
  FiCreditCard,
  FiFileText,
  FiSettings,
  FiMenu,
  FiX,
  FiLogOut,
  FiActivity,
} from "react-icons/fi";

const links = [
  { to: "/admin", label: "Overview", end: true, icon: FiShield },
  { to: "/admin/owners", label: "Owners", icon: FiHome },
  { to: "/admin/users", label: "Users", icon: FiUsers },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: FiCreditCard },
  { to: "/admin/audit", label: "Audit logs", icon: FiActivity },
  { to: "/admin/settings", label: "Platform config", icon: FiSettings },
];

export default function AdminLayout() {
  const { userProfile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link to="/admin" className="flex items-center gap-2 font-bold">
            <FiShield className="h-5 w-5" />
            Admin Console
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <FiX />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)}>
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Avatar name={userProfile?.displayName || "Admin"} size="sm" />
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Sign out"
            >
              <FiLogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
