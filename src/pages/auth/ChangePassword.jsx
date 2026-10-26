import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { getHomeForRole } from "../../components/auth/ProtectedRoute";
import { Button, Input, Alert } from "../../components/ui";
import { FiHome, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

/**
 * Forced after manager-provisioned first login (mustChangePassword).
 */
export default function ChangePassword() {
  const { user, userProfile, completePasswordChange, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile && !userProfile.mustChangePassword) {
    return <Navigate to={getHomeForRole(userProfile.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (!currentPassword) {
      setError("Enter the temporary password from your email");
      return;
    }

    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, password);
      await completePasswordChange();
      navigate(getHomeForRole(userProfile?.role || "renter"), { replace: true });
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Temporary password is incorrect");
      } else if (err.code === "auth/weak-password") {
        setError("Choose a stronger password");
      } else {
        setError(err.message || "Could not update password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3EBE3] px-4 py-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#2C1810] text-white">
          <FiHome className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold text-[#2C1810]">HomeRental</span>
      </Link>

      <div className="w-full max-w-md rounded-[1.75rem] border border-white/60 bg-white/55 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <div className="mb-2 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2C1810] text-white">
            <FiLock className="h-5 w-5" />
          </span>
        </div>
        <h1 className="text-center text-xl font-bold text-[#2C1810]">
          Choose your own password
        </h1>
        <p className="mt-2 text-center text-sm text-[#2C1810]/55">
          Your manager sent a temporary login. For security, set a new password before
          continuing to My Home.
        </p>

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <Input
            label="Temporary password (from email)"
            type={show ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="relative">
            <Input
              label="New password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-[#2C1810]/40"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide" : "Show"}
            >
              {show ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            label="Confirm new password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button
            type="submit"
            loading={loading}
            className="w-full !bg-[#2C1810]"
            size="lg"
          >
            Save new password
          </Button>
        </form>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-4 w-full text-center text-sm text-[#2C1810]/45 hover:text-[#2C1810]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
