import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useRole } from "../../contexts/RoleContext";

const ProtectedRoute = ({ requiredRole = null, requiredPermission = null }) => {
  const { user, loading } = useAuth();
  const { hasRole, hasPermission, loading: roleLoading } = useRole();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check role-based authorization if required
  if (requiredRole && !hasRole(requiredRole)) {
    console.warn(`Access denied: User lacks required role '${requiredRole}'`);
    return <Navigate to="/dashboard" replace />;
  }

  // Check permission-based authorization if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.warn(
      `Access denied: User lacks required permission '${requiredPermission}'`
    );
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
