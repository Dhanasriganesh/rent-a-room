import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomeForRole } from "../auth/ProtectedRoute";
import {
  FiMenu,
  FiX,
  FiHome,
  FiSearch,
  FiHeart,
  FiUser,
  FiLogIn,
  FiUserPlus,
  FiLogOut,
  FiGrid,
} from "react-icons/fi";

const publicLinks = [
  { to: "/", label: "Home", icon: FiHome },
  { to: "/listings", label: "Browse Listings", icon: FiSearch },
];

export default function PublicLayout() {
  const { user, userProfile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMobileMenu();
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FiHome className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HomeRental</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            {user && userProfile ? (
              <>
                <Link
                  to={getHomeForRole(userProfile.role)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <FiGrid className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <FiLogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white md:hidden">
            <div className="space-y-1 px-4 py-4">
              {publicLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </NavLink>
              ))}

              <hr className="my-3 border-gray-200" />

              {user && userProfile ? (
                <>
                  <Link
                    to={getHomeForRole(userProfile.role)}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    <FiGrid className="h-5 w-5" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    <FiLogOut className="h-5 w-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    <FiLogIn className="h-5 w-5" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white"
                  >
                    <FiUserPlus className="h-5 w-5" />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <FiHome className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">HomeRental</span>
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                Find your perfect home with trusted property owners. Simple, secure, and transparent rental experience.
              </p>
            </div>

            {/* For Renters */}
            <div>
              <h4 className="font-semibold text-gray-900">For Renters</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link to="/listings" className="text-gray-500 hover:text-primary">
                    Browse Listings
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="text-gray-500 hover:text-primary">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/register?role=renter" className="text-gray-500 hover:text-primary">
                    Create Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* For Owners */}
            <div>
              <h4 className="font-semibold text-gray-900">For Property Owners</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link to="/for-owners" className="text-gray-500 hover:text-primary">
                    List Your Property
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-gray-500 hover:text-primary">
                    Pricing Plans
                  </Link>
                </li>
                <li>
                  <Link to="/register?role=owner" className="text-gray-500 hover:text-primary">
                    Owner Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-gray-900">Support</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link to="/help" className="text-gray-500 hover:text-primary">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-500 hover:text-primary">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-gray-500 hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-500 hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <hr className="my-8 border-gray-200" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} HomeRental. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
