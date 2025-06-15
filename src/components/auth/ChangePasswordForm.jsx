import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import {
  changePasswordSchema,
  validatePasswordStrength,
} from "../../lib/schemas";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription } from "../ui/Alert";
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ChangePasswordForm = ({ onSuccess, onCancel }) => {
  const { changePassword, user, getAuthProvider } = useAuth();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChanging, setIsChanging] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const authProvider = getAuthProvider(user);
  const isOAuthUser = ["google", "twitter", "facebook", "github"].includes(
    authProvider
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const newPassword = watch("newPassword");
  const passwordStrength = newPassword
    ? validatePasswordStrength(newPassword)
    : null;

  // If user is OAuth, show informational message
  if (isOAuthUser) {
    return (
      <div className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <ShieldCheckIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">
                Password managed by{" "}
                {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}
              </p>
              <p className="text-sm">
                Your account is secured through{" "}
                {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}{" "}
                authentication. To change your password, please visit your{" "}
                {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}{" "}
                account settings.
              </p>
              {authProvider === "google" && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://myaccount.google.com/security",
                        "_blank"
                      )
                    }
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Open Google Account Security
                  </Button>
                </div>
              )}
              {authProvider === "twitter" && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://twitter.com/settings/password",
                        "_blank"
                      )
                    }
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Open Twitter Settings
                  </Button>
                </div>
              )}
              {authProvider === "github" && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://github.com/settings/security",
                        "_blank"
                      )
                    }
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Open GitHub Security Settings
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const onSubmit = async (data) => {
    try {
      setIsChanging(true);
      setChangeError("");
      setSuccessMessage("");

      await changePassword(data.currentPassword, data.newPassword);

      setSuccessMessage("Password changed successfully!");
      reset();

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error("Password change failed:", error);

      let errorMessage = "Failed to change password. Please try again.";
      let fieldError = null;

      // Handle specific Firebase auth errors
      if (
        error.code === "auth/wrong-password" ||
        error.message.includes("wrong-password") ||
        error.message.includes("credential")
      ) {
        errorMessage = "Current password is incorrect. Please try again.";
        fieldError = {
          field: "currentPassword",
          message: "Incorrect password",
        };
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "New password is too weak. Please choose a stronger password.";
        fieldError = { field: "newPassword", message: "Password too weak" };
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Please log out and log back in before changing your password.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Set field-specific error if applicable
      if (fieldError) {
        setError(fieldError.field, { message: fieldError.message });
      }

      setChangeError(errorMessage);
    } finally {
      setIsChanging(false);
    }
  };

  const handleCancel = () => {
    reset();
    setChangeError("");
    setSuccessMessage("");
    onCancel?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Change Password
          </h3>
          <p className="text-sm text-slate-600">
            Update your password to keep your account secure
          </p>
        </div>
      </div>

      {changeError && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{changeError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <ShieldCheckIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Password */}
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showPasswords.current ? "text" : "password"}
              placeholder="Enter your current password"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={
                errors.currentPassword ? "border-red-500 pr-10" : "pr-10"
              }
              {...register("currentPassword", {
                onChange: () => {
                  if (changeError) setChangeError("");
                },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => togglePasswordVisibility("current")}
            >
              {showPasswords.current ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-sm text-red-600">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPasswords.new ? "text" : "password"}
              placeholder="Enter your new password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
              {...register("newPassword", {
                onChange: () => {
                  if (changeError) setChangeError("");
                },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => togglePasswordVisibility("new")}
            >
              {showPasswords.new ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-sm text-red-600">{errors.newPassword.message}</p>
          )}

          {/* Password Strength Indicator */}
          {newPassword && passwordStrength && (
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
              {passwordStrength.suggestions.length > 0 && (
                <div className="text-xs text-slate-600 space-y-1">
                  {passwordStrength.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="text-slate-400">•</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmNewPassword"
              type={showPasswords.confirm ? "text" : "password"}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={
                errors.confirmNewPassword ? "border-red-500 pr-10" : "pr-10"
              }
              {...register("confirmNewPassword", {
                onChange: () => {
                  if (changeError) setChangeError("");
                },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => togglePasswordVisibility("confirm")}
            >
              {showPasswords.confirm ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmNewPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        {/* Security Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-800">
            Password Security Tips:
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Use a mix of uppercase, lowercase, numbers, and symbols</li>
            <li>• Avoid common words, personal information, or patterns</li>
            <li>• Make it at least 8 characters long</li>
            <li>• Don't reuse passwords from other accounts</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isChanging || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isChanging || isSubmitting || !!successMessage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isChanging ? "Changing Password..." : "Change Password"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
