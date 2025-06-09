import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { registerSchema, validatePasswordStrength } from "../../lib/schemas";
import { formatErrorMessage } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Alert, AlertDescription } from "../../components/ui/Alert";

const RegisterPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const password = watch("password");
  const passwordStrength = password ? validatePasswordStrength(password) : null;

  const onSubmit = async (data) => {
    try {
      setAuthError("");
      await signUp(
        data.email,
        data.password,
        data.displayName,
        data.agreeToTerms
      );

      // Show success message about email verification
      setAuthError(""); // Clear any previous errors
      // Set success message
      setTimeout(() => {
        setAuthError("");
        navigate("/login", {
          state: {
            message:
              "Account created! Please check your email and verify your account before logging in.",
            type: "success",
          },
        });
      }, 2000);

      // Show immediate success feedback
      setAuthError(
        "Account created successfully! Please check your email for verification link. Redirecting to login..."
      );
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      setAuthError(errorMessage);

      // Set specific field errors if needed
      if (error.code === "auth/email-already-in-use") {
        setError("email", {
          message: "An account with this email already exists",
        });
      } else if (error.code === "auth/weak-password") {
        setError("password", { message: "Password is too weak" });
      } else if (error.code === "auth/invalid-email") {
        setError("email", { message: "Invalid email address" });
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Sign up for a new account</p>
        </div>

        {authError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your display name"
              className={errors.displayName ? "border-red-500" : ""}
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-sm text-red-600">
                {errors.displayName.message}
              </p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={errors.password ? "border-red-500" : ""}
              {...register("password")}
            />
            {/* Password Strength Indicator */}
            {password && passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        passwordStrength.strength === "weak"
                          ? "w-1/3 bg-red-500"
                          : passwordStrength.strength === "medium"
                          ? "w-2/3 bg-yellow-500"
                          : "w-full bg-green-500"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength.strength === "weak"
                        ? "text-red-600"
                        : passwordStrength.strength === "medium"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {passwordStrength.strength.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(passwordStrength.checks).map(
                      ([check, passed]) => (
                        <span
                          key={check}
                          className={`flex items-center gap-1 ${
                            passed ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {passed ? "✓" : "○"}
                          {check === "length" && "8+ chars"}
                          {check === "uppercase" && "A-Z"}
                          {check === "lowercase" && "a-z"}
                          {check === "number" && "0-9"}
                          {check === "special" && "!@#$"}
                          {check === "noRepeating" && "No repeats"}
                          {check === "notCommon" && "Not common"}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              className={errors.confirmPassword ? "border-red-500" : ""}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agreeToTerms"
                className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  errors.agreeToTerms ? "border-red-500" : ""
                }`}
                {...register("agreeToTerms")}
              />
              <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600">
                {errors.agreeToTerms.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
