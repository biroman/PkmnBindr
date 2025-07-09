import { useState } from "react";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  CloudIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const LocalBinderWarning = ({ canCreateNewBinder = true }) => {
  const { user } = useAuth();
  const { getLocalOnlyBinders, claimLocalBinder, clearLocalOnlyBinders } =
    useBinderContext();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const localOnlyBinders = getLocalOnlyBinders();
  const canClaim = canCreateNewBinder;

  // Don't show if no local binders, user not signed in, or dismissed
  if (!user || localOnlyBinders.length === 0 || isDismissed) {
    return null;
  }

  const handleClaimAll = async () => {
    if (
      !window.confirm(
        `Claim all ${localOnlyBinders.length} local binders to your account? This will save them to the cloud and make them accessible only to you.`
      )
    ) {
      return;
    }

    try {
      setIsClaimingAll(true);
      for (const binder of localOnlyBinders) {
        await claimLocalBinder(binder.id);
      }
    } catch (error) {
      console.error("Failed to claim all binders:", error);
    } finally {
      setIsClaimingAll(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        `Permanently delete all ${localOnlyBinders.length} local binders? This action cannot be undone. These binders will be completely removed from this device.`
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);
      await clearLocalOnlyBinders();
    } catch (error) {
      console.error("Failed to clear binders:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-orange-900">
              Privacy & Security Notice
            </h3>
            <p className="text-orange-700 text-sm">
              Local binders from previous users detected
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-orange-400 hover:text-orange-600 p-1 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Main Message */}
        <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-orange-100">
          <div className="flex items-start gap-3">
            <UserGroupIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-orange-900 font-medium mb-2">
                Found {localOnlyBinders.length} binder
                {localOnlyBinders.length !== 1 ? "s" : ""} from other users
              </p>
              <p className="text-orange-800 text-sm leading-relaxed">
                These binders were created by other users on this shared device.
                For privacy and security, you can either{" "}
                <strong>claim them</strong> to save to your account or{" "}
                <strong>remove them</strong>
                to keep your workspace clean.
              </p>
            </div>
          </div>
        </div>

        {/* Binder List */}
        <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-orange-100">
          <h4 className="text-sm font-medium text-orange-900 mb-3 flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4" />
            Affected Binders:
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {localOnlyBinders.map((binder) => (
              <div
                key={binder.id}
                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-orange-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {binder.metadata?.name || "Unnamed Binder"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Object.keys(binder.cards || {}).length} cards • Created{" "}
                    {new Date(binder.metadata?.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => claimLocalBinder(binder.id)}
                    disabled={!canClaim}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium text-xs transition-colors ${
                      canClaim
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    title={
                      !canClaim
                        ? "Binder limit reached. Delete a binder to claim."
                        : "Claim"
                    }
                  >
                    <CloudIcon className="w-3 h-3" />
                    {canClaim ? "Claim" : "Limit Reached"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleClaimAll}
            disabled={isClaimingAll || !canClaim}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              canClaim
                ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title={
              !canClaim
                ? "Binder limit reached. Delete a binder to claim."
                : "Claim All"
            }
          >
            {isClaimingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Claiming All...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Claim All ({localOnlyBinders.length})
              </>
            )}
          </button>

          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
          >
            {isClearing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Removing All...
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4" />
                Remove All
              </>
            )}
          </button>

          <div className="flex-1 flex items-center justify-end">
            <p className="text-xs text-orange-700 bg-orange-100 px-3 py-2 rounded-lg">
              <strong>Tip:</strong> Claimed binders will sync to your cloud
              account
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-2 p-3 bg-orange-100 rounded-lg border border-orange-200">
          <ShieldCheckIcon className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-800 leading-relaxed">
            <strong>Privacy Protection:</strong> These binders are currently
            stored locally and may contain another user's personal collection.
            Taking action helps maintain privacy for all users on this device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocalBinderWarning;
