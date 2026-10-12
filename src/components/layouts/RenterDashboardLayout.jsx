import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar, Badge } from "../ui";
import {
  FiHome,
  FiGrid,
  FiSearch,
  FiHeart,
  FiFileText,
  FiDollarSign,
  FiFolder,
  FiMessageSquare,
  FiTool,
  FiBell,
  FiSettings,
  FiMenu,
  FiX,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";

const sidebarLinks = [
  { to: "/my-home", label: "Overview", icon: FiGrid, end: true },
  { to: "/my-home/discover", label: "Discover Homes", icon: FiSearch },
  { to: "/my-home/saved", label: "Saved Homes", icon: FiHeart },
  { to: "/my-home/applications", label: "My Applications", icon: FiFileText },
  { to: "/my-home/tenancy", label: "My Tenancy", icon: FiHome },
  { to: "/my-home/rent", label: "Rent & Payments", icon: FiDollarSign },
  { to: "/my-home/documents", label: "Documents", icon: FiFolder },
  { to: "/my-home/messages", label: "Messages", icon: FiMessageSquare, badge: "2" },
  { to: "/my-home/requests", label: "Requests", icon: FiTool },
];

const bottomLinks = [
  { to: "/my-home/notifications", label: "Notifications", icon: FiBell },
  { to: "/my-home/settings", label: "Settings", icon: FiSettings },
];

export default function RenterDashboardLayout() {
  const { user, userProfile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
            <Link to="/my-home" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <FiHome className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">My Home</span>
            </Link>
            <button
              onClick={closeSidebar}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {sidebarLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </div>
                {link.badge && (
                  <Badge variant="danger" className="ml-auto">
                    {link.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom links */}
          <div className="border-t border-gray-200 px-3 py-4">
            {bottomLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <FiMenu className="h-6 w-6" />
          </button>

          <div className="hidden flex-1 lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <FiBell className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                2
              </span>
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100"
              >
                <Avatar
                  name={userProfile?.displayName || user?.email}
                  size="sm"
                />
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                  {userProfile?.displayName?.split(" ")[0] || "Renter"}
                </span>
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                    <div className="border-b border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {userProfile?.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/my-home/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FiSettings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      to="/"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FiHome className="h-4 w-4" />
                      Back to Home
                    </Link>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiLogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
