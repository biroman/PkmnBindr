import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBinderContext } from "../contexts/BinderContext";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import LocalBinderWarning from "../components/binder/LocalBinderWarning";
import {
  PlusIcon,
  FolderIcon,
  EyeIcon,
  TrashIcon,
  Cog6ToothIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  ComputerDesktopIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

const BindersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    binders,
    currentBinder,
    isLoading,
    createBinder,
    deleteBinder,
    selectBinder,
    autoSyncCloudBinders,
    isLocalOnlyBinder,
    isOwnedByCurrentUser,
    claimLocalBinder,
  } = useBinderContext();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBinderName, setNewBinderName] = useState("");
  const [newBinderDescription, setNewBinderDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCreateBinder = async (e) => {
    e.preventDefault();
    if (!newBinderName.trim()) return;

    try {
      setIsCreating(true);
      await createBinder(newBinderName, newBinderDescription);
      setNewBinderName("");
      setNewBinderDescription("");
      setShowCreateForm(false);
    } catch (error) {
      // Error handled by context
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectBinder = (binder) => {
    navigate(`/binder/${binder.id}`);
  };

  const handleDeleteBinder = async (binderId, binderName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${binderName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteBinder(binderId);
      } catch (error) {
        // Error handled by context
      }
    }
  };

  const handleSyncFromCloud = async () => {
    if (!user) {
      toast.error("Please sign in to sync from cloud");
      return;
    }

    try {
      setIsSyncing(true);
      await autoSyncCloudBinders();
      // Don't show success toast here as autoSyncCloudBinders handles it
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Failed to sync from cloud");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync on page load if user is signed in
  useEffect(() => {
    const syncOnLoad = async () => {
      if (user && !isLoading) {
        try {
          setIsSyncing(true);
          await autoSyncCloudBinders();
        } catch (error) {
          console.error("Auto-sync on page load failed:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncOnLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // Only run when user changes

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading binders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Binders</h1>
              <p className="text-slate-300">
                Manage your Pokemon card collections
              </p>
            </div>
            {user && (
              <button
                onClick={handleSyncFromCloud}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync from Cloud"}
              </button>
            )}
          </div>
        </div>

        {/* Local Binder Warning */}
        <LocalBinderWarning />

        {/* Current Binder Info */}
        {currentBinder && (
          <div className="bg-blue-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="font-semibold">
                  Current Binder: {currentBinder.metadata.name}
                </div>
                <div className="text-blue-100 text-sm">
                  {Object.keys(currentBinder.cards || {}).length} cards • Last
                  updated{" "}
                  {new Date(currentBinder.lastModified).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => navigate(`/binder/${currentBinder.id}`)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Open Binder
              </button>
            </div>
          </div>
        )}

        {/* Create New Binder */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors group"
            >
              <PlusIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
              <span className="text-slate-600 group-hover:text-blue-600 font-medium">
                Create New Binder
              </span>
            </button>
          ) : (
            <form onSubmit={handleCreateBinder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Binder Name
                </label>
                <input
                  type="text"
                  value={newBinderName}
                  onChange={(e) => setNewBinderName(e.target.value)}
                  placeholder="My Pokemon Collection"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newBinderDescription}
                  onChange={(e) => setNewBinderDescription(e.target.value)}
                  placeholder="Description of your collection..."
                  rows="3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isCreating || !newBinderName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors"
                >
                  {isCreating ? "Creating..." : "Create Binder"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBinderName("");
                    setNewBinderDescription("");
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Binders Grid */}
        {binders.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Binders Yet
            </h3>
            <p className="text-slate-300 mb-4">
              {user
                ? "Create your first binder or sync your existing binders from the cloud"
                : "Create your first binder to start organizing your Pokemon cards"}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Your First Binder
              </button>
              {user && (
                <button
                  onClick={handleSyncFromCloud}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
                >
                  <CloudArrowDownIcon className="w-4 h-4" />
                  {isSyncing ? "Syncing..." : "Load from Cloud"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {binders.map((binder) => {
              const isLocalOnly = isLocalOnlyBinder(binder);
              const isOwned = isOwnedByCurrentUser(binder);

              return (
                <div
                  key={binder.id}
                  className={`
                    bg-white rounded-lg shadow-lg p-6 transition-all hover:shadow-xl
                    ${
                      currentBinder?.id === binder.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }
                    ${
                      isLocalOnly ? "opacity-75 border-2 border-orange-200" : ""
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {binder.metadata.name}
                        </h3>
                        {isLocalOnly && (
                          <div className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                            <ComputerDesktopIcon className="w-3 h-3" />
                            <span>Local Only</span>
                          </div>
                        )}
                      </div>
                      {binder.metadata.description && (
                        <p className="text-sm text-slate-600 mb-2">
                          {binder.metadata.description}
                        </p>
                      )}
                    </div>
                    {currentBinder?.id === binder.id && (
                      <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Current
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {Object.keys(binder.cards || {}).length}
                      </div>
                      <div className="text-xs text-slate-600">Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {binder.version}
                      </div>
                      <div className="text-xs text-slate-600">Version</div>
                    </div>
                  </div>

                  {/* Local-only claim option */}
                  {isLocalOnly && user && (
                    <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs text-orange-700 mb-2">
                        This binder belongs to another user. You can claim it to
                        save to your cloud account.
                      </p>
                      <button
                        onClick={() => claimLocalBinder(binder.id)}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                      >
                        <CloudArrowUpIcon className="w-3 h-3" />
                        <span>Claim Binder</span>
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSelectBinder(binder)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>Open</span>
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteBinder(binder.id, binder.metadata.name)
                      }
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                      Created{" "}
                      {new Date(binder.metadata.createdAt).toLocaleDateString()}
                    </div>
                    {binder.lastModified !== binder.metadata.createdAt && (
                      <div className="text-xs text-slate-500">
                        Updated{" "}
                        {new Date(binder.lastModified).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BindersPage;
