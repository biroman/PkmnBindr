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
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { toast } from "react-hot-toast";
import PageManager from "./PageManager";

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

  const handleSave = () => {
    const trimmedName = tempName.trim();
    if (trimmedName && trimmedName !== currentName) {
      onNameChange(trimmedName);
      toast.success("Binder name updated!");
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(currentName);
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Binder Name
      </label>
      {isEditing ? (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter binder name..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!tempName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg transition-colors text-sm"
            >
              <CheckIcon className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </button>
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

const BinderSidebar = ({
  binder,
  onGridSizeChange,
  onNameChange,
  onCollapseChange,
  isCollapsed = false,
}) => {
  const { updateBinderMetadata } = useBinderContext();

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

  if (!binder) return null;

  return (
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

        {/* Page Manager */}
        <PageManager binder={binder} />

        {/* Note: Missing card tracking is now handled via hover buttons on individual cards */}
      </div>
    </div>
  );
};

export default BinderSidebar;
