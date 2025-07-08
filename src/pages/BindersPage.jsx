import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBinderContext } from "../contexts/BinderContext";
import { useAuth } from "../hooks/useAuth";
import { useRules } from "../contexts/RulesContext";
import { toast } from "react-hot-toast";
import LocalBinderWarning from "../components/binder/LocalBinderWarning";
import DeleteBinderModal from "../components/binder/DeleteBinderModal";
import PublicBinderShowcase from "../components/binder/PublicBinderShowcase";
import BinderCard from "../components/binder/BinderCard";
import BinderCustomizationModal from "../components/binder/BinderCustomizationModal";
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
  ExclamationTriangleIcon as ExclamationTriangleIconOutline,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

const BindersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canPerformAction } = useRules();
  const {
    binders,
    currentBinder,
    isLoading,
    createBinder,
    deleteBinder,
    selectBinder,
    isLocalOnlyBinder,
    isOwnedByCurrentUser,
    claimLocalBinder,
    updateBinder,
    saveBinderToCloud,
    updateBinderPrivacy,
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

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [binderToDelete, setBinderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Customization modal state
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [binderToCustomize, setBinderToCustomize] = useState(null);

  // Limits tracking state
  const [limits, setLimits] = useState({
    binders: { current: 0, limit: null, canCreate: true },
    cardsPerBinder: { limit: 500 }, // Default fallback
  });

  // Fetch limits and current usage
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const binderCount = binders.length;

        // Check binder creation limits
        const binderCheck = await canPerformAction("create_binder", {
          currentCount: binderCount,
        });

        // Check card per binder limits
        const cardCheck = await canPerformAction("add_card_to_binder", {
          currentCount: 0, // Just get the limit, not specific to any binder
        });

        setLimits({
          binders: {
            current: binderCount,
            limit: binderCheck.limit || (user ? 7 : 10), // Default: 5 for users, 10 for local
            canCreate: binderCheck.allowed !== false,
            percentage: binderCheck.limit
              ? (binderCount / binderCheck.limit) * 100
              : 0,
          },
          cardsPerBinder: {
            limit: cardCheck.limit || (user ? 500 : 500), // Default: 500 cards per binder
          },
        });
      } catch (error) {
        console.error("Failed to fetch limits:", error);
        // Use fallback values
        setLimits({
          binders: {
            current: binders.length,
            limit: user ? 5 : 10,
            canCreate: true,
            percentage: 0,
          },
          cardsPerBinder: {
            limit: 500,
          },
        });
      }
    };

    fetchLimits();
  }, [binders.length, canPerformAction, user]);

  // Helper function to get binder card usage
  const getBinderCardUsage = (binder) => {
    const cardCount = Object.keys(binder.cards || {}).length;
    const cardLimit = limits.cardsPerBinder.limit;
    const percentage = (cardCount / cardLimit) * 100;

    return {
      current: cardCount,
      limit: cardLimit,
      percentage,
      remaining: Math.max(0, cardLimit - cardCount),
      isNearLimit: percentage >= 80,
      isAtLimit: percentage >= 100,
    };
  };

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

  // Helper functions for binder status
  const getBinderStatus = (binder) => {
    // Guest binder (created without login)
    if (binder.ownerId === "local_user") return "guest";

    // Local-only (belongs to another user)
    if (isLocalOnlyBinder(binder)) return "local";

    // Check actual sync status for user's own binders
    if (binder.ownerId === user?.uid) {
      // Check if it has been synced to cloud
      const hasBeenSynced =
        binder.sync?.lastSynced || binder.sync?.status === "synced";
      const hasLocalChanges =
        binder.sync?.status === "local" ||
        binder.sync?.pendingChanges?.length > 0;

      if (hasBeenSynced && !hasLocalChanges) {
        return "synced";
      } else {
        return "unsaved"; // New status for user's binders that need saving
      }
    }

    // Fallback for other cases
    return "synced";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "synced":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "unsaved":
        return <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />;
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
      case "unsaved":
        return "Unsaved Changes";
      case "local":
        return "Local Only";
      case "guest":
        return "Guest Binder";
      default:
        return "";
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = binders.length;
    const synced = binders.filter(
      (b) => getBinderStatus(b) === "synced"
    ).length;
    const unsaved = binders.filter(
      (b) => getBinderStatus(b) === "unsaved"
    ).length;
    const localOnly = binders.filter(
      (b) => getBinderStatus(b) === "local"
    ).length;
    const guest = binders.filter((b) => getBinderStatus(b) === "guest").length;
    const totalCards = binders.reduce(
      (sum, b) => sum + Object.keys(b.cards || {}).length,
      0
    );

    return { total, synced, unsaved, localOnly, guest, totalCards };
  }, [binders, user, isLocalOnlyBinder, isOwnedByCurrentUser]);

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

  const handleDeleteBinder = (binder) => {
    setBinderToDelete(binder);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!binderToDelete) return;

    try {
      setIsDeleting(true);
      await deleteBinder(binderToDelete.id);
      setShowDeleteModal(false);
      setBinderToDelete(null);
    } catch (error) {
      // Error handled by context
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setBinderToDelete(null);
  };

  const handleTogglePublic = async (binder, isPublic) => {
    try {
      await updateBinderPrivacy(binder.id, isPublic);
      toast.success(isPublic ? "Binder made public!" : "Binder made private!");
    } catch (error) {
      console.error("Failed to update binder visibility:", error);
      toast.success(
        isPublic
          ? "Binder made public locally! Will sync when online."
          : "Binder made private locally! Will sync when online."
      );
    }
  };

  const handleCustomizeBinder = (binder) => {
    setBinderToCustomize(binder);
    setShowCustomizationModal(true);
  };

  const handleSaveCustomization = async (updatedBinder) => {
    // This function is no longer needed since customization is handled independently
    // by the BinderCardCustomizationContext, but we keep it for compatibility
    setShowCustomizationModal(false);
    setBinderToCustomize(null);
  };

  // The cache system now handles loading data automatically
  // No need for explicit sync on page load

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:gap-6">
            {/* Title and Stats */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  My Pokemon Binders
                </h1>
                {/* Subtle Binder Usage Badge */}
                {limits.binders.limit && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium self-start ${
                      limits.binders.percentage >= 100
                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        : limits.binders.percentage >= 80
                        ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                        : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    }`}
                  >
                    <FolderIcon className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {limits.binders.current}/{limits.binders.limit}
                    </span>
                    {!limits.binders.canCreate && (
                      <ExclamationTriangleIconOutline className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{stats.totalCards} total cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></span>
                  <span>
                    Up to {limits.cardsPerBinder.limit} cards per binder
                  </span>
                </div>
                {user && (
                  <>
                    <div className="flex items-center gap-2">
                      <CloudIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{stats.synced} synced</span>
                    </div>
                    {stats.unsaved > 0 && (
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>{stats.unsaved} unsaved</span>
                      </div>
                    )}
                    {stats.localOnly > 0 && (
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span>{stats.localOnly} local only</span>
                      </div>
                    )}
                  </>
                )}
                {stats.guest > 0 && (
                  <div className="flex items-center gap-2">
                    <ComputerDesktopIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{stats.guest} guest</span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Limit Warning for Create Button */}
              {!limits.binders.canCreate && (
                <div className="text-left sm:text-right order-2 sm:order-1">
                  <p className="text-sm text-red-600 font-medium">
                    Binder limit reached
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!limits.binders.canCreate}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all order-1 sm:order-2 ${
                  limits.binders.canCreate
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                title={
                  !limits.binders.canCreate
                    ? "Binder limit reached"
                    : "Create new binder"
                }
              >
                <PlusIcon className="w-5 h-5 flex-shrink-0" />
                New Binder
              </button>
            </div>
          </div>
        </div>

        {/* Local Binder Warning */}
        <LocalBinderWarning />

        {/* Featured Collections */}
        <PublicBinderShowcase />

        {/* Create Binder Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Create New Binder
            </h3>
            <form onSubmit={handleCreateBinder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Binder Name *
                  </label>
                  <input
                    type="text"
                    value={newBinderName}
                    onChange={(e) => setNewBinderName(e.target.value)}
                    placeholder="My Pokemon Collection"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newBinderDescription}
                    onChange={(e) => setNewBinderDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreating || !newBinderName.trim()}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
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
                  className="flex-1 sm:flex-initial px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Results Header */}
        {searchQuery || filterStatus !== "all" ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAndSortedBinders.length} of {binders.length} binders
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>
            {(searchQuery || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 self-start sm:self-auto"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : null}

        {/* Binders Grid/List */}
        {filteredAndSortedBinders.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <FolderIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || filterStatus !== "all"
                ? "No matching binders"
                : "No binders yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : user
                ? "Create your first binder to start organizing your Pokemon cards, or sync your existing binders from the cloud."
                : "Create your first binder to start organizing your Pokemon cards."}
            </p>
            <div className="flex justify-center gap-4 px-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors w-full sm:w-auto"
              >
                Create Your First Binder
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                : "space-y-4"
            }
          >
            {filteredAndSortedBinders.map((binder) => {
              const status = getBinderStatus(binder);
              const isLocalOnly = status === "local";
              const isGuestBinder = status === "guest";
              const isGuestBinderInaccessible = isGuestBinder && user; // Only inaccessible if user is logged in
              const cardCount = Object.keys(binder.cards || {}).length;

              if (viewMode === "list") {
                return (
                  <div
                    key={binder.id}
                    className={`bg-card-background rounded-lg border transition-all hover:shadow-md border-border hover:border-gray-300 dark:hover:border-gray-600 ${
                      isLocalOnly
                        ? "border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700"
                        : ""
                    } ${
                      isGuestBinderInaccessible
                        ? "opacity-60 border-gray-300 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700"
                        : ""
                    }`}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <h3
                              className={`text-base sm:text-lg font-semibold truncate ${
                                isGuestBinderInaccessible
                                  ? "text-gray-500"
                                  : "text-gray-900"
                              }`}
                            >
                              {binder.metadata?.name || "Unnamed Binder"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                {getStatusIcon(status)}
                                {getStatusText(status)}
                              </div>
                              {/* Subtle Card Count Badge */}
                              {!isGuestBinder && (
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${(() => {
                                    const usage = getBinderCardUsage(binder);
                                    return usage.isAtLimit
                                      ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                      : usage.isNearLimit
                                      ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                      : "bg-secondary text-text-secondary";
                                  })()}`}
                                >
                                  {cardCount}/{limits.cardsPerBinder.limit}
                                </div>
                              )}
                            </div>
                          </div>
                          {binder.metadata?.description && (
                            <p
                              className={`text-sm mb-2 line-clamp-1 ${
                                isGuestBinderInaccessible
                                  ? "text-text-secondary opacity-60"
                                  : "text-text-secondary"
                              }`}
                            >
                              {binder.metadata.description}
                            </p>
                          )}
                          <div
                            className={`flex flex-wrap items-center gap-2 sm:gap-4 text-sm ${
                              isGuestBinderInaccessible
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            <span>{cardCount} cards</span>
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">
                                {new Date(
                                  binder.lastModified
                                ).toLocaleDateString()}
                              </span>
                              <span className="sm:hidden">
                                {new Date(
                                  binder.lastModified
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {/* Public/Private Toggle for List View */}
                          {isOwnedByCurrentUser(binder) && !isGuestBinder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublic(
                                  binder,
                                  !binder.permissions?.public
                                );
                              }}
                              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                binder.permissions?.public
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              title={
                                binder.permissions?.public
                                  ? "Make private"
                                  : "Make public to logged-in users"
                              }
                            >
                              {binder.permissions?.public ? (
                                <>
                                  <GlobeAltIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="hidden sm:inline">
                                    Public
                                  </span>
                                </>
                              ) : (
                                <>
                                  <LockClosedIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="hidden sm:inline">
                                    Private
                                  </span>
                                </>
                              )}
                            </button>
                          )}

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
                              <span className="hidden sm:inline">
                                Claim to Access
                              </span>
                              <span className="sm:hidden">Claim</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelectBinder(binder)}
                              disabled={isGuestBinderInaccessible}
                              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
                                isGuestBinderInaccessible
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              <EyeIcon className="w-4 h-4 flex-shrink-0" />
                              Open
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBinder(binder)}
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
                <BinderCard
                  key={binder.id}
                  binder={binder}
                  showSyncStatus={true}
                  showActions={true}
                  showDeleteButton={true}
                  showPublicToggle={true}
                  showClaimButton={true}
                  onSelect={handleSelectBinder}
                  onDelete={handleDeleteBinder}
                  onTogglePublic={handleTogglePublic}
                  onClaim={claimLocalBinder}
                  getBinderStatus={getBinderStatus}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  isOwnedByCurrentUser={isOwnedByCurrentUser}
                  isLocalOnlyBinder={isLocalOnlyBinder}
                  getBinderCardUsage={getBinderCardUsage}
                  limits={limits}
                  user={user}
                  onCustomize={handleCustomizeBinder}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteBinderModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        binderName={binderToDelete?.metadata?.name || "Unnamed Binder"}
        cardCount={
          binderToDelete ? Object.keys(binderToDelete.cards || {}).length : 0
        }
        isLoading={isDeleting}
      />

      {/* Customization Modal */}
      {showCustomizationModal && (
        <BinderCustomizationModal
          isOpen={showCustomizationModal}
          onClose={() => setShowCustomizationModal(false)}
          binder={binderToCustomize}
          onSave={handleSaveCustomization}
          isPremium={false}
        />
      )}
    </div>
  );
};

export default BindersPage;
