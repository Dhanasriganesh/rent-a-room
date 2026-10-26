import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getRenterInvitationByToken,
  claimRenterInvitation,
} from "../../lib/firestore";
import { Button, ButtonLink, Alert, Card, Spinner } from "../../components/ui";
import { FiHome, FiKey } from "react-icons/fi";

/**
 * /join/:token — renter sets up (or signs into) their account after a manager invite.
 * They choose their own password via Register; the manager never sends a password.
 */
export default function JoinInvite() {
  const { token } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const row = await getRenterInvitationByToken(token);
        if (!cancelled) setInvite(row);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load invitation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const expired =
    invite?.expiresAt && new Date(invite.expiresAt).getTime() < Date.now();
  const invalid = !invite || invite.status !== "pending" || expired;

  const handleClaim = async () => {
    if (!user) return;
    setClaiming(true);
    setError("");
    try {
      await claimRenterInvitation(token, user.uid, user.email || userProfile?.email);
      setDone(true);
      setTimeout(() => navigate("/my-home", { replace: true }), 1200);
    } catch (err) {
      setError(err.message || "Could not claim invitation");
    } finally {
      setClaiming(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EBE3]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3EBE3] px-4 py-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#2C1810] text-white">
          <FiHome className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold text-[#2C1810]">HomeRental</span>
      </Link>

      <Card className="w-full max-w-md !p-6">
        <div className="mb-4 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2C1810] text-white">
            <FiKey className="h-5 w-5" />
          </span>
        </div>
        <h1 className="text-center text-xl font-bold text-[#2C1810]">Join your rental</h1>
        <p className="mt-2 text-center text-sm text-[#2C1810]/55">
          Your property manager invited you to My Home. You create your own password —
          nobody else sets it for you.
        </p>

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}
        {done && (
          <Alert variant="success" className="mt-4">
            Account linked — opening My Home…
          </Alert>
        )}

        {invalid ? (
          <Alert variant="warning" className="mt-4">
            This invitation is missing, already used, or expired. Ask your manager for a
            new invite link.
          </Alert>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#2C1810]/10 bg-white/50 p-4 text-sm">
              <p>
                <span className="text-[#2C1810]/45">Email</span>
                <br />
                <strong className="text-[#2C1810]">{invite.email}</strong>
              </p>
              {invite.displayName && (
                <p className="mt-2">
                  <span className="text-[#2C1810]/45">Name</span>
                  <br />
                  <strong className="text-[#2C1810]">{invite.displayName}</strong>
                </p>
              )}
            </div>

            {!user ? (
              <div className="flex flex-col gap-2">
                <ButtonLink
                  to={`/register?email=${encodeURIComponent(invite.email)}&join=${encodeURIComponent(token)}`}
                  className="w-full !bg-[#2C1810]"
                >
                  Create password &amp; account
                </ButtonLink>
                <ButtonLink
                  to="/login"
                  variant="outline"
                  className="w-full"
                  state={{ from: `/join/${token}` }}
                >
                  I already have an account — sign in
                </ButtonLink>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-[#2C1810]/60">
                  Signed in as <strong>{user.email}</strong>
                </p>
                <Button
                  className="w-full !bg-[#2C1810]"
                  loading={claiming}
                  onClick={handleClaim}
                >
                  Link my account &amp; continue
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
