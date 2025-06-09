import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBinderContext } from "../contexts/BinderContext";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import LocalBinderWarning from "../components/binder/LocalBinderWarning";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  QueueListIcon,
  CloudIcon,
  ComputerDesktopIcon,
  EyeIcon,
  TrashIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  FolderIcon,
  CalendarDaysIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

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

  // UI State
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'synced' | 'local' | 'guest'
  const [sortBy, setSortBy] = useState("modified"); // 'modified' | 'created' | 'name' | 'cards'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBinderName, setNewBinderName] = useState("");
  const [newBinderDescription, setNewBinderDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter and sort binders
  const filteredAndSortedBinders = useMemo(() => {
    let filtered = binders.filter((binder) => {
      // Search filter
      const matchesSearch =
        binder.metadata?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        binder.metadata?.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      switch (filterStatus) {
        case "synced":
          return !isLocalOnlyBinder(binder) && isOwnedByCurrentUser(binder);
        case "local":
          return isLocalOnlyBinder(binder) && binder.ownerId !== "local_user";
        case "guest":
          return binder.ownerId === "local_user";
        default:
          return true;
      }
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.metadata?.name || "").localeCompare(b.metadata?.name || "");
        case "created":
          return (
            new Date(b.metadata?.createdAt || 0) -
            new Date(a.metadata?.createdAt || 0)
          );
        case "cards":
          return (
            Object.keys(b.cards || {}).length -
            Object.keys(a.cards || {}).length
          );
        case "modified":
        default:
          return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
      }
    });

    return filtered;
  }, [
    binders,
    searchQuery,
    filterStatus,
    sortBy,
    isLocalOnlyBinder,
    isOwnedByCurrentUser,
  ]);

  // Stats
  const stats = useMemo(() => {
    const total = binders.length;
    const synced = binders.filter(
      (b) => !isLocalOnlyBinder(b) && isOwnedByCurrentUser(b)
    ).length;
    const localOnly = binders.filter(
      (b) => isLocalOnlyBinder(b) && b.ownerId !== "local_user"
    ).length;
    const guest = binders.filter((b) => b.ownerId === "local_user").length;
    const totalCards = binders.reduce(
      (sum, b) => sum + Object.keys(b.cards || {}).length,
      0
    );

    return { total, synced, localOnly, guest, totalCards };
  }, [binders, isLocalOnlyBinder, isOwnedByCurrentUser]);

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
  }, [user?.uid]);

  const getBinderStatus = (binder) => {
    if (binder.ownerId === "local_user") return "guest";
    if (isLocalOnlyBinder(binder)) return "local";
    return "synced";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "synced":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "local":
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />;
      case "guest":
        return <ComputerDesktopIcon className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "synced":
        return "Cloud Synced";
      case "local":
        return "Local Only";
      case "guest":
        return "Guest Binder";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-600">Loading your binders...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title and Stats */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Pokemon Binders
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" />
                  <span>{stats.total} binders</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  <span>{stats.totalCards} cards</span>
                </div>
                {user && (
                  <>
                    <div className="flex items-center gap-2">
                      <CloudIcon className="w-4 h-4 text-green-600" />
                      <span>{stats.synced} synced</span>
                    </div>
                    {stats.localOnly > 0 && (
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                        <span>{stats.localOnly} local only</span>
                      </div>
                    )}
                  </>
                )}
                {stats.guest > 0 && (
                  <div className="flex items-center gap-2">
                    <ComputerDesktopIcon className="w-4 h-4 text-blue-600" />
                    <span>{stats.guest} guest</span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                New Binder
              </button>
            </div>
          </div>
        </div>

        {/* Local Binder Warning */}
        <LocalBinderWarning />

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search binders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Binders</option>
                  {user && <option value="synced">Cloud Synced</option>}
                  {user && <option value="local">Local Only</option>}
                  <option value="guest">Guest Binders</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="modified">Last Modified</option>
                <option value="created">Date Created</option>
                <option value="name">Name A-Z</option>
                <option value="cards">Card Count</option>
              </select>

              <div className="flex items-center border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <QueueListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Binder Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Binder
            </h3>
            <form onSubmit={handleCreateBinder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Binder Name *
                  </label>
                  <input
                    type="text"
                    value={newBinderName}
                    onChange={(e) => setNewBinderName(e.target.value)}
                    placeholder="My Pokemon Collection"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newBinderDescription}
                    onChange={(e) => setNewBinderDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreating || !newBinderName.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
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
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Results Header */}
        {searchQuery || filterStatus !== "all" ? (
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              {filteredAndSortedBinders.length} of {binders.length} binders
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>
            {(searchQuery || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : null}

        {/* Binders Grid/List */}
        {filteredAndSortedBinders.length === 0 ? (
          <div className="text-center py-16">
            <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery || filterStatus !== "all"
                ? "No matching binders"
                : "No binders yet"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : user
                ? "Create your first binder to start organizing your Pokemon cards, or sync your existing binders from the cloud."
                : "Create your first binder to start organizing your Pokemon cards."}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Your First Binder
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {filteredAndSortedBinders.map((binder) => {
              const status = getBinderStatus(binder);
              const isLocalOnly = status === "local";
              const isGuestBinder = status === "guest";
              const cardCount = Object.keys(binder.cards || {}).length;

              if (viewMode === "list") {
                return (
                  <div
                    key={binder.id}
                    className={`bg-white rounded-lg border transition-all hover:shadow-md border-gray-200 hover:border-gray-300 ${
                      isLocalOnly ? "border-orange-200 bg-orange-50" : ""
                    } ${
                      isGuestBinder
                        ? "opacity-60 border-gray-300 bg-gray-50"
                        : ""
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3
                              className={`text-lg font-semibold truncate ${
                                isGuestBinder
                                  ? "text-gray-500"
                                  : "text-gray-900"
                              }`}
                            >
                              {binder.metadata?.name || "Unnamed Binder"}
                            </h3>
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                              {getStatusIcon(status)}
                              {getStatusText(status)}
                            </div>
                          </div>
                          {binder.metadata?.description && (
                            <p
                              className={`text-sm mb-2 line-clamp-1 ${
                                isGuestBinder
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {binder.metadata.description}
                            </p>
                          )}
                          <div
                            className={`flex items-center gap-4 text-sm ${
                              isGuestBinder ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            <span>{cardCount} cards</span>
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-4 h-4" />
                              {new Date(
                                binder.lastModified
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {isLocalOnly && user && (
                            <button
                              onClick={() => claimLocalBinder(binder.id)}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg font-medium transition-colors"
                            >
                              Claim
                            </button>
                          )}
                          {isGuestBinder && user ? (
                            <button
                              onClick={() => claimLocalBinder(binder.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Claim to Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelectBinder(binder)}
                              disabled={isGuestBinder}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
                                isGuestBinder
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              <EyeIcon className="w-4 h-4" />
                              Open
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleDeleteBinder(
                                binder.id,
                                binder.metadata?.name
                              )
                            }
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Grid view
              return (
                <div key={binder.id} className="relative">
                  {/* Main Card */}
                  <div
                    className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-lg hover:-translate-y-0.5 border-gray-200 hover:border-gray-300 ${
                      isLocalOnly ? "border-orange-200 bg-orange-50" : ""
                    } ${
                      isGuestBinder
                        ? "opacity-60 border-gray-300 bg-gray-50"
                        : ""
                    }`}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`text-lg font-semibold truncate ${
                                isGuestBinder
                                  ? "text-gray-500"
                                  : "text-gray-900"
                              }`}
                            >
                              {binder.metadata?.name || "Unnamed Binder"}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {getStatusIcon(status)}
                            <span
                              className={`text-sm font-medium ${
                                isGuestBinder
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {getStatusText(status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {binder.metadata?.description && (
                        <p
                          className={`text-sm mb-4 line-clamp-2 ${
                            isGuestBinder ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {binder.metadata.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div
                          className={`text-center p-3 rounded-lg ${
                            isGuestBinder ? "bg-gray-100" : "bg-gray-50"
                          }`}
                        >
                          <div
                            className={`text-2xl font-bold ${
                              isGuestBinder ? "text-gray-400" : "text-gray-900"
                            }`}
                          >
                            {cardCount}
                          </div>
                          <div
                            className={`text-xs ${
                              isGuestBinder ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Cards
                          </div>
                        </div>
                        <div
                          className={`text-center p-3 rounded-lg ${
                            isGuestBinder ? "bg-gray-100" : "bg-gray-50"
                          }`}
                        >
                          <div
                            className={`text-2xl font-bold ${
                              isGuestBinder ? "text-gray-400" : "text-gray-900"
                            }`}
                          >
                            {binder.version || 1}
                          </div>
                          <div
                            className={`text-xs ${
                              isGuestBinder ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Version
                          </div>
                        </div>
                      </div>

                      {/* Local-only claim option */}
                      {isLocalOnly && user && (
                        <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                          <p className="text-xs text-orange-700 mb-2">
                            This binder belongs to another user. Claim it to
                            save to your account.
                          </p>
                          <button
                            onClick={() => claimLocalBinder(binder.id)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg font-medium transition-colors"
                          >
                            <CloudIcon className="w-4 h-4" />
                            Claim Binder
                          </button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {isGuestBinder && user ? (
                          <button
                            onClick={() => claimLocalBinder(binder.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <CloudIcon className="w-4 h-4" />
                            Claim to Access
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectBinder(binder)}
                            disabled={isGuestBinder}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
                              isGuestBinder
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            <EyeIcon className="w-4 h-4" />
                            {isGuestBinder ? "Claim to Access" : "Open"}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteBinder(binder.id, binder.metadata?.name)
                          }
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div
                          className={`flex items-center justify-between text-xs ${
                            isGuestBinder ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <span>
                            Created{" "}
                            {new Date(
                              binder.metadata?.createdAt
                            ).toLocaleDateString()}
                          </span>
                          {binder.lastModified !==
                            binder.metadata?.createdAt && (
                            <span>
                              Updated{" "}
                              {new Date(
                                binder.lastModified
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guest binder claim prompt - positioned outside the opacity-affected card */}
                  {isGuestBinder && user && (
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 z-10 mx-4">
                      <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95">
                        <p className="text-sm text-blue-800 font-medium mb-3 text-center">
                          🎯 This binder was created as a guest. Claim it to
                          access and save to your account.
                        </p>
                        <button
                          onClick={() => claimLocalBinder(binder.id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors shadow-md"
                        >
                          <CloudIcon className="w-4 h-4" />
                          Claim Binder
                        </button>
                      </div>
                    </div>
                  )}
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
