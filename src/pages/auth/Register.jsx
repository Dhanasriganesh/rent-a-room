import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, USER_ROLES } from "../../context/AuthContext";
import { getHomeForRole } from "../../components/auth/ProtectedRoute";
import { Button, Input, Card, Alert } from "../../components/ui";
import { FiHome, FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiEye, FiEyeOff, FiUsers, FiKey } from "react-icons/fi";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialRole = searchParams.get("role") === "owner" ? USER_ROLES.OWNER : USER_ROLES.RENTER;
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
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

    // Validation
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
      await register({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        phone: formData.phone,
        city: formData.city,
        role: formData.role,
      });
      
      const redirectPath = getHomeForRole(formData.role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
              <FiHome className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">HomeRental</span>
          </Link>
        </div>

        <Card className="animate-slide-up">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-2 text-gray-500">Join HomeRental today</p>
          </div>

          {/* Role Selector */}
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: USER_ROLES.RENTER }))}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                formData.role === USER_ROLES.RENTER
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiUsers className="h-4 w-4" />
              I need a home
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: USER_ROLES.OWNER }))}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                formData.role === USER_ROLES.OWNER
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiKey className="h-4 w-4" />
              I have properties
            </button>
          </div>

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
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
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

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        {formData.role === USER_ROLES.OWNER && (
          <div className="mt-6 rounded-lg bg-white/10 p-4 text-center text-sm text-white">
            <p className="font-medium">Property Owner Account</p>
            <p className="mt-1 text-white/80">
              You'll get your own branded rental website and dashboard to manage properties, tenants, and rent collection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
