import { useState, useEffect } from "react";
import {
  CloudIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { useBinder } from "../../services/binderSyncService";
import { useAuth } from "../../hooks/useAuth";

const SyncStatus = ({
  binder,
  onSyncComplete,
  onSyncError,
  compact = false,
  showControls = true,
}) => {
  const { user } = useAuth();
  const { syncToCloud, downloadFromCloud, checkSyncStatus } = useBinder();
  const [isLoading, setIsLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(null);
  const [conflictData, setConflictData] = useState(null);

  useEffect(() => {
    if (user && binder?.id) {
      checkCloudStatus();
    }
  }, [user, binder?.id]);

  const checkCloudStatus = async () => {
    try {
      const statusMap = await checkSyncStatus([binder.id]);
      const status = statusMap.get(binder.id);
      setCloudStatus(status);
    } catch (error) {
      console.error("Failed to check cloud status:", error);
    }
  };

  const handleSyncToCloud = async (options = {}) => {
    if (!user) {
      toast.error("Please sign in to sync to cloud");
      return;
    }

    if (!binder) {
      toast.error("No binder to sync");
      return;
    }

    setIsLoading(true);
    setConflictData(null);

    try {
      const result = await syncToCloud(binder, {
        resolveConflicts: true,
        ...options,
      });

      if (result.success) {
        toast.success(result.message || "Synced to cloud successfully!");
        onSyncComplete?.(result.binder);
        await checkCloudStatus();
      }
    } catch (error) {
      console.error("Sync failed:", error);

      if (error.code === "SYNC_CONFLICT") {
        setConflictData(error.conflict);
        toast.error("Sync conflict detected. Please resolve manually.");
      } else {
        toast.error(error.message || "Failed to sync to cloud");
      }

      onSyncError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!user) {
      toast.error("Please sign in to download from cloud");
      return;
    }

    setIsLoading(true);

    try {
      const result = await downloadFromCloud(binder.id);

      if (result.success) {
        toast.success("Downloaded from cloud successfully!");
        onSyncComplete?.(result.binder);
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download from cloud");
      onSyncError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceOverwrite = async () => {
    await handleSyncToCloud({ forceOverwrite: true });
  };

  const getSyncStatusIcon = () => {
    if (isLoading) {
      return <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />;
    }

    switch (binder?.sync?.status) {
      case "synced":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "pending":
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case "conflict":
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <CloudIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSyncStatusText = () => {
    if (isLoading) return "Syncing...";

    switch (binder?.sync?.status) {
      case "synced":
        const lastSynced = binder.sync.lastSynced;
        return lastSynced
          ? `Synced ${formatRelativeTime(lastSynced)}`
          : "Synced";
      case "pending":
        return "Sync pending";
      case "error":
        return `Sync error: ${binder.sync.lastError || "Unknown error"}`;
      case "conflict":
        return "Sync conflict";
      default:
        return "Local only";
    }
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const hasUnsyncedChanges = () => {
    return (
      binder?.sync?.status !== "synced" ||
      binder?.sync?.pendingChanges?.length > 0
    );
  };

  const isCloudNewer = () => {
    return cloudStatus?.cloudVersion > (binder?.version || 0);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getSyncStatusIcon()}
        <span className="text-sm text-gray-600">{getSyncStatusText()}</span>
        {showControls && hasUnsyncedChanges() && (
          <button
            onClick={handleSyncToCloud}
            disabled={isLoading || !user}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
          >
            Sync
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getSyncStatusIcon()}
          <span className="font-medium text-gray-900">Cloud Sync</span>
        </div>

        {cloudStatus?.existsInCloud && (
          <span className="text-xs text-gray-500">
            Cloud v{cloudStatus.cloudVersion}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">{getSyncStatusText()}</p>

        {/* Unsaved changes indicator */}
        {hasUnsyncedChanges() && (
          <div className="flex items-center gap-1 text-amber-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-xs">You have unsaved changes</span>
          </div>
        )}

        {/* Cloud newer indicator */}
        {isCloudNewer() && (
          <div className="flex items-center gap-1 text-blue-600">
            <CloudArrowDownIcon className="w-4 h-4" />
            <span className="text-xs">Cloud version is newer</span>
          </div>
        )}

        {/* Conflict resolution */}
        {conflictData && (
          <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-3">
            <h4 className="text-sm font-medium text-orange-800 mb-2">
              Sync Conflict Detected
            </h4>
            <p className="text-xs text-orange-700 mb-3">
              {conflictData.type === "version_newer_remote" &&
                "The cloud version is newer than your local version."}
              {conflictData.type === "content_different" &&
                "Your local changes conflict with cloud changes."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadFromCloud}
                disabled={isLoading}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Use Cloud Version
              </button>
              <button
                onClick={handleForceOverwrite}
                disabled={isLoading}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 disabled:opacity-50"
              >
                Use Local Version
              </button>
            </div>
          </div>
        )}

        {/* Sync controls */}
        {showControls && user && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleSyncToCloud}
              disabled={isLoading}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudArrowUpIcon className="w-4 h-4" />
              {isLoading ? "Syncing..." : "Save to Cloud"}
            </button>

            {cloudStatus?.existsInCloud && (
              <button
                onClick={handleDownloadFromCloud}
                disabled={isLoading}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                <CloudArrowDownIcon className="w-4 h-4" />
                Download
              </button>
            )}

            <button
              onClick={checkCloudStatus}
              disabled={isLoading}
              className="flex items-center gap-1 text-gray-600 px-2 py-1.5 text-sm hover:text-gray-800 disabled:opacity-50"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )}

        {/* Sign in prompt for guests */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
            <p className="text-sm text-blue-800">
              <a href="/login" className="font-medium hover:underline">
                Sign in
              </a>{" "}
              to sync your binders to the cloud and access them anywhere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;
