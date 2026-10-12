import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card, Alert } from "../../components/ui";
import { FiHome, FiMail, FiArrowLeft } from "react-icons/fi";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // Do not reveal whether the email exists
        setSent(true);
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Could not send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
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
            <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
            <p className="mt-2 text-gray-500">
              Enter your email and we&apos;ll send a secure reset link.
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <Alert variant="success">
                If an account exists for that email, a password reset link has been sent.
                Check your inbox and spam folder.
              </Alert>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
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
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12"
                    required
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send reset link
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
