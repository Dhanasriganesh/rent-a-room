import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomeForRole } from "../../components/auth/ProtectedRoute";
import { Button, Input, Alert } from "../../components/ui";
import { FiMail, FiLock, FiEye, FiEyeOff, FiHome, FiKey, FiMapPin } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.profile?.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      navigate(from || getHomeForRole(result.profile?.role), { replace: true });
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-simple relative min-h-[100dvh] overflow-x-clip bg-[#F3EBE3]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 20%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(255,140,0,0.1), transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col lg:flex-row">
        {/* Left — rental story (compact on phones) */}
        <aside className="flex flex-col justify-between px-5 pb-2 pt-8 sm:px-10 sm:pt-10 lg:flex-1 lg:px-14 lg:py-14">
          <Link to="/" className="inline-flex w-fit items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2C1810] text-white shadow-md">
              <FiHome className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-[#2C1810]">
              HomeRental
            </span>
          </Link>

          <div className="my-6 max-w-md sm:my-10 lg:my-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF8C00]">
              Room mediation
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#2C1810] sm:mt-3 sm:text-4xl">
              Find a room.
              <br />
              Manage it simply.
            </h1>
            <p className="mt-3 hidden text-base leading-relaxed text-[#2C1810]/65 sm:block">
              Sign in to apply for rooms, follow your application, or run your
              mediation desk — one calm place for rentals.
            </p>

            <ul className="mt-6 hidden space-y-3 sm:block">
              {[
                { icon: FiMapPin, text: "Open your manager’s room link" },
                { icon: FiKey, text: "Track keys, contracts & rent" },
                { icon: FiHome, text: "Message the desk when you need help" },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <li
                    key={item.text}
                    className="flex items-center gap-3 text-sm text-[#2C1810]/75"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/45 text-[#2C1810] backdrop-blur-sm">
                      <ItemIcon className="h-3.5 w-3.5" />
                    </span>
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="hidden text-xs text-[#2C1810]/40 lg:block">
            Trusted mediation for shared rooms and private rentals.
          </p>
        </aside>

        {/* Right — padlock login card only */}
        <main className="flex flex-1 items-start justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:items-center sm:px-10 lg:px-12 lg:py-14">
          <div className="lock-login w-full max-w-[22rem]">
            <div className="lock-shackle mx-auto" aria-hidden>
              <div className="lock-shackle__arch" />
            </div>

            <div className="lock-body login-glass-card relative border border-white/60 px-6 pb-7 pt-7 sm:px-7">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-[1.75rem] bg-gradient-to-b from-white/50 to-transparent" />

              <div className="relative mb-4 flex justify-center" aria-hidden>
                <div className="lock-keyhole">
                  <span className="lock-keyhole__circle" />
                  <span className="lock-keyhole__slot" />
                </div>
              </div>

              <div className="relative mb-5 text-center">
                <h2 className="text-xl font-bold tracking-tight text-[#2C1810]">
                  Welcome back
                </h2>
                <p className="mt-1 text-sm text-[#2C1810]/55">
                  Sign in to your account
                </p>
              </div>

              {error && (
                <Alert variant="error" className="relative mb-4">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="relative space-y-3.5">
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C1810]/40" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/60 bg-white/55 pl-10"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C1810]/40" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/60 bg-white/55 pl-10 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2C1810]/40 hover:text-[#2C1810]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#2C1810]/55 hover:text-[#FF8C00]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full !rounded-2xl !bg-[#2C1810] hover:!bg-[#3a2218]"
                  size="lg"
                >
                  Sign in
                </Button>
              </form>

              <p className="relative mt-5 text-center text-sm text-[#2C1810]/55">
                Looking for a room?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-[#FF8C00] hover:underline"
                >
                  Create a renter account
                </Link>
              </p>
              <p className="relative mt-3 text-center text-[11px] leading-relaxed text-[#2C1810]/40">
                Property managers use this page.
                <br />
                Platform superadmin:{" "}
                <Link to="/superadmin/login" className="underline hover:text-[#2C1810]">
                  /superadmin/login
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
