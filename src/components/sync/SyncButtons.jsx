import { useState } from "react";
import {
  CloudArrowUpIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
  CloudIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuth";
import { useBinderContext } from "../../contexts/BinderContext";
import { toast } from "react-hot-toast";

const MobileSyncButtons = ({
  binder,
  onShowRevertModal,
  isReverting,
  className = "",
}) => {
  const { saveBinderToCloud, syncStatus } = useBinderContext();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const binderSyncStatus = syncStatus[binder?.id];
  const syncState = binder?.sync?.status || "local";

  const handleSaveToCloud = async () => {
    if (!user) {
      toast.error("Please sign in to save to cloud");
      return;
    }

    if (!binder) {
      toast.error("No binder to save");
      return;
    }

    setIsLoading(true);
    try {
      await saveBinderToCloud(binder.id);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToLastSave = () => {
    if (!user) {
      toast.error("Please sign in to revert changes");
      return;
    }

    if (!binder?.id) {
      toast.error("No binder available to revert");
      return;
    }

    if (!binder.sync?.lastSynced) {
      toast.error(
        "No cloud save found. This binder has never been saved to the cloud."
      );
      return;
    }

    if (!hasUnsyncedChanges()) {
      toast.info("No unsaved changes to revert");
      return;
    }

    if (isReverting) {
      toast.info("Revert operation already in progress");
      return;
    }

    onShowRevertModal();
  };

  const getSyncIcon = () => {
    if (isLoading || binderSyncStatus?.status === "saving") {
      return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
    }

    switch (syncState) {
      case "synced":
        return <CloudIcon className="w-4 h-4" />;
      case "error":
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case "conflict":
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <CloudArrowUpIcon className="w-4 h-4" />;
    }
  };

  const getSyncButtonStyle = () => {
    if (!user) {
      return "bg-gray-100 text-gray-600 cursor-not-allowed";
    }

    if (isLoading || binderSyncStatus?.status === "saving") {
      return "bg-blue-100 text-blue-700 cursor-wait";
    }

    switch (syncState) {
      case "synced":
        return "bg-green-100 text-green-700 hover:bg-green-200";
      case "error":
        return "bg-red-100 text-red-700 hover:bg-red-200";
      case "conflict":
        return "bg-orange-100 text-orange-700 hover:bg-orange-200";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  const hasUnsyncedChanges = () => {
    if (syncState === "local" || syncState === "error") {
      return true;
    }

    if (binder?.sync?.pendingChanges?.length > 0) {
      return true;
    }

    if (binder?.lastModified && binder?.sync?.lastSynced) {
      const lastModified = new Date(binder.lastModified);
      const lastSynced = new Date(binder.sync.lastSynced);
      return lastModified > lastSynced;
    }

    if (binder?.lastModified && !binder?.sync?.lastSynced) {
      return true;
    }

    return false;
  };

  const canRevert = () => {
    if (!user) return false;
    if (!hasUnsyncedChanges()) return false;

    const hasCloudVersion =
      binder?.sync?.lastSynced &&
      (syncState === "synced" ||
        syncState === "error" ||
        syncState === "conflict" ||
        (syncState === "local" && binder.sync.lastSynced));

    return hasCloudVersion;
  };

  // Only show if there are unsaved changes
  if (!hasUnsyncedChanges()) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Save Button */}
      <button
        onClick={handleSaveToCloud}
        disabled={!user || isLoading || binderSyncStatus?.status === "saving"}
        className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${getSyncButtonStyle()}`}
        title="Save to Cloud"
      >
        {getSyncIcon()}
        <span className="ml-1.5">
          {isLoading || binderSyncStatus?.status === "saving"
            ? "Saving..."
            : "Save"}
        </span>
      </button>

      {/* Revert Button */}
      {canRevert() && (
        <button
          onClick={handleRevertToLastSave}
          disabled={
            isReverting ||
            isLoading ||
            binderSyncStatus?.status === "saving" ||
            binderSyncStatus?.status === "downloading" ||
            !binder?.sync?.lastSynced
          }
          className="flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Revert to Last Save"
        >
          {isReverting ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUturnLeftIcon className="w-4 h-4" />
          )}
          <span className="ml-1.5">
            {isReverting ? "Reverting..." : "Revert"}
          </span>
        </button>
      )}
    </div>
  );
};

export default MobileSyncButtons;
