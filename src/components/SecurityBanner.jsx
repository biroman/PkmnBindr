import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../stores/authStore";
import { Alert, AlertDescription } from "./ui/Alert";
import { Button } from "./ui/Button";

export const SecurityBanner = () => {
  const { user, resendEmailVerification } = useAuth();
  const { refreshUser } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  // Don't show if user is not logged in or email is already verified
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      setMessage("");

      const sent = await resendEmailVerification();
      if (sent) {
        setMessage(
          "Verification email sent! Please check your inbox and spam folder."
        );
      } else {
        setMessage(
          "Unable to send verification email. Please try again later."
        );
      }
    } catch (error) {
      setMessage("Error sending verification email. Please try again.");
      console.error("Error resending verification:", error);
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setIsRefreshing(true);
      setMessage("");

      await refreshUser();
      setMessage("Verification status refreshed!");
    } catch (error) {
      setMessage("Error refreshing status. Please try again.");
      console.error("Error refreshing user:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Email Verification Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your email address is not verified. Please check your email and
              click the verification link.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              variant="outline"
              size="sm"
              className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"
            >
              {isRefreshing ? "Refreshing..." : "Refresh Status"}
            </Button>
            {message && (
              <span className="text-sm text-yellow-700">{message}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityBanner;
