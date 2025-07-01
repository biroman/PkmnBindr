import React, { useState, useEffect } from "react";
import {
  FolderIcon,
  EyeIcon,
  TrashIcon,
  CloudIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  HeartIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
// import { BinderInteractionService } from "../../services/BinderInteractionService";  // Disabled
import { useBinderCardCustomization } from "../../contexts/BinderCardCustomizationContext";

const BinderCard = ({
  binder,
  // Configuration props
  showSyncStatus = true,
  showActions = true,
  showDeleteButton = true,
  showPublicToggle = true,
  showClaimButton = true,
  showDropdownMenu = true,
  showInteractionStats = true, // New prop to show/hide like and favorite counts
  showCreatedBy = false, // New prop to show "Created by" information
  // Callbacks
  onSelect,
  onDelete,
  onTogglePublic,
  onClaim,
  onCustomize,
  // Helper functions
  getBinderStatus,
  getStatusIcon,
  getStatusText,
  isOwnedByCurrentUser,
  isLocalOnlyBinder,
  getBinderCardUsage,
  // External state
  limits,
  user,
  // Owner data for "Created by" feature
  ownerData = null,
  // Cached data to prevent Firebase requests
  cachedInteractionStats = null,
  cachedCustomization = null,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [interactionStats, setInteractionStats] = useState({
    likeCount: 0,
    favoriteCount: 0,
    viewCount: 0,
    loading: true,
  });

  // Get customization data
  const { getHeaderColor, loadBinderCustomization } =
    useBinderCardCustomization();

  const [finalHeaderColor, setFinalHeaderColor] = useState(null);
  const [isCustomizationReady, setIsCustomizationReady] = useState(false);

  if (!binder) return null;

  const status = getBinderStatus ? getBinderStatus(binder) : "synced";

  // Declare variables before useEffects to avoid lexical declaration errors
  const isLocalOnly = status === "local";
  const isGuestBinder = status === "guest";
  const isGuestBinderInaccessible = isGuestBinder && user;
  const cardCount = Object.keys(binder.cards || {}).length;

  // Generate gradient colors based on binder ID
  const colorIndex =
    Math.abs(binder.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 6;

  const gradientColors = {
    start: ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"][
      colorIndex
    ],
    end: ["#1E40AF", "#7C3AED", "#059669", "#D97706", "#DC2626", "#4F46E5"][
      colorIndex
    ],
  };

  // Load interaction stats for public binders - DISABLED
  const loadInteractionStats = async () => {
    // Interaction stats disabled
    return;

    // if (!binder.permissions?.public || !user) return;

    // try {
    //   const stats = await BinderInteractionService.getBinderStats(
    //     binder.id,
    //     binder.ownerId
    //   );
    //   setInteractionStats(stats);
    // } catch (error) {
    //   console.error("Failed to load interaction stats:", error);
    // }
  };

  // Load binder customization - this determines the final header color
  useEffect(() => {
    const loadCustomization = async () => {
      if (!binder.id || !binder.ownerId) {
        setIsCustomizationReady(true);
        return;
      }

      // Use cached customization if available
      if (cachedCustomization) {
        console.log(`📋 Using cached customization for binder ${binder.id}`);
        if (cachedCustomization.headerColor) {
          setFinalHeaderColor(cachedCustomization.headerColor);
        }
        setIsCustomizationReady(true);
        return;
      }

      // First check if we already have it cached in context
      const cachedColor = getHeaderColor(binder.id);
      if (cachedColor) {
        console.log(`📋 Using context-cached color for binder ${binder.id}`);
        setFinalHeaderColor(cachedColor);
        setIsCustomizationReady(true);
        return;
      }

      console.warn(
        `🔥 FIREBASE READ: BinderCard fetching customization for binder ${binder.id} (cached data not available)`
      );
      // Load from Firebase if not cached
      try {
        const customization = await loadBinderCustomization(
          binder.id,
          binder.ownerId
        );
        if (customization?.headerColor) {
          setFinalHeaderColor(customization.headerColor);
        }
      } catch (error) {
        console.error("Error loading binder customization:", error);
      } finally {
        setIsCustomizationReady(true);
      }
    };

    loadCustomization();
  }, [
    binder.id,
    binder.ownerId,
    getHeaderColor,
    loadBinderCustomization,
    cachedCustomization,
  ]);

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking on dropdown or its trigger
    if (e.target.closest(".dropdown-container")) {
      return;
    }
    e.preventDefault();

    // Track view when binder is selected - DISABLED
    const trackView = async () => {
      // View tracking disabled
      return;

      // if (!binder.permissions?.public || !user || !user.uid) return;

      // try {
      //   const wasNewView = await BinderInteractionService.trackView(
      //     binder.id,
      //     user.uid,
      //     binder.ownerId
      //   );

      //   if (wasNewView) {
      //     setInteractionStats((prev) => ({
      //       ...prev,
      //       viewCount: (prev?.viewCount || 0) + 1,
      //     }));
      //   }
      // } catch (error) {
      //   console.error("Failed to track view:", error);
      // }
    };

    // Track the view (fire and forget)
    trackView();

    // Continue with normal card selection
    if (onSelect && !isGuestBinderInaccessible) {
      onSelect(binder);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(binder);
    }
    setShowDropdown(false);
  };

  const handleTogglePublicClick = (e) => {
    e.stopPropagation();
    if (onTogglePublic) {
      onTogglePublic(binder, !binder.permissions?.public);
    }
  };

  const handleClaimClick = (e) => {
    e.stopPropagation();
    if (onClaim) {
      onClaim(binder.id);
    }
  };

  const handleCustomizeClick = (e) => {
    e.stopPropagation();
    if (onCustomize) {
      onCustomize(binder);
    }
    setShowDropdown(false);
  };

  const handleDropdownClick = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render until we know the final header color (prevents flash)
  if (!isCustomizationReady) {
    return (
      <div className="bg-card-background dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 overflow-hidden animate-pulse">
        <div className="h-16 bg-secondary dark:bg-gray-700"></div>
        <div className="p-4 space-y-2">
          <div className="h-4 bg-secondary dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-secondary dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main Card */}
      <div
        className={`bg-card-background dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-lg hover:-translate-y-0.5 border-border dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden cursor-pointer ${
          isLocalOnly
            ? "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-950"
            : ""
        } ${
          isGuestBinderInaccessible
            ? "opacity-60 border-border dark:border-gray-700 bg-secondary dark:bg-gray-700"
            : ""
        }`}
        onClick={handleCardClick}
      >
        {/* Custom Header Section */}
        <div
          className="h-16 relative"
          style={{
            background:
              finalHeaderColor ||
              `linear-gradient(135deg, ${gradientColors.start} 0%, ${gradientColors.end} 100%)`,
          }}
        >
          {/* Header overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-20"></div>

          {/* Header content */}
          <div className="absolute inset-0 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-white opacity-90" />
              <span className="text-white text-xs font-medium opacity-90">
                {cardCount} cards
              </span>
            </div>

            {/* Dropdown Menu */}
            {showDropdownMenu &&
              isOwnedByCurrentUser &&
              isOwnedByCurrentUser(binder) &&
              !isGuestBinder && (
                <div className="dropdown-container relative">
                  <button
                    onClick={handleDropdownClick}
                    className="p-1.5 bg-card-background dark:bg-gray-800 hover:bg-accent dark:hover:bg-gray-700 rounded-full shadow-sm border border-border dark:border-gray-600 transition-all"
                    title="More options"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card-background dark:bg-gray-800 rounded-lg shadow-lg border border-border dark:border-gray-600 py-1 z-10">
                      {/* Public/Private Toggle */}
                      {showPublicToggle && (
                        <button
                          onClick={handleTogglePublicClick}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-accent dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                        >
                          {binder.permissions?.public ? (
                            <>
                              <LockClosedIcon className="w-4 h-4 text-secondary dark:text-gray-400" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <GlobeAltIcon className="w-4 h-4 text-secondary dark:text-gray-400" />
                              Make Public
                            </>
                          )}
                        </button>
                      )}

                      {/* Customize Button */}
                      <button
                        onClick={handleCustomizeClick}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                      >
                        <PencilIcon className="w-4 h-4 text-secondary dark:text-gray-400" />
                        Customize
                      </button>

                      {/* Delete Button */}
                      {showDeleteButton && (
                        <>
                          <div className="border-t border-border dark:border-gray-600 my-1"></div>
                          <button
                            onClick={handleDeleteClick}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 flex items-center gap-2"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete Binder
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="mb-3">
            <h3
              className={`text-base font-semibold truncate mb-1 ${
                isGuestBinderInaccessible
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {binder.metadata?.name || "Unnamed Binder"}
            </h3>

            {/* Description */}
            {binder.metadata?.description && (
              <p
                className={`text-sm line-clamp-1 mb-2 ${
                  isGuestBinderInaccessible
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {binder.metadata.description}
              </p>
            )}

            {/* Created by */}
            {showCreatedBy && ownerData && (
              <p
                className={`text-xs mb-2 ${
                  isGuestBinderInaccessible
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Created by{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {ownerData.displayName || "Unknown User"}
                </span>
              </p>
            )}

            {/* Sync Status - Only show if enabled */}
            {showSyncStatus && getStatusIcon && getStatusText && (
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(status)}
                <span
                  className={`text-xs ${
                    isGuestBinderInaccessible
                      ? "text-gray-400 dark:text-gray-500"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {getStatusText(status)}
                </span>
              </div>
            )}

            {/* Public/Private Status - Below sync status */}
            {!isGuestBinder && (
              <div className="flex items-center gap-2">
                {binder.permissions?.public ? (
                  <>
                    <GlobeAltIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Public
                    </span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Private
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Local-only claim option */}
          {showClaimButton && isLocalOnly && user && (
            <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                This binder belongs to another user. Claim it to save to your
                account.
              </p>
              <button
                onClick={handleClaimClick}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white text-sm rounded-lg font-medium transition-colors"
              >
                <CloudIcon className="w-4 h-4" />
                Claim Binder
              </button>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2">
              {isGuestBinder && user && showClaimButton ? (
                <button
                  onClick={handleClaimClick}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <CloudIcon className="w-4 h-4" />
                  Claim to Access
                </button>
              ) : (
                <button
                  onClick={handleCardClick}
                  disabled={isGuestBinderInaccessible}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    isGuestBinderInaccessible
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                  {isGuestBinderInaccessible ? "Claim to Access" : "Open"}
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Interaction stats disabled */}
            {/* {binder.permissions?.public &&
              user &&
              interactionStats &&
              (interactionStats.likeCount > 0 ||
                interactionStats.favoriteCount > 0 ||
                interactionStats.viewCount > 0) && (
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-md">
                    <div className="flex items-center space-x-3">
                      {interactionStats.likeCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <HeartIcon className="w-3 h-3 text-red-400" />
                          <span>{interactionStats.likeCount}</span>
                        </span>
                      )}
                      {interactionStats.favoriteCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <StarIcon className="w-3 h-3 text-yellow-400" />
                          <span>{interactionStats.favoriteCount}</span>
                        </span>
                      )}
                      {interactionStats.viewCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <EyeIcon className="w-3 h-3 text-blue-400" />
                          <span>{interactionStats.viewCount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )} */}

            <div
              className={`flex items-center justify-between text-xs ${
                isGuestBinderInaccessible
                  ? "text-gray-400 dark:text-gray-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span>
                Created{" "}
                {binder.metadata?.createdAt
                  ? new Date(binder.metadata.createdAt).toLocaleDateString()
                  : "Unknown date"}
              </span>
              {binder.lastModified &&
                binder.lastModified !== binder.metadata?.createdAt && (
                  <span>
                    Updated {new Date(binder.lastModified).toLocaleDateString()}
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BinderCard;
