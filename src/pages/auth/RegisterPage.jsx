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
  const { signUp, signInWithGoogle, signInWithTwitter } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);

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

      // Account created successfully - redirect to login with success message
      navigate("/auth/login", {
        state: {
          message:
            "Account created successfully! Please check your email and verify your account before logging in.",
          type: "success",
        },
        replace: true,
      });
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

  const handleGoogleSignup = async () => {
    try {
      setIsLoadingSocial(true);
      setAuthError("");

      await signInWithGoogle();

      // OAuth signup successful - redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Google signup failed:", error);

      let errorMessage = "Google signup failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage =
          "Signup cancelled. Please try again if you want to continue.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked. Please allow pop-ups and try again.";
      }

      setAuthError(errorMessage);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  const handleTwitterSignup = async () => {
    try {
      setIsLoadingSocial(true);
      setAuthError("");

      await signInWithTwitter();

      // OAuth signup successful - redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Twitter signup failed:", error);

      let errorMessage = "Twitter signup failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage =
          "Signup cancelled. Please try again if you want to continue.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked. Please allow pop-ups and try again.";
      }

      setAuthError(errorMessage);
    } finally {
      setIsLoadingSocial(false);
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

        {/* Social Login Options */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleGoogleSignup}
            disabled={isLoadingSocial || isSubmitting}
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
            {isLoadingSocial ? "Signing up..." : "Continue with Google"}
          </Button>

          <Button
            onClick={handleTwitterSignup}
            disabled={isLoadingSocial || isSubmitting}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-11"
          >
            <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            {isLoadingSocial ? "Signing up..." : "Continue with Twitter"}
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
