import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { applyActionCode, reload } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Check, X } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../../components/ui/Button";
import { Alert, AlertDescription } from "../../components/ui/Alert";

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    const handleEmailVerification = async () => {
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");

      if (mode !== "verifyEmail" || !oobCode) {
        setStatus("error");
        setMessage("Invalid verification link. Please try again.");
        return;
      }

      try {
        // Apply the email verification code
        await applyActionCode(auth, oobCode);

        // Reload the user to get the updated emailVerified status
        if (auth.currentUser) {
          await reload(auth.currentUser);

          // Update the user document in Firestore
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            emailVerified: true,
            updatedAt: serverTimestamp(),
          });

          // Small delay to ensure Firebase Auth state is updated
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Refresh the auth store state
          await refreshUser();
        }

        setStatus("success");
        setMessage(
          "Email verified successfully! You can now access all features."
        );

        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 5000);
      } catch (error) {
        console.error("Email verification error:", error);
        let errorMessage = "Email verification failed. ";

        switch (error.code) {
          case "auth/expired-action-code":
            errorMessage +=
              "The verification link has expired. Please request a new one.";
            break;
          case "auth/invalid-action-code":
            errorMessage +=
              "The verification link is invalid or has already been used.";
            break;
          case "auth/user-disabled":
            errorMessage += "This account has been disabled.";
            break;
          case "auth/user-not-found":
            errorMessage += "No account found. Please sign up first.";
            break;
          default:
            errorMessage += "Please try again or contact support.";
        }

        setStatus("error");
        setMessage(errorMessage);
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === "verifying" && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Verifying Email
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Please wait while we verify your email address...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-900 mb-2">
                  Email Verified!
                </h2>
                <Alert variant="success" className="mb-4">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Redirecting to dashboard in 5 seconds...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-red-900 mb-2">
                  Verification Failed
                </h2>
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate("/auth/login")}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Login
                  </Button>
                  <Button
                    onClick={() => navigate("/auth/register")}
                    variant="outline"
                    className="w-full"
                  >
                    Create New Account
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
