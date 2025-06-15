import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import useUserProfile from "../../hooks/useUserProfile";
import { Button } from "../ui/Button";
import { Alert, AlertDescription } from "../ui/Alert";
import ChangePasswordForm from "./ChangePasswordForm";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const SecuritySettings = () => {
  const { user, getAuthProvider } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const authProvider = getAuthProvider(user);
  const isOAuthUser = ["google", "twitter", "facebook", "github"].includes(
    authProvider
  );

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

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  if (showChangePassword) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <ChangePasswordForm
          onSuccess={() => setShowChangePassword(false)}
          onCancel={() => setShowChangePassword(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Security Overview
            </h2>
            <p className="text-sm text-slate-600">
              Manage your account security settings and monitor security
              activity
            </p>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-800">Security Checklist</h3>

          <div className="space-y-3">
            {/* Email Verification */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {user?.emailVerified ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-600" />
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-800">Email Verification</p>
                <p className="text-sm text-slate-600">
                  {user?.emailVerified
                    ? "Your email address is verified"
                    : "Please verify your email address"}
                </p>
              </div>
            </div>

            {/* Password Security */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {isOAuthUser ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : userProfile?.securityFlags?.lastPasswordChange ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-yellow-600" />
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-800">Password Security</p>
                <p className="text-sm text-slate-600">
                  {isOAuthUser
                    ? `Secured via ${getProviderLabel(authProvider)}`
                    : `Last changed: ${formatDate(
                        userProfile?.securityFlags?.lastPasswordChange
                      )}`}
                </p>
              </div>
              {!isOAuthUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePassword(true)}
                  className="flex items-center gap-2"
                >
                  <KeyIcon className="w-4 h-4" />
                  Change
                </Button>
              )}
            </div>

            {/* Account Activity */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {userProfile?.securityFlags?.suspiciousActivity ? (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-800">Account Activity</p>
                <p className="text-sm text-slate-600">
                  {userProfile?.securityFlags?.suspiciousActivity
                    ? "Suspicious activity detected"
                    : "No suspicious activity detected"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {userProfile?.lastLoginAt && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="font-medium text-slate-800 mb-3">Recent Activity</h3>
            <div className="text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Last login: {formatDate(userProfile.lastLoginAt?.toDate?.())}
                </span>
              </div>
              {userProfile.loginCount && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center">
                    #{userProfile.loginCount}
                  </span>
                  <span>Total logins: {userProfile.loginCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;
