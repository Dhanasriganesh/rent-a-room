import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiLogIn,
  FiGrid,
  FiArrowRight,
} from "react-icons/fi";

const WebsiteMessenger = lazy(() => import("../messages/WebsiteMessenger"));

const publicLinks = [
  { to: "/", label: "Home", icon: FiHome, end: true },
  { to: "/properties", label: "Properties", icon: FiGrid },
];

/**
 * Marketing / public shell — colorful floating pill header on the product face.
 */
export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className={`flex min-h-screen flex-col text-[#2C1810] ${isLanding ? "public-shell--landing" : "rental-surface"}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="public-header pt-[env(safe-area-inset-top,0px)]">
        <div className="public-header__bar">
          <Link to="/" className="public-header__brand" onClick={closeMobileMenu}>
            <span className="public-header__mark">
              <FiHome />
            </span>
            <span className="public-header__word">
              Home<span>Rental</span>
            </span>
          </Link>

          <nav className="public-header__nav">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `public-header__link${isActive ? " is-active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-header__actions">
            <Link to="/login" className="public-header__signin">
              Sign in
            </Link>
            <Link to="/login" className="public-header__cta">
              Get started
              <FiArrowRight />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="public-header__burger"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="public-header__drawer">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `public-header__drawer-link${isActive ? " is-active" : ""}`
                }
              >
                <link.icon />
                {link.label}
              </NavLink>
            ))}
            <Link to="/login" onClick={closeMobileMenu} className="public-header__drawer-cta">
              <FiLogIn />
              Sign in
            </Link>
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
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1A9B72] text-white">
                  <FiHome className="h-4 w-4" />
                </div>
                <span className="text-lg font-semibold">HomeRental</span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-[#F3EBE3]/65">
                Room mediation in Germany — browse properties, enquire with the desk,
                and sign in when they send your login.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#52B788]">
                Renters
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#F3EBE3]/70">
                <li>
                  <Link to="/properties" className="hover:text-white">
                    Browse properties
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
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#52B788]">
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
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#52B788]">
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
