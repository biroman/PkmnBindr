import { useState, useEffect } from "react";
import {
  FolderIcon,
  PlusIcon,
  CloudIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import SyncStatus from "../sync/SyncStatus";

const BinderListWithSync = ({ onSelectBinder, onCreateBinder }) => {
  const {
    binders,
    currentBinder,
    syncStatus,
    syncBinderToCloud,
    downloadBinderFromCloud,
    getAllCloudBinders,
    deleteBinderFromCloud,
    deleteBinder,
    autoSyncCloudBinders,
  } = useBinderContext();
  const { user } = useAuth();
  const [cloudBinders, setCloudBinders] = useState([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [showCloudBinders, setShowCloudBinders] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    if (user && showCloudBinders) {
      loadCloudBinders();
    }
  }, [user, showCloudBinders]);

  const loadCloudBinders = async () => {
    try {
      setIsLoadingCloud(true);
      const cloudBinderList = await getAllCloudBinders();
      setCloudBinders(cloudBinderList);
    } catch (error) {
      console.error("Failed to load cloud binders:", error);
      toast.error("Failed to load cloud binders");
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleSyncToCloud = async (binderId) => {
    try {
      await syncBinderToCloud(binderId);
      toast.success("Binder synced to cloud successfully!");
      if (showCloudBinders) {
        await loadCloudBinders();
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error(error.message || "Failed to sync to cloud");
    }
  };

  const handleDownloadFromCloud = async (binderId) => {
    try {
      await downloadBinderFromCloud(binderId);
      toast.success("Binder downloaded from cloud successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download from cloud");
    }
  };

  const handleDeleteFromCloud = async (binderId, binderName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${binderName}" from the cloud? This cannot be undone.`
      )
    ) {
      try {
        await deleteBinderFromCloud(binderId);
        toast.success("Binder deleted from cloud");
        await loadCloudBinders();
      } catch (error) {
        console.error("Delete failed:", error);
        toast.error(error.message || "Failed to delete from cloud");
      }
    }
  };

  const handleDeleteLocal = async (binderId, binderName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${binderName}" from your device? This cannot be undone.`
      )
    ) {
      try {
        await deleteBinder(binderId);
        toast.success("Binder deleted locally");
      } catch (error) {
        console.error("Delete failed:", error);
        toast.error(error.message || "Failed to delete binder");
      }
    }
  };

  const getSyncStatusBadge = (binder) => {
    const status = binder.sync?.status || "local";
    const binderSyncStatus = syncStatus[binder.id];

    if (
      binderSyncStatus?.status === "syncing" ||
      binderSyncStatus?.status === "downloading"
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
          <ArrowPathIcon className="w-3 h-3 animate-spin" />
          {binderSyncStatus.status}
        </span>
      );
    }

    switch (status) {
      case "synced":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <CloudIcon className="w-3 h-3" />
            Synced
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            ⚠️ Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            📱 Local
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isLocalBinder = (binderId) => {
    return binders.some((b) => b.id === binderId);
  };

  const handleManualSync = async () => {
    if (!user) {
      toast.error("Please sign in to sync");
      return;
    }

    try {
      setIsManualSyncing(true);
      await autoSyncCloudBinders();
      toast.success("Manual sync completed!");

      // Also refresh cloud binders view if it's open
      if (showCloudBinders) {
        await loadCloudBinders();
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      toast.error("Manual sync failed");
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Binders</h1>
        <div className="flex gap-3">
          {user && (
            <>
              <button
                onClick={handleManualSync}
                disabled={isManualSyncing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync all cloud binders to this device"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${isManualSyncing ? "animate-spin" : ""}`}
                />
                {isManualSyncing ? "Syncing..." : "Sync All"}
              </button>
              <button
                onClick={() => setShowCloudBinders(!showCloudBinders)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showCloudBinders
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CloudIcon className="w-4 h-4" />
                {showCloudBinders ? "Hide Cloud" : "Show Cloud"}
              </button>
            </>
          )}
          <button
            onClick={onCreateBinder}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Binder
          </button>
        </div>
      </div>

      {/* Local Binders */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Local Binders
        </h2>
        {binders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No binders yet</p>
            <button
              onClick={onCreateBinder}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create your first binder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {binders.map((binder) => (
              <div
                key={binder.id}
                className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  currentBinder?.id === binder.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onSelectBinder(binder)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {binder.metadata?.name || "Untitled Binder"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {Object.keys(binder.cards || {}).length} cards
                    </p>
                  </div>
                  {getSyncStatusBadge(binder)}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Created {formatDate(binder.metadata?.createdAt)}</span>
                  <span>v{binder.version || 1}</span>
                </div>

                {user && (
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleSyncToCloud(binder.id)}
                      disabled={syncStatus[binder.id]?.status === "syncing"}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium hover:bg-blue-200 disabled:opacity-50"
                    >
                      <CloudArrowUpIcon className="w-3 h-3" />
                      Sync
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteLocal(binder.id, binder.metadata?.name)
                      }
                      className="flex items-center justify-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium hover:bg-red-200"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud Binders */}
      {user && showCloudBinders && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Cloud Binders
            </h2>
            <button
              onClick={loadCloudBinders}
              disabled={isLoadingCloud}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isLoadingCloud ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {isLoadingCloud ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading cloud binders...</p>
            </div>
          ) : cloudBinders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <CloudIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No binders in the cloud</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloudBinders.map((binder) => (
                <div
                  key={binder.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {binder.metadata?.name || "Untitled Binder"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {Object.keys(binder.cards || {}).length} cards
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      <CloudIcon className="w-3 h-3" />
                      Cloud
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>
                      Synced{" "}
                      {formatDate(
                        binder.sync?.lastSynced || binder.lastModified
                      )}
                    </span>
                    <span>v{binder.version || 1}</span>
                  </div>

                  <div className="flex gap-2">
                    {isLocalBinder(binder.id) ? (
                      <button
                        onClick={() => handleDownloadFromCloud(binder.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium hover:bg-green-200"
                      >
                        <CloudArrowDownIcon className="w-3 h-3" />
                        Update Local
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadFromCloud(binder.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium hover:bg-blue-200"
                      >
                        <CloudArrowDownIcon className="w-3 h-3" />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleDeleteFromCloud(binder.id, binder.metadata?.name)
                      }
                      className="flex items-center justify-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium hover:bg-red-200"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!user && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <CloudIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Sign in to sync your binders
          </h3>
          <p className="text-blue-700 mb-4">
            Create an account to sync your binders across devices and never lose
            your collection.
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      )}
    </div>
  );
};

export default BinderListWithSync;
