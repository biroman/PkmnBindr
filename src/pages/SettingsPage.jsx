import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useUserProfile from "../hooks/useUserProfile";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Alert, AlertDescription } from "../components/ui/Alert";
import UserProfileCard from "../components/ui/UserProfileCard";
import ChangePasswordForm from "../components/auth/ChangePasswordForm";
import ChangeDisplayNameForm from "../components/auth/ChangeDisplayNameForm";
import SecuritySettings from "../components/auth/SecuritySettings";
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  TrashIcon,
  XMarkIcon,
  UserCircleIcon,
  XCircleIcon,
  CogIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ShieldCheckIcon,
  PencilIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

const SettingsPage = () => {
  const { user, deleteAccount, getAuthProvider, logout } = useAuth();
  const { userProfile, updateUserProfile } = useUserProfile(user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  // Account deletion state
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: initial, 2: confirmation, 3: password
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Display name change state
  const [showChangeDisplayName, setShowChangeDisplayName] = useState(false);

  const authProvider = getAuthProvider(user);
  const isOAuthUser = ["google", "twitter", "facebook", "github"].includes(
    authProvider
  );
  const requiredConfirmationText = "DELETE MY ACCOUNT";

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await deleteAccount(isOAuthUser ? null : deletePassword);
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError(error.message);
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

  const isPasswordError =
    deleteError &&
    (deleteError.includes("password") ||
      deleteError.includes("credential") ||
      deleteError.includes("Incorrect password"));

  const getUserInitials = (name, email) => {
    if (name)
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "U";
  };

  const getProviderLabel = (provider) => {
    switch (provider) {
      case "google":
        return "Google";
      case "twitter":
        return "Twitter";
      case "facebook":
        return "Facebook";
      case "github":
        return "GitHub";
      default:
        return "Email";
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const handleImageUpdate = (newImageUrl) => {
    updateUserProfile({ photoURL: newImageUrl });
  };

  const handleStatusUpdate = (newStatus) => {
    updateUserProfile({ customStatus: newStatus });
  };

  const handleBannerUpdate = (newBannerColor) => {
    updateUserProfile({ bannerColor: newBannerColor });
  };

  const NavItem = ({ icon, label, tabName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
        activeTab === tabName
          ? "bg-slate-300 text-slate-800"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-3 space-y-1">
              <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Account Settings
              </h3>
              <NavItem
                icon={<UserIcon className="w-5 h-5" />}
                label="Profile"
                tabName="profile"
              />
              <NavItem
                icon={<UserCircleIcon className="w-5 h-5" />}
                label="My Account"
                tabName="account"
              />
              <NavItem
                icon={<ShieldCheckIcon className="w-5 h-5" />}
                label="Security"
                tabName="security"
              />
              <NavItem
                icon={<EyeIcon className="w-5 h-5" />}
                label="Privacy & Safety"
                tabName="privacy"
              />
              <div className="!my-3 border-t border-slate-200"></div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="ml-3">Log Out</span>
              </button>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Public Profile Preview */}
                <UserProfileCard
                  user={userProfile}
                  onImageUpdate={handleImageUpdate}
                  onStatusUpdate={handleStatusUpdate}
                  onBannerUpdate={handleBannerUpdate}
                  size="medium"
                  editable={true}
                />
              </div>
            )}

            {activeTab === "account" && (
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    My Account
                  </h2>
                  <div className="mt-6 space-y-4">
                    {/* Display Name */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-800">
                          Display Name
                        </h3>
                        <p className="text-sm text-slate-600">
                          {userProfile?.displayName ||
                            user?.displayName ||
                            "Not set"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChangeDisplayName(true)}
                        className="flex items-center gap-2"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>

                    {/* Email Address */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-800">
                          Email Address
                        </h3>
                        <p className="text-sm text-slate-600">
                          {userProfile?.email}
                        </p>
                      </div>
                      {userProfile?.emailVerified ? (
                        <span className="text-sm font-medium text-green-600">
                          Verified
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="opacity-50"
                        >
                          Resend Verification
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-800">Password</h3>
                        <p className="text-sm text-slate-600">
                          {isOAuthUser
                            ? `Managed by ${getProviderLabel(authProvider)}`
                            : "••••••••"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChangePassword(true)}
                        className="flex items-center gap-2"
                      >
                        <KeyIcon className="w-4 h-4" />
                        {isOAuthUser ? "View Settings" : "Change Password"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-red-200">
                  <div className="bg-red-50/50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-semibold text-red-800">
                          Delete Account
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          Permanently delete your account. This action is not
                          reversible.
                        </p>
                        <Button
                          onClick={() => setShowDeleteSection(true)}
                          variant="destructive"
                          size="sm"
                          className="mt-3"
                        >
                          Proceed with Deletion...
                        </Button>
                      </div>
                    </div>

                    {showDeleteSection && (
                      <div className="mt-4 pt-4 border-t border-red-200 space-y-4">
                        {deleteError && (
                          <Alert variant="destructive">
                            <AlertDescription>{deleteError}</AlertDescription>
                          </Alert>
                        )}

                        {deleteStep === 1 && (
                          <>
                            <p className="text-sm text-red-900 font-medium">
                              Are you sure? This will delete all your data.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setDeleteStep(2)}
                                variant="destructive"
                              >
                                I'm sure, delete my account
                              </Button>
                              <Button onClick={resetDeleteFlow} variant="ghost">
                                Cancel
                              </Button>
                            </div>
                          </>
                        )}
                        {deleteStep === 2 && (
                          <div>
                            <Label
                              htmlFor="confirmation"
                              className="text-red-900"
                            >
                              Type "{requiredConfirmationText}" to confirm
                            </Label>
                            <Input
                              id="confirmation"
                              type="text"
                              value={confirmationText}
                              onChange={(e) =>
                                setConfirmationText(e.target.value)
                              }
                              className="mt-1"
                            />
                            <Button
                              onClick={() => setDeleteStep(3)}
                              disabled={
                                confirmationText !== requiredConfirmationText
                              }
                              className="mt-2"
                              variant="destructive"
                            >
                              Continue
                            </Button>
                          </div>
                        )}
                        {deleteStep === 3 && (
                          <div>
                            {!isOAuthUser ? (
                              <>
                                <Label htmlFor="password">
                                  Enter your password
                                </Label>
                                <Input
                                  id="password"
                                  type="password"
                                  value={deletePassword}
                                  onChange={(e) =>
                                    setDeletePassword(e.target.value)
                                  }
                                  className="mt-1"
                                />
                              </>
                            ) : (
                              <p className="text-sm p-3 bg-blue-100 text-blue-800 rounded-lg">
                                You will be prompted to re-authenticate with{" "}
                                {getProviderLabel(authProvider)} to finalize the
                                deletion.
                              </p>
                            )}
                            <Button
                              onClick={handleDeleteAccount}
                              disabled={
                                isDeleting || (!isOAuthUser && !deletePassword)
                              }
                              className="mt-2"
                              variant="destructive"
                            >
                              {isDeleting ? "Deleting..." : "Complete Deletion"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Modal/Form */}
            {showChangePassword && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <ChangePasswordForm
                      onSuccess={() => {
                        setShowChangePassword(false);
                      }}
                      onCancel={() => {
                        setShowChangePassword(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Change Display Name Modal/Form */}
            {showChangeDisplayName && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <ChangeDisplayNameForm
                      currentDisplayName={
                        userProfile?.displayName || user?.displayName
                      }
                      onSuccess={(newDisplayName) => {
                        setShowChangeDisplayName(false);
                        // Optionally trigger a refresh or update the local state
                      }}
                      onCancel={() => {
                        setShowChangeDisplayName(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && <SecuritySettings />}

            {activeTab === "privacy" && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  Privacy & Safety
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Control who can see your activity and binders.
                </p>

                <div className="mt-6 pt-6 border-t border-slate-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800">
                        Profile Visibility
                      </h3>
                      <p className="text-sm text-slate-600">
                        Decide if your profile is public or private.
                      </p>
                    </div>
                    <Button variant="outline" disabled className="opacity-50">
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800">
                        Binder Visibility
                      </h3>
                      <p className="text-sm text-slate-600">
                        Set default visibility for new binders you create.
                      </p>
                    </div>
                    <Button variant="outline" disabled className="opacity-50">
                      Manage
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 italic text-center">
                      Privacy settings will be available in a future update
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
