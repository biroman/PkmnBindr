import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Alert, AlertDescription } from "../components/ui/Alert";
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ProfilePage = () => {
  const { user, deleteAccount, getAuthProvider } = useAuth();
  const navigate = useNavigate();

  // Account deletion state
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: initial, 2: confirmation, 3: password
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const authProvider = getAuthProvider(user);
  const isOAuthUser = authProvider === "google" || authProvider === "twitter";
  const requiredConfirmationText = "DELETE MY ACCOUNT";

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError("");

      // For OAuth users, pass null since they don't need password
      // For email users, pass the password
      await deleteAccount(isOAuthUser ? null : deletePassword);

      // Redirect to home page after successful deletion
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError(error.message);

      // Clear password field if it was a password-related error (email users only)
      if (
        !isOAuthUser &&
        (error.message.includes("password") ||
          error.message.includes("credential"))
      ) {
        setDeletePassword("");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteFlow = () => {
    setDeleteStep(1);
    setDeletePassword("");
    setConfirmationText("");
    setDeleteError("");
    setShowDeleteSection(false);
  };

  // Check if current error is password-related
  const isPasswordError =
    deleteError &&
    (deleteError.includes("password") ||
      deleteError.includes("credential") ||
      deleteError.includes("Incorrect password"));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.displayName || "Not set"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Verified
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user?.emailVerified
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user?.emailVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
            </div>

            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {authProvider === "google"
                      ? "Google Account"
                      : authProvider === "twitter"
                      ? "Twitter Account"
                      : "Email Account"}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-6 border-t">
              <Button variant="outline">Edit Profile (Coming Soon)</Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Danger Zone
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  Irreversible and destructive actions
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!showDeleteSection ? (
              // Initial delete account button
              <div className="flex items-start justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start">
                  <TrashIcon className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">
                      Delete Account
                    </h4>
                    <p className="text-red-700 text-sm mt-1">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <div className="mt-3 space-y-1 text-xs text-red-600">
                      <p>
                        • All your binders and cards will be permanently deleted
                      </p>
                      <p>• Your account history and activity will be removed</p>
                      <p>• This action cannot be reversed</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDeleteSection(true)}
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100 hover:border-red-400"
                >
                  Delete Account
                </Button>
              </div>
            ) : (
              // Delete account flow
              <div className="space-y-6">
                {/* Header with close button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShieldExclamationIcon className="w-6 h-6 text-red-600 mr-3" />
                    <h4 className="text-lg font-semibold text-red-900">
                      Delete Account Permanently
                    </h4>
                  </div>
                  <button
                    onClick={resetDeleteFlow}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {deleteError && (
                  <Alert variant="destructive">
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}

                {/* Step 1: Final warning */}
                {deleteStep === 1 && (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>
                          This action is permanent and cannot be undone.
                        </strong>
                        <br />
                        All your data including binders, cards, and account
                        history will be permanently deleted.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-900 mb-2">
                        Before you delete your account:
                      </h5>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Remember that this action cannot be reversed</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => setDeleteStep(2)}
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-100"
                      >
                        I understand, continue
                      </Button>
                      <Button onClick={resetDeleteFlow} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Confirmation text */}
                {deleteStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="confirmation">
                        Type <strong>"{requiredConfirmationText}"</strong> to
                        confirm deletion:
                      </Label>
                      <Input
                        id="confirmation"
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder={requiredConfirmationText}
                        className="mt-2 font-mono"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => setDeleteStep(3)}
                        disabled={confirmationText !== requiredConfirmationText}
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-100 disabled:opacity-50"
                      >
                        Continue
                      </Button>
                      <Button onClick={resetDeleteFlow} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Authentication confirmation */}
                {deleteStep === 3 && (
                  <div className="space-y-4">
                    {!isOAuthUser ? (
                      // Email users: password input
                      <div>
                        <Label htmlFor="password">
                          Enter your password to confirm deletion:
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => {
                            setDeletePassword(e.target.value);
                            // Clear error when user starts typing
                            if (deleteError) setDeleteError("");
                          }}
                          placeholder="Enter your current password"
                          className={`mt-2 ${
                            isPasswordError
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : ""
                          }`}
                        />
                        {isPasswordError && (
                          <p className="text-sm text-red-600 mt-2 flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            {deleteError}
                          </p>
                        )}
                      </div>
                    ) : (
                      // OAuth users: re-authentication instructions
                      <div className="space-y-3">
                        <Alert>
                          <ShieldExclamationIcon className="w-4 h-4" />
                          <AlertDescription>
                            <strong>Re-authentication Required</strong>
                            <br />
                            For security, you'll need to sign in again with{" "}
                            <span className="font-semibold">
                              {authProvider === "google" ? "Google" : "Twitter"}
                            </span>{" "}
                            to confirm account deletion.
                          </AlertDescription>
                        </Alert>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">
                            What happens next:
                          </h5>
                          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Click "Delete My Account" below</li>
                            <li>
                              A pop-up will open asking you to sign in with{" "}
                              {authProvider === "google" ? "Google" : "Twitter"}
                            </li>
                            <li>
                              Complete the sign-in process to verify your
                              identity
                            </li>
                            <li>
                              Your account will then be permanently deleted
                            </li>
                          </ol>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={
                          isDeleting || (!isOAuthUser && !deletePassword)
                        }
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isDeleting
                          ? "Deleting..."
                          : isOAuthUser
                          ? `Re-authenticate & Delete Account`
                          : "Delete My Account"}
                      </Button>
                      <Button
                        onClick={resetDeleteFlow}
                        variant="outline"
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
