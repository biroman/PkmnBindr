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
  const { signIn, error: authStoreError, clearError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localError, setLocalError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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

      // Redirect to intended page or dashboard
      const from = location.state?.from?.pathname || "/dashboard";
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
