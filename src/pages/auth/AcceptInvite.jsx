import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getStaffInvitationByToken } from "../../lib/firestore";
import { getHomeForRole } from "../../components/auth/ProtectedRoute";
import { Card, Button, Alert, Spinner } from "../../components/ui";
import { FiHome } from "react-icons/fi";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, acceptStaffInvite, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const row = await getStaffInvitationByToken(token);
        if (!cancelled) setInvite(row);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load invitation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const claim = async () => {
    setError("");
    setClaiming(true);
    try {
      const role = await acceptStaffInvite(token);
      setSuccess(`Invitation accepted. Your role is now ${role}.`);
      setTimeout(() => navigate(getHomeForRole(role), { replace: true }), 1200);
    } catch (err) {
      setError(err.message || "Could not accept invitation");
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const expired =
    invite?.expiresAt && new Date(invite.expiresAt).getTime() < Date.now();
  const invalid = !invite || invite.status !== "pending" || expired;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
              <FiHome className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold">HomeRental</span>
          </Link>
        </div>

        <Card>
          <h1 className="text-xl font-bold text-gray-900">Staff invitation</h1>
          {error && (
            <Alert variant="error" className="mt-4">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mt-4">
              {success}
            </Alert>
          )}

          {invalid ? (
            <p className="mt-4 text-sm text-gray-600">
              This invitation is missing, used, or expired. Ask an administrator to send a new
              invite.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600">
                You are invited as <strong>{invite.role.replace("_", " ")}</strong> for{" "}
                <strong>{invite.email}</strong>.
              </p>
              {!user ? (
                <div className="space-y-3">
                  <Alert variant="info">
                    Sign in or create an account using exactly this email, then return to this
                    link to claim the role.
                  </Alert>
                  <Button
                    className="w-full"
                    onClick={() =>
                      navigate(
                        `/register?email=${encodeURIComponent(invite.email)}&invite=${encodeURIComponent(token)}`
                      )
                    }
                  >
                    Create account
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      navigate(`/login`, {
                        state: { from: `/invite/${token}` },
                      })
                    }
                  >
                    Sign in
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Signed in as {userProfile?.email || user.email} (current role:{" "}
                    {userProfile?.role || "—"}).
                  </p>
                  <Button className="w-full" loading={claiming} onClick={claim}>
                    Accept invitation
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
