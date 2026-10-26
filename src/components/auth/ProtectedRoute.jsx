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

  if (userProfile?.accountStatus === "suspended" || userProfile?.accountStatus === "cancelled") {
    return <Navigate to="/login" replace />;
  }

  // Manager-provisioned renters must set their own password before using the app
  if (
    userProfile?.mustChangePassword &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
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
    if (userProfile.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    const redirectPath = getHomeForRole(userProfile.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export function getHomeForRole(role) {
  switch (role) {
    case "admin":
      // Platform superadmin — analytics desk at /manager (not ops)
      return "/manager";
    case "property_manager":
      // Day-to-day mediation desk
      return "/manager";
    case "owner":
      return "/dashboard";
    case "renter":
      return "/my-home";
    default:
      return "/";
  }
}

/** Public-header CTA label for the signed-in home */
export function getHomeLabelForRole(role) {
  switch (role) {
    case "admin":
      return "Superadmin";
    case "property_manager":
      return "Manager desk";
    case "owner":
      return "Owner dashboard";
    case "renter":
      return "My Home";
    default:
      return "Account";
  }
}
