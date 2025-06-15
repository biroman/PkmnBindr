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
import { BinderInteractionService } from "../../services/BinderInteractionService";
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
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [interactionStats, setInteractionStats] = useState({
    likeCount: 0,
    favoriteCount: 0,
    loading: true,
  });

  // Get customization data
  const { getHeaderColor, loadBinderCustomization } =
    useBinderCardCustomization();

  const [finalHeaderColor, setFinalHeaderColor] = useState(null);
  const [isCustomizationReady, setIsCustomizationReady] = useState(false);

  if (!binder) return null;

  const status = getBinderStatus ? getBinderStatus(binder) : "synced";

  // Load interaction stats for public binders
  useEffect(() => {
    const loadInteractionStats = async () => {
      if (
        !showInteractionStats ||
        !binder.permissions?.public ||
        !binder.ownerId
      ) {
        setInteractionStats((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const stats = await BinderInteractionService.getBinderStats(
          binder.id,
          binder.ownerId
        );
        console.log(`Binder ${binder.id} stats:`, stats); // Debug log
        setInteractionStats({
          likeCount: stats.likeCount,
          favoriteCount: stats.favoriteCount,
          loading: false,
        });
      } catch (error) {
        console.error("Error loading interaction stats:", error);
        setInteractionStats({
          likeCount: 0,
          favoriteCount: 0,
          loading: false,
        });
      }
    };

    loadInteractionStats();
  }, [
    binder.id,
    binder.ownerId,
    binder.permissions?.public,
    showInteractionStats,
  ]);

  // Load binder customization - this determines the final header color
  useEffect(() => {
    const loadCustomization = async () => {
      if (!binder.id || !binder.ownerId) {
        setIsCustomizationReady(true);
        return;
      }

      // First check if we already have it cached
      const cachedColor = getHeaderColor(binder.id);
      if (cachedColor) {
        setFinalHeaderColor(cachedColor);
        setIsCustomizationReady(true);
        return;
      }

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
  }, [binder.id, binder.ownerId, getHeaderColor, loadBinderCustomization]);
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

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking on dropdown or its trigger
    if (e.target.closest(".dropdown-container")) {
      return;
    }
    e.preventDefault();
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
        <div className="h-16 bg-gray-200"></div>
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main Card */}
      <div
        className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-lg hover:-translate-y-0.5 border-gray-200 hover:border-gray-300 overflow-hidden cursor-pointer ${
          isLocalOnly ? "border-orange-200 bg-orange-50" : ""
        } ${
          isGuestBinderInaccessible
            ? "opacity-60 border-gray-300 bg-gray-50"
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
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>

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
                    className="p-1.5 bg-white hover:bg-gray-100 rounded-full shadow-sm border border-white/20 transition-all"
                    title="More options"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4 text-gray-700" />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {/* Public/Private Toggle */}
                      {showPublicToggle && (
                        <button
                          onClick={handleTogglePublicClick}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          {binder.permissions?.public ? (
                            <>
                              <LockClosedIcon className="w-4 h-4 text-gray-500" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <GlobeAltIcon className="w-4 h-4 text-gray-500" />
                              Make Public
                            </>
                          )}
                        </button>
                      )}

                      {/* Customize Button */}
                      <button
                        onClick={handleCustomizeClick}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-500" />
                        Customize
                      </button>

                      {/* Delete Button */}
                      {showDeleteButton && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={handleDeleteClick}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
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
                isGuestBinderInaccessible ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {binder.metadata?.name || "Unnamed Binder"}
            </h3>

            {/* Description */}
            {binder.metadata?.description && (
              <p
                className={`text-sm line-clamp-1 mb-2 ${
                  isGuestBinderInaccessible ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {binder.metadata.description}
              </p>
            )}

            {/* Created by */}
            {showCreatedBy && ownerData && (
              <p
                className={`text-xs mb-2 ${
                  isGuestBinderInaccessible ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Created by{" "}
                <span className="font-medium text-gray-700">
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
                      ? "text-gray-400"
                      : "text-gray-600"
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
                    <GlobeAltIcon className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Public</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">Private</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Local-only claim option */}
          {showClaimButton && isLocalOnly && user && (
            <div className="mb-3 p-2 bg-orange-100 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700 mb-2">
                This binder belongs to another user. Claim it to save to your
                account.
              </p>
              <button
                onClick={handleClaimClick}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg font-medium transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
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
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                  {isGuestBinderInaccessible ? "Claim to Access" : "Open"}
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {/* Interaction Stats for Public Binders */}
            {showInteractionStats && binder.permissions?.public && (
              <div className="flex items-center gap-4 mb-3">
                {interactionStats.loading ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-6 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-6 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Always show interaction stats for public binders */}
                    <div className="flex items-center gap-4">
                      {/* Likes */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <HeartIcon className="w-4 h-4 text-red-500" />
                        <span className="font-medium">
                          {interactionStats.likeCount || 0}
                        </span>
                        <span className="text-gray-500">
                          {(interactionStats.likeCount || 0) === 1
                            ? "like"
                            : "likes"}
                        </span>
                      </div>

                      {/* Favorites */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <BookmarkIcon className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">
                          {interactionStats.favoriteCount || 0}
                        </span>
                        <span className="text-gray-500">
                          {(interactionStats.favoriteCount || 0) === 1
                            ? "favorite"
                            : "favorites"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div
              className={`flex items-center justify-between text-xs ${
                isGuestBinderInaccessible ? "text-gray-400" : "text-gray-500"
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
