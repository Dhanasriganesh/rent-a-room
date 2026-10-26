import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, USER_ROLES } from "../../context/AuthContext";
import { getHomeForRole } from "../../components/auth/ProtectedRoute";
import { assertClientRateLimit, RATE_LIMITS } from "../../lib/rateLimit";
import { Button, Input, Card, Alert } from "../../components/ui";
import {
  FiHome,
  FiMail,
  FiLock,
  FiUser,
  FiPhone,
  FiMapPin,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

/**
 * Public registration is for people looking for a home (renter/applicant).
 * Staff join via invite link. Property owners are onboarded by the company.
 */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const returnInvite = searchParams.get("invite") || "";
  const returnJoin = searchParams.get("join") || "";

  const [formData, setFormData] = useState({
    displayName: "",
    email: prefillEmail,
    phone: "",
    city: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.displayName || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      assertClientRateLimit("register", {
        ...RATE_LIMITS.register,
        identity: formData.email,
      });
      const result = await register({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        phone: formData.phone,
        city: formData.city,
        role: USER_ROLES.RENTER,
      });

      if (returnInvite) {
        navigate(`/invite/${returnInvite}`, { replace: true });
        return;
      }

      if (returnJoin) {
        navigate(`/join/${returnJoin}`, { replace: true });
        return;
      }

      const redirectPath = getHomeForRole(result.profile?.role || USER_ROLES.RENTER);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3EBE3] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2C1810] text-white">
              <FiHome className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#2C1810]">
              HomeRental
            </span>
          </Link>
        </div>

        <Card className="login-glass-card animate-slide-up !border-white/55 !bg-transparent shadow-[0_18px_40px_rgba(44,24,16,0.08)]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#2C1810]">Create your account</h1>
            <p className="mt-2 text-sm text-[#2C1810]/55">
              {returnInvite
                ? "Create your login, then accept your staff invitation."
                : "Find a room and manage your application in one place."}
            </p>
          </div>

          {returnInvite && (
            <Alert variant="info" className="mb-6">
              You are setting up an account for a staff invitation. After registering, you will
              return to the invite link to activate your role.
            </Alert>
          )}

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                name="displayName"
                placeholder="Full name"
                value={formData.displayName}
                onChange={handleChange}
                className="pl-12"
                required
                autoComplete="name"
              />
            </div>

            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                className="pl-12"
                required
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FiPhone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-12"
                  autoComplete="tel"
                />
              </div>
              <div className="relative">
                <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="pl-12"
                />
              </div>
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password (min. 6 characters)"
                value={formData.password}
                onChange={handleChange}
                className="pl-12 pr-12"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-12"
                required
                autoComplete="new-password"
              />
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                I agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-gray-500">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                Sign in
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Property owner? Contact the team — accounts are set up by staff.
              <br />
              Staff? Use the invitation link you were sent.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
