import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription } from "../ui/Alert";
import {
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Display name validation schema
const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name must be less than 50 characters")
  .refine(
    (name) => {
      // No offensive content (basic check)
      const blockedWords = [
        "admin",
        "root",
        "system",
        "null",
        "undefined",
        "moderator",
      ];
      return !blockedWords.some((word) => name.toLowerCase().includes(word));
    },
    {
      message: "Display name contains restricted words",
    }
  )
  .refine(
    (name) => {
      // Must contain at least one letter
      return /[a-zA-Z]/.test(name);
    },
    {
      message: "Display name must contain at least one letter",
    }
  )
  .refine(
    (name) => {
      // No excessive special characters
      const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
      return specialCharCount <= 3;
    },
    {
      message: "Display name contains too many special characters",
    }
  )
  .refine(
    (name) => {
      // No leading/trailing spaces
      return name.trim() === name;
    },
    {
      message: "Display name cannot start or end with spaces",
    }
  );

const changeDisplayNameSchema = z.object({
  displayName: displayNameSchema,
});

const ChangeDisplayNameForm = ({ currentDisplayName, onSuccess, onCancel }) => {
  const { updateDisplayName } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(changeDisplayNameSchema),
    defaultValues: {
      displayName: currentDisplayName || "",
    },
  });

  const displayName = watch("displayName");
  const hasChanged = displayName !== currentDisplayName;

  const onSubmit = async (data) => {
    try {
      setIsUpdating(true);
      setUpdateError("");
      setSuccessMessage("");

      // Check if name actually changed
      if (data.displayName === currentDisplayName) {
        setUpdateError("Please enter a different display name.");
        return;
      }

      await updateDisplayName(data.displayName);

      setSuccessMessage("Display name updated successfully!");

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        onSuccess?.(data.displayName);
      }, 1500);
    } catch (error) {
      console.error("Display name update failed:", error);

      let errorMessage = "Failed to update display name. Please try again.";

      if (error.message) {
        errorMessage = error.message;
      }

      setUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    reset();
    setUpdateError("");
    setSuccessMessage("");
    onCancel?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <UserIcon className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Change Display Name
          </h3>
          <p className="text-sm text-slate-600">
            Update how your name appears to other users
          </p>
        </div>
      </div>

      {updateError && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{updateError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Display Name */}
        <div className="space-y-2">
          <Label>Current Display Name</Label>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-800 font-medium">
              {currentDisplayName || "Not set"}
            </p>
          </div>
        </div>

        {/* New Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">New Display Name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter your new display name"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            className={errors.displayName ? "border-red-500" : ""}
            {...register("displayName", {
              onChange: () => {
                if (updateError) setUpdateError("");
              },
            })}
          />
          {errors.displayName && (
            <p className="text-sm text-red-600">{errors.displayName.message}</p>
          )}

          {/* Character count */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>{displayName?.length || 0}/50 characters</span>
            {hasChanged && (
              <span className="text-blue-600 font-medium">
                ✓ Ready to update
              </span>
            )}
          </div>
        </div>

        {/* Display Name Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-800">
            Display Name Guidelines:
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 2-50 characters in length</li>
            <li>• Must contain at least one letter</li>
            <li>• Avoid restricted words (admin, system, etc.)</li>
            <li>• No excessive special characters</li>
            <li>• Be respectful and appropriate</li>
          </ul>
        </div>

        {/* Preview */}
        {displayName && displayName !== currentDisplayName && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-800 mb-1">Preview:</p>
            <p className="text-slate-700">
              Your name will appear as:{" "}
              <span className="font-semibold">{displayName}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isUpdating || isSubmitting || !hasChanged || !!successMessage
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? "Updating..." : "Update Display Name"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangeDisplayNameForm;
