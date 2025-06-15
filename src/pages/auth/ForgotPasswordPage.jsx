import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { forgotPasswordSchema } from "../../lib/schemas";
import { formatErrorMessage } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Alert, AlertDescription } from "../../components/ui/Alert";

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [success, setSuccess] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setAuthError("");
      setSuccess(false);
      await resetPassword(data.email);
      setSuccess(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      // Handle specific errors with user-friendly messages
      let errorMessage = "Failed to send reset email. Please try again.";

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          setError("email", { message: "Account not found" });
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          setError("email", { message: "Invalid email format" });
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many reset attempts. Please try again later.";
          break;
        default:
          if (error.message.includes("Too many password reset attempts")) {
            errorMessage = error.message;
          } else {
            errorMessage = formatErrorMessage(error);
          }
      }

      setAuthError(errorMessage);

      // Auto-clear error after 10 seconds
      setTimeout(() => {
        setAuthError("");
      }, 10000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {authError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            <AlertDescription>
              Password reset email sent! Check your inbox for further
              instructions.
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
              className={errors.email ? "border-red-500" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || success}
          >
            {isSubmitting ? "Sending..." : "Send Reset Email"}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            to="/auth/login"
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            Back to Sign In
          </Link>
          <div className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link
              to="/auth/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
