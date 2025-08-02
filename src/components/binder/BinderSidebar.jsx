import { useState, useRef, useEffect } from "react";
import {
  Cog6ToothIcon,
  PencilIcon,
  CloudArrowUpIcon,
  CloudIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import PageManager from "./PageManager";
import RevertConfirmationModal from "./RevertConfirmationModal";
import SortControls from "./SortControls";
import MissingCardsModal from "./MissingCardsModal";
import { X } from "lucide-react";

const GridSizeSelector = ({ currentSize, onSizeChange }) => {
  const gridSizes = [
    { value: "2x2", label: "2×2", description: "4 cards per page" },
    { value: "3x3", label: "3×3", description: "9 cards per page" },
    { value: "4x3", label: "4×3", description: "12 cards per page" },
    { value: "4x4", label: "4×4", description: "16 cards per page" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Grid Size
      </label>
      <div className="space-y-2">
        {gridSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => onSizeChange(size.value)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
              currentSize === size.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200"
                : "border-gray-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-slate-500 text-gray-900 dark:text-gray-100"
            }`}
          >
            <div className="font-medium">{size.label}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {size.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const BinderNameEditor = ({ currentName, onNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(currentName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempName(currentName);
  }, [currentName]);

  const handleApply = () => {
    const trimmedName = tempName.trim();
    if (trimmedName && trimmedName !== currentName) {
      onNameChange(trimmedName);
      // Brief visual feedback without confusing toast
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(currentName);
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleApply();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Auto-apply on blur (clicking away) - modern UX pattern
    handleApply();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Binder Name
      </label>
      {isEditing ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleBlur}
            className="w-full px-3 py-2 pr-10 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 dark:bg-blue-950 text-gray-900 dark:text-gray-100"
            placeholder="Enter binder name..."
          />
          <button
            onClick={handleCancel}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Press Enter to apply • Esc to cancel
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
            {currentName}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit binder name"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const SyncButton = ({ binder, onShowRevertModal, isReverting }) => {
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
      // Success message is handled in saveBinderToCloud
    } catch (error) {
      console.error("Save failed:", error);
      // Error message is handled in saveBinderToCloud unless it's a cancellation
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToLastSave = () => {
    // Validate user authentication
    if (!user) {
      toast.error("Please sign in to revert changes");
      return;
    }

    // Validate binder exists
    if (!binder?.id) {
      toast.error("No binder available to revert");
      return;
    }

    // Check if there's actually a cloud version to revert to
    if (!binder.sync?.lastSynced) {
      toast.error(
        "No cloud save found. This binder has never been saved to the cloud."
      );
      return;
    }

    // Additional check for purely local binders
    if (syncState === "local" && !binder.sync?.lastSynced) {
      toast.error(
        "This binder exists only locally. Save it to the cloud first."
      );
      return;
    }

    // Check if there are actually changes to revert
    if (!hasUnsyncedChanges()) {
      toast.info("No unsaved changes to revert");
      return;
    }

    // Prevent revert during other operations
    if (isReverting) {
      toast.info("Revert operation already in progress");
      return;
    }

    // Show the confirmation modal via callback
    onShowRevertModal();
  };

  const getSyncIcon = () => {
    if (isLoading || binderSyncStatus?.status === "saving") {
      return <ArrowPathIcon className="w-5 h-5 animate-spin" />;
    }

    switch (syncState) {
      case "synced":
        return <CloudIcon className="w-5 h-5" />;
      case "error":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case "conflict":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <CloudArrowUpIcon className="w-5 h-5" />;
    }
  };

  const getSyncText = () => {
    if (isLoading || binderSyncStatus?.status === "saving") {
      return "Saving...";
    }

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
    if (isLoading || binderSyncStatus?.status === "saving") {
      return "Please wait...";
    }

    switch (syncState) {
      case "synced":
        const lastSynced = binder.sync?.lastSynced;
        if (lastSynced) {
          const diffMs = Date.now() - new Date(lastSynced).getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          if (diffMins < 1) return "Just now";
          if (diffMins < 60) return `${diffMins}m ago`;
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHours < 24) return `${diffHours}h ago`;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return `${diffDays}d ago`;
        }
        return "Up to date";
      case "error":
        return binder.sync?.lastError || "Save failed";
      case "conflict":
        return binderSyncStatus?.message || "Cloud version is newer";
      default:
        return user ? "Backup your binder" : "Sign in to save";
    }
  };

  const getButtonStyle = () => {
    if (!user) {
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed";
    }

    if (isLoading || binderSyncStatus?.status === "saving") {
      return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-wait";
    }

    switch (syncState) {
      case "synced":
        return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300";
      case "error":
        return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300";
      case "conflict":
        return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  const hasUnsyncedChanges = () => {
    // Check sync status first
    if (syncState === "local" || syncState === "error") {
      return true;
    }

    // Check if there are pending changes
    if (binder?.sync?.pendingChanges?.length > 0) {
      return true;
    }

    // Check if last modified is newer than last synced
    if (binder?.lastModified && binder?.sync?.lastSynced) {
      const lastModified = new Date(binder.lastModified);
      const lastSynced = new Date(binder.sync.lastSynced);
      return lastModified > lastSynced;
    }

    // If no sync timestamp but binder was modified, it has changes
    if (binder?.lastModified && !binder?.sync?.lastSynced) {
      return true;
    }

    return false;
  };

  const canRevert = () => {
    // Can only revert if:
    // 1. User is signed in
    if (!user) return false;

    // 2. There are unsaved changes to revert
    if (!hasUnsyncedChanges()) return false;

    // 3. There's a cloud version to revert to
    // This means the binder has been synced at least once
    const hasCloudVersion =
      binder?.sync?.lastSynced &&
      (syncState === "synced" ||
        syncState === "error" ||
        syncState === "conflict" ||
        (syncState === "local" && binder.sync.lastSynced));

    return hasCloudVersion;
  };

  return (
    <div className="space-y-2">
      {/* Unsaved changes indicator */}
      {user && hasUnsyncedChanges() && syncState !== "error" && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          <span>You have unsaved changes</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveToCloud}
        disabled={
          !user ||
          isLoading ||
          binderSyncStatus?.status === "saving" ||
          !hasUnsyncedChanges()
        }
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${getButtonStyle()}`}
      >
        <div className="flex-shrink-0">{getSyncIcon()}</div>
        <div className="flex-1 text-left">
          <div className="font-medium text-sm">{getSyncText()}</div>
          <div className="text-xs opacity-75">{getSyncSubtext()}</div>
        </div>
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
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex-shrink-0">
            {isReverting ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUturnLeftIcon className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">
              {isReverting ? "Reverting..." : "Revert to Last Save"}
            </div>
            <div className="text-xs opacity-75">
              {isReverting ? "Please wait..." : "Discard unsaved changes"}
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

const BulkMissingToggle = ({
  binder,
  onBulkToggleMissing,
  isReadOnly,
  onShowMissingCardsModal,
}) => {
  if (isReadOnly || !onBulkToggleMissing) return null;

  const allCardInstanceIds = Object.values(binder?.cards || {})
    .map((cardEntry) => cardEntry?.instanceId)
    .filter(Boolean);

  const missingInstanceIds = binder?.metadata?.missingInstances || [];
  const allCardsAreMissing =
    allCardInstanceIds.length > 0 &&
    allCardInstanceIds.every((instanceId) =>
      missingInstanceIds.includes(instanceId)
    );

  const handleToggleAllMissing = () => {
    onBulkToggleMissing(!allCardsAreMissing);
  };

  if (allCardInstanceIds.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Bulk Missing Status
        </label>
        <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No cards in binder to mark as missing
        </div>
      </div>
    );
  }

  const missingCount = allCardInstanceIds.filter((instanceId) =>
    missingInstanceIds.includes(instanceId)
  ).length;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Bulk Missing Status
      </label>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Mark all cards as missing
          </span>
          <button
            onClick={handleToggleAllMissing}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              allCardsAreMissing
                ? "bg-blue-600"
                : "bg-gray-200 dark:bg-gray-600"
            }`}
            role="switch"
            aria-checked={allCardsAreMissing}
            aria-label="Toggle all cards missing status"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                allCardsAreMissing ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {missingCount} of {allCardInstanceIds.length} cards marked as missing
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {/*add percentage collected right side of the progress bar*/}
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">
              {allCardInstanceIds.length - missingCount}
            </span>{" "}
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-500">
              / {allCardInstanceIds.length} collected
            </span>
          </div>
          {/*show only 2 decimal places*/}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {(() => {
              const percentage =
                ((allCardInstanceIds.length - missingCount) /
                  allCardInstanceIds.length) *
                100;
              return percentage >= 100 ? "100" : percentage.toFixed(2);
            })()}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex-1">
          {/*Progress bar gradient color*/}
          <div
            className=" h-2 rounded-full transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-400 to-green-400 dark:from-blue-500 dark:to-green-500"
            style={{
              width: `${
                ((allCardInstanceIds.length - missingCount) /
                  allCardInstanceIds.length) *
                100
              }%`,
            }}
          />
        </div>

        {/* View Missing Cards Button - Only show if there are missing cards */}
        {missingCount > 0 && (
          <button
            onClick={() => onShowMissingCardsModal && onShowMissingCardsModal()}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 dark:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 transform hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            <EyeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              View Missing Cards ({missingCount})
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

const CardBackSettings = ({ binder, onSettingsChange }) => {
  const handleToggleEmptyCardBack = () => {
    const newValue = !binder.settings?.showCardBackForEmpty;
    onSettingsChange("showCardBackForEmpty", newValue);
    if (newValue) {
      toast.success("Card backs will now show for empty slots");
    } else {
      toast.success("Empty slots will show add card prompt");
    }
  };

  const handleToggleMissingCardBack = () => {
    const newValue = !binder.settings?.showCardBackForMissing;
    onSettingsChange("showCardBackForMissing", newValue);
    if (newValue) {
      toast.success(
        "Missing cards will now show as card backs with hover preview"
      );
    } else {
      toast.success("Missing cards will show with overlay indicator");
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Card Back Display
      </label>

      {/* Empty Slots Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Empty Slots
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Show card backs instead of "Add card" prompt
          </div>
        </div>
        <button
          onClick={handleToggleEmptyCardBack}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
            binder.settings?.showCardBackForEmpty
              ? "bg-blue-600"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              binder.settings?.showCardBackForEmpty
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Missing Cards Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Missing Cards
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Show card backs with hover preview instead of overlay
          </div>
        </div>
        <button
          onClick={handleToggleMissingCardBack}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
            binder.settings?.showCardBackForMissing
              ? "bg-blue-600"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              binder.settings?.showCardBackForMissing
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

const BinderSidebar = ({
  binder,
  onGridSizeChange,
  onNameChange,
  onCollapseChange,
  onSortChange,
  onAutoSortChange,
  onSortDirectionChange,
  onBulkToggleMissing,
  isCollapsed = false,
  isReadOnly = false,
  isMobile = false,
}) => {
  const {
    updateBinderMetadata,
    downloadBinderFromCloud,
    updateBinderSettings,
  } = useBinderContext();
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showMissingCardsModal, setShowMissingCardsModal] = useState(false);

  const handleToggleCollapse = () => {
    if (onCollapseChange) {
      onCollapseChange(!isCollapsed);
    }
  };

  const handleConfirmRevert = async () => {
    if (!binder?.id) {
      toast.error("No binder ID found");
      return;
    }

    // Prevent multiple simultaneous revert operations
    if (isReverting) {
      return;
    }

    setIsReverting(true);
    setShowRevertModal(false);

    try {
      const result = await downloadBinderFromCloud(binder.id);

      // Check if the download was successful
      if (result?.success) {
        toast.success("Successfully reverted to last saved version");
      } else {
        toast.success("Reverted to last saved version");
      }
    } catch (error) {
      console.error("Revert failed:", error);

      // Provide more specific error messages
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
        toast.error("Failed to revert: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsReverting(false);
    }
  };

  const handleMarkAsCollected = (instanceId) => {
    if (!binder?.id) {
      toast.error("No binder ID found");
      return;
    }

    // Remove the card from missing instances
    const updatedMissingInstances = (
      binder.metadata?.missingInstances || []
    ).filter((id) => id !== instanceId);

    // Update the binder metadata
    updateBinderMetadata(binder.id, {
      missingInstances: updatedMissingInstances,
    });

    toast.success("Card marked as collected!");
  };

  if (!binder) return null;

  // Mobile mode: return just the content without fixed positioning
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Binder Name Editor */}
        <BinderNameEditor
          currentName={binder.metadata.name}
          onNameChange={onNameChange}
        />

        {/* Grid Size Selector */}
        <GridSizeSelector
          currentSize={binder.settings.gridSize}
          onSizeChange={onGridSizeChange}
        />

        {/* Bulk Missing Toggle */}
        <BulkMissingToggle
          binder={binder}
          onBulkToggleMissing={onBulkToggleMissing}
          isReadOnly={isReadOnly}
          onShowMissingCardsModal={() => setShowMissingCardsModal(true)}
        />

        {/* Card Back Settings */}
        <CardBackSettings
          binder={binder}
          onSettingsChange={(setting, value) =>
            updateBinderSettings(binder.id, { [setting]: value })
          }
        />

        {/* Sort Controls */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Card Sorting
          </label>
          <SortControls
            currentSortBy={binder.settings?.sortBy || "custom"}
            currentSortDirection={binder.settings?.sortDirection || "asc"}
            autoSort={binder.settings?.autoSort || false}
            onSortChange={onSortChange}
            onAutoSortChange={onAutoSortChange}
            onSortDirectionChange={onSortDirectionChange}
            className="w-full"
          />
        </div>

        {/* Page Manager */}
        <PageManager binder={binder} />

        {/* Sync Button */}
        <SyncButton
          binder={binder}
          onShowRevertModal={() => setShowRevertModal(true)}
          isReverting={isReverting}
        />

        {/* Revert Modal */}
        <RevertConfirmationModal
          isOpen={showRevertModal}
          onClose={() => setShowRevertModal(false)}
          onConfirm={handleConfirmRevert}
          binderName={binder?.metadata?.name || "Unnamed Binder"}
          isLoading={isReverting}
        />

        {/* Missing Cards Modal */}
        <MissingCardsModal
          isOpen={showMissingCardsModal}
          onClose={() => setShowMissingCardsModal(false)}
          binder={binder}
          onMarkAsCollected={handleMarkAsCollected}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed top-16 bottom-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 z-30 w-80 flex flex-col shadow-lg ${
          isCollapsed ? "translate-x-full" : "translate-x-0"
        }`}
        style={{ right: 0 }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Binder Settings
            </h3>
          </div>
          <button
            onClick={handleToggleCollapse}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Binder Name Editor */}
          <BinderNameEditor
            currentName={binder.metadata.name}
            onNameChange={onNameChange}
          />

          {/* Grid Size Selector */}
          <GridSizeSelector
            currentSize={binder.settings.gridSize}
            onSizeChange={onGridSizeChange}
          />

          {/* Bulk Missing Toggle */}
          <BulkMissingToggle
            binder={binder}
            onBulkToggleMissing={onBulkToggleMissing}
            isReadOnly={isReadOnly}
            onShowMissingCardsModal={() => setShowMissingCardsModal(true)}
          />

          {/* Card Back Settings */}
          <CardBackSettings
            binder={binder}
            onSettingsChange={(setting, value) =>
              updateBinderSettings(binder.id, { [setting]: value })
            }
          />

          {/* Sort Controls */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Card Sorting
            </label>
            <SortControls
              currentSortBy={binder.settings?.sortBy || "custom"}
              currentSortDirection={binder.settings?.sortDirection || "asc"}
              autoSort={binder.settings?.autoSort || false}
              onSortChange={onSortChange}
              onAutoSortChange={onAutoSortChange}
              onSortDirectionChange={onSortDirectionChange}
              className="w-full"
            />
          </div>

          {/* Page Manager */}
          <PageManager binder={binder} />

          {/* Note: Missing card tracking is now handled via hover buttons on individual cards */}
        </div>

        {/* Sync Button at the bottom */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <SyncButton
            binder={binder}
            onShowRevertModal={() => setShowRevertModal(true)}
            isReverting={isReverting}
          />
        </div>
      </div>

      {/* Revert Confirmation Modal - rendered outside sidebar */}
      <RevertConfirmationModal
        isOpen={showRevertModal}
        onClose={() => setShowRevertModal(false)}
        onConfirm={handleConfirmRevert}
        binderName={binder?.metadata?.name || "Unnamed Binder"}
        isLoading={isReverting}
      />

      {/* Missing Cards Modal - rendered outside sidebar */}
      <MissingCardsModal
        isOpen={showMissingCardsModal}
        onClose={() => setShowMissingCardsModal(false)}
        binder={binder}
        onMarkAsCollected={handleMarkAsCollected}
      />
    </>
  );
};

export default BinderSidebar;
