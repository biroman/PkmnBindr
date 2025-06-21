import { useState, useRef, useEffect } from "react";
import {
  Cog6ToothIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeSlashIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  CloudArrowUpIcon,
  CloudIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import PageManager from "./PageManager";
import RevertConfirmationModal from "./RevertConfirmationModal";
import SortControls from "./SortControls";

const GridSizeSelector = ({ currentSize, onSizeChange }) => {
  const gridSizes = [
    { value: "2x2", label: "2×2", description: "4 cards per page" },
    { value: "3x3", label: "3×3", description: "9 cards per page" },
    { value: "4x3", label: "4×3", description: "12 cards per page" },
    { value: "4x4", label: "4×4", description: "16 cards per page" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Grid Size
      </label>
      <div className="space-y-2">
        {gridSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => onSizeChange(size.value)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
              currentSize === size.value
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <div className="font-medium">{size.label}</div>
            <div className="text-xs text-slate-500">{size.description}</div>
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
      <label className="block text-sm font-medium text-slate-700">
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
            className="w-full px-3 py-2 pr-10 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
            placeholder="Enter binder name..."
          />
          <button
            onClick={handleCancel}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Cancel (Esc)"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <div className="mt-1 text-xs text-slate-500">
            Press Enter to apply • Esc to cancel
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            {currentName}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit binder name"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const WantListTracker = ({ binder, onToggleCardVisibility }) => {
  const [newCardNumber, setNewCardNumber] = useState("");
  const [wantList, setWantList] = useState(binder?.metadata?.wantList || []);

  // Update want list when binder changes
  useEffect(() => {
    setWantList(binder?.metadata?.wantList || []);
  }, [binder?.metadata?.wantList]);

  const handleAddMissingCard = () => {
    const cardNumber = newCardNumber.trim();
    if (!cardNumber) return;

    // Parse card number (remove # if present)
    let cleanNumber = cardNumber.replace("#", "");

    // Validate reverse holo format (allow both "rh" and "RH")
    const isReverseHolo = /rh$/i.test(cleanNumber);
    if (isReverseHolo) {
      // Normalize to lowercase "rh"
      cleanNumber = cleanNumber.replace(/rh$/i, "rh");
    }

    if (missingCards.includes(cleanNumber)) {
      toast.error("Card number already in missing list!");
      return;
    }

    const updatedMissingCards = [...missingCards, cleanNumber].sort((a, b) => {
      // Extract base number and reverse holo flag for sorting
      const parseCard = (card) => {
        const isRH = card.endsWith("rh");
        const baseNum = isRH ? card.slice(0, -2) : card;
        const num = parseInt(baseNum);
        return {
          baseNum: isNaN(num) ? baseNum : num,
          isRH,
          isNumeric: !isNaN(num),
        };
      };

      const aCard = parseCard(a);
      const bCard = parseCard(b);

      // First sort by base number
      if (aCard.isNumeric && bCard.isNumeric) {
        if (aCard.baseNum !== bCard.baseNum) {
          return aCard.baseNum - bCard.baseNum;
        }
        // Same base number: regular before reverse holo
        return aCard.isRH - bCard.isRH;
      } else {
        // Alphabetical for non-numeric
        const comparison = String(aCard.baseNum).localeCompare(
          String(bCard.baseNum)
        );
        if (comparison !== 0) return comparison;
        return aCard.isRH - bCard.isRH;
      }
    });

    setMissingCards(updatedMissingCards);
    onToggleCardVisibility(cleanNumber, true); // true = mark as missing
    setNewCardNumber("");

    const cardType = isReverseHolo ? "reverse holo" : "regular";
    const displayNumber = isReverseHolo
      ? cleanNumber.slice(0, -2)
      : cleanNumber;

    toast.success(`Card #${displayNumber} (${cardType}) marked as missing`);
  };

  const handleRemoveMissingCard = (cardNumber) => {
    const updatedMissingCards = missingCards.filter(
      (num) => num !== cardNumber
    );
    setMissingCards(updatedMissingCards);
    onToggleCardVisibility(cardNumber, false); // false = mark as collected
    toast.success(`Card #${cardNumber} marked as collected`);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddMissingCard();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Missing Cards Tracker
      </label>

      {/* Add new missing card */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter card # (e.g., 25, 25rh for reverse holo)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={handleAddMissingCard}
          disabled={!newCardNumber.trim()}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg transition-colors"
          title="Mark as missing"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Missing cards list */}
      {missingCards.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium">
            Missing Cards ({missingCards.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {missingCards.map((cardNumber) => {
              const isReverseHolo = cardNumber.endsWith("rh");
              const displayNumber = isReverseHolo
                ? cardNumber.slice(0, -2)
                : cardNumber;
              const cardType = isReverseHolo ? "RH" : "";

              return (
                <div
                  key={cardNumber}
                  className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <EyeSlashIcon className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      #{displayNumber}
                      {cardType && (
                        <span className="text-xs ml-1 text-red-600">
                          {cardType}
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMissingCard(cardNumber)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                    title="Mark as collected"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {missingCards.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No missing cards tracked yet
        </div>
      )}

      <div className="text-xs text-slate-500">
        💡 Add card numbers you're missing to track your collection progress.
        Cards will be visually marked in the binder.
        <br />
        Use "rh" suffix for reverse holos (e.g., #25rh).
      </div>
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
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          <span>You have unsaved changes</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveToCloud}
        disabled={!user || isLoading || binderSyncStatus?.status === "saving"}
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
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

const BinderSidebar = ({
  binder,
  onGridSizeChange,
  onNameChange,
  onCollapseChange,
  onSortChange,
  onAutoSortChange,
  isCollapsed = false,
  isReadOnly = false,
  isMobile = false,
}) => {
  const { updateBinderMetadata, downloadBinderFromCloud } = useBinderContext();
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const handleToggleCollapse = () => {
    if (onCollapseChange) {
      onCollapseChange(!isCollapsed);
    }
  };

  const handleToggleCardVisibility = async (cardNumber, isMissing) => {
    if (!binder) return;

    const currentMissingCards = binder.metadata?.missingCards || [];
    let updatedMissingCards;

    if (isMissing) {
      // Add to missing cards
      updatedMissingCards = [...currentMissingCards, cardNumber];
    } else {
      // Remove from missing cards
      updatedMissingCards = currentMissingCards.filter(
        (num) => num !== cardNumber
      );
    }

    // Update binder metadata
    await updateBinderMetadata(binder.id, {
      missingCards: updatedMissingCards,
    });
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

        {/* Sort Controls */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Card Sorting
          </label>
          <SortControls
            currentSortBy={binder.settings?.sortBy || "custom"}
            autoSort={binder.settings?.autoSort || false}
            onSortChange={onSortChange}
            onAutoSortChange={onAutoSortChange}
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
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed top-16 bottom-0 bg-white border-l border-slate-200 transition-all duration-300 z-30 w-80 flex flex-col shadow-lg ${
          isCollapsed ? "translate-x-full" : "translate-x-0"
        }`}
        style={{ right: 0 }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Binder Settings</h3>
          </div>
          <button
            onClick={handleToggleCollapse}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close sidebar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
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

          {/* Sort Controls */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Card Sorting
            </label>
            <SortControls
              currentSortBy={binder.settings?.sortBy || "custom"}
              autoSort={binder.settings?.autoSort || false}
              onSortChange={onSortChange}
              onAutoSortChange={onAutoSortChange}
              className="w-full"
            />
          </div>

          {/* Page Manager */}
          <PageManager binder={binder} />

          {/* Note: Missing card tracking is now handled via hover buttons on individual cards */}
        </div>

        {/* Sync Button at the bottom */}
        <div className="border-t border-slate-200 p-4">
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
    </>
  );
};

export default BinderSidebar;
