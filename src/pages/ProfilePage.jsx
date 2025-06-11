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
  UserCircleIcon,
  CheckBadgeIcon,
  XCircleIcon,
  CogIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ShieldCheckIcon,
  PencilIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";

const ProfilePage = () => {
  const { user, deleteAccount, getAuthProvider, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

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
      default:
        return "Email";
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
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
                User Settings
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
                <div className="bg-white rounded-lg p-4 shadow-lg border border-slate-200">
                  <div className="relative">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg relative overflow-hidden group">
                      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                      <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <CameraIcon className="w-3 h-3" /> Change Banner
                      </button>
                    </div>

                    {/* Profile Info */}
                    <div className="relative -mt-10 ml-4 flex items-end gap-4">
                      {/* Profile Picture */}
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-slate-100 p-1 shadow-md">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Profile"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                              {getUserInitials(user?.displayName, user?.email)}
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <CameraIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                    </div>
                  </div>
                  {/* User Details */}
                  <div className="mt-4 pt-8 border-t border-slate-200 p-4 rounded-b-lg bg-slate-50 -m-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-xl">
                        {user?.displayName || "User"}
                      </h4>
                      {user?.emailVerified && (
                        <CheckBadgeIcon
                          className="w-5 h-5 text-blue-500"
                          title="Verified"
                        />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      @
                      {user?.displayName?.toLowerCase().replace(/\s+/g, "") ||
                        user?.email?.split("@")[0] ||
                        "user"}
                    </p>

                    <div className="mt-4">
                      <h5 className="text-xs text-slate-400 font-bold uppercase">
                        About Me
                      </h5>
                      <p className="text-sm text-slate-700 mt-1 italic">
                        No status set yet.
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-200 text-slate-700">
                        <img
                          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                          alt="Pikachu"
                          className="w-4 h-4"
                        />
                        Pokemon Master
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-200 text-slate-700">
                        Early Supporter
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Customization */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Customize Profile
                    </h2>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 opacity-50">
                      <div>
                        <Label htmlFor="displayName" className="text-slate-400">
                          Display Name
                        </Label>
                        <Input
                          id="displayName"
                          type="text"
                          defaultValue={user?.displayName || ""}
                          className="mt-2"
                          disabled
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="customStatus"
                          className="text-slate-400"
                        >
                          Custom Status
                        </Label>
                        <Input
                          id="customStatus"
                          type="text"
                          placeholder="Set a status..."
                          className="mt-2"
                          disabled
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400">Banner</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Button variant="outline" disabled>
                            Upload Image
                          </Button>
                          <Button variant="ghost" disabled>
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-400">Avatar</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Button variant="outline" disabled>
                            Upload Image
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                      <p className="text-sm text-slate-500 italic">
                        Profile customization coming soon!
                      </p>
                      <Button disabled className="opacity-50">
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    My Account
                  </h2>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-800">
                          Email Address
                        </h3>
                        <p className="text-sm text-slate-600">{user?.email}</p>
                      </div>
                      {user?.emailVerified ? (
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
                        <p className="text-sm text-slate-600">••••••••</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className={isOAuthUser ? "" : "opacity-50"}
                      >
                        {isOAuthUser
                          ? `Managed by ${getProviderLabel(authProvider)}`
                          : "Change Password"}
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

export default ProfilePage;
