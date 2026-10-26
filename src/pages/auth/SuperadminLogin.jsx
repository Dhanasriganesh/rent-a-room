import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card, Alert } from "../../components/ui";
import { FiShield, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

/**
 * Separate entry for superadmin (role: admin) — Users / Audit / Settings.
 * Property managers and renters should use /login instead.
 */
export default function SuperadminLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const role = result.profile?.role;
      if (role !== "admin") {
        await logout();
        setError("This portal is for superadmin only. Use the main sign-in for other accounts.");
        return;
      }
      navigate("/manager", { replace: true });
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid superadmin email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3EBE3] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C1810] text-white shadow-lg">
            <FiShield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C1810]">Superadmin</h1>
          <p className="mt-2 text-sm text-[#2C1810]/60">
            Platform analytics, users, audit log, and settings
          </p>
        </div>

        <Card className="border border-white/60 bg-white/70 shadow-xl backdrop-blur">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                placeholder="Superadmin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12"
                autoComplete="username"
                required
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <Button type="submit" className="w-full !bg-[#2C1810] hover:!bg-[#3a2218]" loading={loading}>
              Enter admin desk
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Staff / renters:{" "}
            <Link to="/login" className="font-medium text-[#FF8C00] hover:underline">
              Main sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
