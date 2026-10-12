import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingOverlay } from "../ui/index";

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay message="Loading your account..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.role)) {
    const redirectPath = getHomeForRole(userProfile.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Loading..." />;
  }

  if (user && userProfile) {
    const redirectPath = getHomeForRole(userProfile.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export function getHomeForRole(role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "owner":
      return "/dashboard";
    case "renter":
      return "/my-home";
    default:
      return "/";
  }
}
