import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { loginSchema } from "../../lib/schemas";
import { formatErrorMessage } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Alert, AlertDescription } from "../../components/ui/Alert";

const LoginPage = () => {
  const {
    signIn,
    signInWithGoogle,
    signInWithTwitter,
    error: authStoreError,
    clearError,
    loading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localError, setLocalError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message && location.state?.type === "success") {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [location.state]);

  // Clear errors when component mounts
  useEffect(() => {
    setLocalError("");
    // Don't clear auth store error on mount - let it persist for better UX
  }, []); // Remove clearError dependency to prevent clearing on every render

  // Get the current error to display (prefer local error, then format auth store error)
  const displayError =
    localError || (authStoreError && formatFriendlyError(authStoreError));

  // Helper function to format raw Firebase errors into user-friendly messages
  function formatFriendlyError(error) {
    const errorString = error.toString().toLowerCase();

    if (
      errorString.includes("invalid-credential") ||
      errorString.includes("invalid-login-credentials")
    ) {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    if (errorString.includes("user-not-found")) {
      return "No account found with this email address.";
    }
    if (errorString.includes("wrong-password")) {
      return "Incorrect password. Please try again.";
    }
    if (errorString.includes("too-many-requests")) {
      return "Too many failed attempts. Please try again later.";
    }
    if (errorString.includes("user-disabled")) {
      return "This account has been disabled. Please contact support.";
    }

    return "Login failed. Please try again.";
  }

  // Debug logging (remove in production)
  // console.log("LoginPage render:", { localError, authStoreError, displayError });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      // Clear any previous errors
      setLocalError("");
      // Don't clear auth store error here - let it handle its own state

      await signIn(data.email, data.password);

      // Redirect to intended page or home
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login failed:", error);

      // Handle specific Firebase auth errors with user-friendly messages
      let errorMessage = "Login failed. Please try again.";
      let fieldError = null;

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          fieldError = { field: "email", message: "Account not found" };
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          fieldError = { field: "password", message: "Incorrect password" };
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          fieldError = { field: "email", message: "Invalid email format" };
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/user-disabled":
          errorMessage =
            "This account has been disabled. Please contact support.";
          break;
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          errorMessage =
            "Invalid email or password. Please check your credentials and try again.";
          break;
        default:
          // Handle rate limiting errors from our custom logic
          if (error.message.includes("Too many login attempts")) {
            errorMessage = error.message;
          } else {
            errorMessage = error.message || "Login failed. Please try again.";
          }
      }

      // Set field-specific error if applicable
      if (fieldError) {
        setError(fieldError.field, { message: fieldError.message });
      }

      // Set the main error message
      setLocalError(errorMessage);

      // Auto-clear error after 15 seconds
      setTimeout(() => {
        setLocalError("");
      }, 15000);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingSocial(true);
      setLocalError("");

      await signInWithGoogle();

      // OAuth login successful - redirect to intended page or home
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Google login failed:", error);

      let errorMessage = "Google login failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage =
          "Login cancelled. Please try again if you want to continue.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked. Please allow pop-ups and try again.";
      }

      setLocalError(errorMessage);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  const handleTwitterLogin = async () => {
    try {
      setIsLoadingSocial(true);
      setLocalError("");

      await signInWithTwitter();

      // OAuth login successful - redirect to intended page or home
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Twitter login failed:", error);

      let errorMessage = "Twitter login failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage =
          "Login cancelled. Please try again if you want to continue.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked. Please allow pop-ups and try again.";
      }

      setLocalError(errorMessage);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Success message from registration */}
        {showSuccessMessage && location.state?.message && (
          <Alert
            variant="success"
            className="mb-6 bg-green-50 border-green-200"
          >
            <AlertDescription className="text-green-800">
              {location.state.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {displayError && (
          <Alert
            variant="destructive"
            className="mb-6 border-2 border-red-500 bg-red-50"
          >
            <AlertDescription className="flex items-start gap-2 text-red-800">
              <svg
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{displayError}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Social Login Options */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoadingSocial || loading}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-11"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoadingSocial ? "Signing in..." : "Continue with Google"}
          </Button>

          <Button
            onClick={handleTwitterLogin}
            disabled={isLoadingSocial || loading}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-11"
          >
            <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            {isLoadingSocial ? "Signing in..." : "Continue with Twitter"}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={
                errors.email
                  ? "border-red-500 focus:border-red-500"
                  : "focus:border-blue-500"
              }
              {...register("email", {
                onChange: () => {
                  // Clear local error when user starts typing
                  if (localError) {
                    setLocalError("");
                  }
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={
                errors.password
                  ? "border-red-500 focus:border-red-500"
                  : "focus:border-blue-500"
              }
              {...register("password", {
                onChange: () => {
                  // Clear local error when user starts typing
                  if (localError) {
                    setLocalError("");
                  }
                },
              })}
            />
            {errors.password && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/auth/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
