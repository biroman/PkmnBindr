import { useSearchParams, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import EmailVerificationPage from "../../pages/auth/EmailVerificationPage";
import DashboardPage from "../../pages/DashboardPage";

const DashboardHandler = () => {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if this is an email verification link
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  // If email verification parameters are present, show verification page (public access)
  if (mode === "verifyEmail" && oobCode) {
    return <EmailVerificationPage />;
  }

  // For normal dashboard access, require authentication
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // User is authenticated and no verification parameters, show dashboard
  return <DashboardPage />;
};

export default DashboardHandler;
