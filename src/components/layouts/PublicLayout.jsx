import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiLogIn,
  FiUserPlus,
} from "react-icons/fi";

const WebsiteMessenger = lazy(() => import("../messages/WebsiteMessenger"));

const publicLinks = [
  { to: "/", label: "Home", icon: FiHome },
];

/**
 * Marketing / public shell only.
 * Desk, My Home, and Sign out live inside role dashboards — not here —
 * so the website header never shows "Superadmin / Manager / Sign out".
 */
export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen flex-col rental-surface text-[#2C1810]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/50 bg-[#F3EBE3]/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#2C1810] text-white shadow-sm">
              <FiHome className="h-4 w-4" />
            </div>
            <span className="truncate text-base font-semibold tracking-tight text-[#2C1810] sm:text-lg">
              HomeRental
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#2C1810] text-white"
                      : "text-[#2C1810]/65 hover:bg-white/50 hover:text-[#2C1810]"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-[#2C1810]/70 hover:bg-white/50"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[#2C1810] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a2218]"
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="touch-target flex items-center justify-center rounded-full text-[#2C1810]/70 hover:bg-white/50 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/50 bg-[#F3EBE3]/95 md:hidden">
            <div className="space-y-1 px-4 py-4">
              {publicLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      isActive
                        ? "bg-[#2C1810] text-white"
                        : "text-[#2C1810]/70 hover:bg-white/50"
                    }`
                  }
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </NavLink>
              ))}
              <hr className="my-3 border-[#2C1810]/10" />
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#2C1810]/70"
              >
                <FiLogIn className="h-5 w-5" />
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl bg-[#2C1810] px-4 py-3 text-sm font-medium text-white"
              >
                <FiUserPlus className="h-5 w-5" />
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/60 bg-[#2C1810] text-[#F3EBE3]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FF8C00] text-[#2C1810]">
                  <FiHome className="h-4 w-4" />
                </div>
                <span className="text-lg font-semibold">HomeRental</span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-[#F3EBE3]/65">
                Room mediation in Germany — open a private link from your manager,
                apply once, and stay in touch through move-in and rent.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#FF8C00]">
                Renters
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#F3EBE3]/70">
                <li>
                  <Link to="/register" className="hover:text-white">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#FF8C00]">
                Mediation
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#F3EBE3]/70">
                <li>
                  <Link to="/login" className="hover:text-white">
                    Manager sign in
                  </Link>
                </li>
                <li>
                  <Link to="/superadmin/login" className="hover:text-white">
                    Platform superadmin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#FF8C00]">
                Support
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#F3EBE3]/70">
                <li>
                  <Link to="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-[#F3EBE3]/45">
            © {new Date().getFullYear()} HomeRental · Room mediation
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <WebsiteMessenger />
      </Suspense>
    </div>
  );
}
