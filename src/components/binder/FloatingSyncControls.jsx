import { useState } from "react";
import {
  CloudArrowUpIcon,
  CloudIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import RevertConfirmationModal from "./RevertConfirmationModal";

/**
 * FloatingSyncControls
 * Displays Save and Revert actions in a fixed bottom-right panel.
 * Visible when the main settings sidebar is collapsed so users can
 * still commit or discard changes without reopening the sidebar.
 */
const FloatingSyncControls = ({ binder }) => {
  // Early exit if binder is not yet available
  if (!binder) return null;

  const { user } = useAuth();
  const { saveBinderToCloud, downloadBinderFromCloud, syncStatus } =
    useBinderContext();

  // Local UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);

  // Derived state from context
  const binderSyncStatus = syncStatus[binder.id] || {};
  const syncState = binder?.sync?.status || "local";

  /* ------------------------------ Helpers ------------------------------ */
  const hasUnsyncedChanges = () => {
    // Local or error status indicates pending changes
    if (syncState === "local" || syncState === "error") return true;

    // Pending change queue
    if (binder?.sync?.pendingChanges?.length) return true;

    // Last modified newer than last synced
    if (binder?.lastModified && binder?.sync?.lastSynced) {
      return new Date(binder.lastModified) > new Date(binder.sync.lastSynced);
    }

    // Modified but never synced
    if (binder?.lastModified && !binder?.sync?.lastSynced) return true;

    return false;
  };

  const canRevert = () => {
    if (!user) return false;
    if (!hasUnsyncedChanges()) return false;
    return Boolean(binder?.sync?.lastSynced);
  };

  const getSyncIcon = () => {
    if (isSaving || binderSyncStatus.status === "saving") {
      return <ArrowPathIcon className="w-5 h-5 animate-spin" />;
    }

    switch (syncState) {
      case "synced":
        return <CloudIcon className="w-5 h-5" />;
      case "error":
      case "conflict":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <CloudArrowUpIcon className="w-5 h-5" />;
    }
  };

  const getSyncText = () => {
    if (isSaving || binderSyncStatus.status === "saving") return "Saving...";

    switch (syncState) {
      case "synced":
        return "Saved";
      case "error":
        return "Save Error";
      case "conflict":
        return "Conflict";
      default:
        return "Save to Cloud";
    }
  };

  const getSyncSubtext = () => {
    if (isSaving || binderSyncStatus.status === "saving")
      return "Please wait...";

    switch (syncState) {
      case "synced": {
        const last = binder.sync?.lastSynced;
        if (!last) return "Up to date";
        const diffMs = Date.now() - new Date(last).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
      }
      case "error":
        return binder.sync?.lastError || "Save failed";
      case "conflict":
        return binderSyncStatus.message || "Cloud version is newer";
      default:
        return user ? "Backup your binder" : "Sign in to save";
    }
  };

  const getButtonStyle = () => {
    if (!user)
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed";
    if (isSaving || binderSyncStatus.status === "saving")
      return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-wait";

    switch (syncState) {
      case "synced":
        return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900";
      case "error":
        return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900";
      case "conflict":
        return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  /* ------------------------------ Handlers ----------------------------- */
  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save to cloud");
      return;
    }
    if (!binder) {
      toast.error("No binder to save");
      return;
    }

    try {
      setIsSaving(true);
      await saveBinderToCloud(binder.id);
    } catch (err) {
      console.error("Save failed:", err);
      // saveBinderToCloud handles its own toasts
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevertClick = () => {
    if (!canRevert()) {
      // Non eligible cases already blocked by button disabled attr
      return;
    }
    setShowRevertModal(true);
  };

  const handleConfirmRevert = async () => {
    if (!binder?.id) {
      toast.error("No binder ID found");
      return;
    }
    if (isReverting) return;

    try {
      setIsReverting(true);
      setShowRevertModal(false);
      const result = await downloadBinderFromCloud(binder.id);
      if (result?.success) {
        toast.success("Successfully reverted to last saved version");
      } else {
        toast.success("Reverted to last saved version");
      }
    } catch (error) {
      console.error("Revert failed:", error);
      if (error.message?.includes("not found")) {
        toast.error("Cloud save not found. The binder may have been deleted.");
      } else if (error.message?.includes("permission")) {
        toast.error(
          "Permission denied. You may not have access to this binder."
        );
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("offline")
      ) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error(`Failed to revert: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsReverting(false);
    }
  };

  /* ------------------------------- Render ------------------------------ */
  return (
    <>
      {/* Action panel */}
      <div className="fixed bottom-3 right-3 z-40 flex flex-col gap-2 p-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!user || isSaving || binderSyncStatus.status === "saving"}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${getButtonStyle()}`}
          aria-label="Save binder to cloud"
          title={getSyncText()}
        >
          {getSyncIcon()}
          <span className="text-sm font-medium">{getSyncText()}</span>
        </button>

        {/* Revert */}
        {canRevert() && (
          <button
            onClick={handleRevertClick}
            disabled={
              isReverting || isSaving || binderSyncStatus.status === "saving"
            }
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Revert to last cloud save"
            title="Revert to last save"
          >
            {isReverting ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUturnLeftIcon className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {isReverting ? "Reverting..." : "Revert"}
            </span>
          </button>
        )}
      </div>

      {/* Confirmation modal */}
      <RevertConfirmationModal
        isOpen={showRevertModal}
        onClose={() => setShowRevertModal(false)}
        onConfirm={handleConfirmRevert}
        binderName={binder?.metadata?.name || "Unnamed Binder"}
        isLoading={isReverting}
      />
    </>
  );
};

export default FloatingSyncControls;
