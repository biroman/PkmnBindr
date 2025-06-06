import { useState } from "react";
import { useTheme } from "../../theme/ThemeContent";
import { Clipboard, X, ChevronRight, Plus, Trash2, Star } from "lucide-react";
import PropTypes from "prop-types";
import logger from "../../utils/logger";

const CardClipboard = ({
  clipboardCards,
  onAddToClipboard,
  onRemoveFromClipboard,
  onAddToCurrentPage,
  onClearClipboard,
  currentPage,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { theme } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedCardIndex, setDraggedCardIndex] = useState(null);

  // Extract text color from button.accent class for theme consistency
  const getAccentTextColor = () => {
    const accentButtonClass = theme.colors.button.accent || "";
    if (accentButtonClass.includes("text-white")) return "text-white";
    if (accentButtonClass.includes("text-slate-900")) return "text-slate-900";
    if (accentButtonClass.includes("text-yellow-900")) return "text-yellow-900";
    return "text-white"; // fallback
  };

  // Get high-res image URL
  const getHighResImageUrl = (card) => {
    // Fallback to small image if set info is missing
    if (!card.set || !card.set.id || !card.number) {
      return card.images?.small || card.images?.large || "";
    }

    try {
      const setCode = card.set.id.toLowerCase();
      return `https://images.pokemontcg.io/${setCode}/${card.number}.png`;
    } catch (error) {
      logger.debug("Error generating high-res URL, using fallback:", error);
      return card.images?.small || card.images?.large || "";
    }
  };

  const handleDragStart = (e, card, index) => {
    // Set visual feedback for the dragged card
    setDraggedCardIndex(index);

    // Create drag image
    const dragImage = document.createElement("div");
    dragImage.style.width = "80px";
    dragImage.style.height = "112px";
    dragImage.style.background = `url(${getHighResImageUrl(
      card
    )}) center/cover`;
    dragImage.style.borderRadius = "8px";
    dragImage.style.border = "2px solid #3b82f6";
    dragImage.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.transform = "rotate(-5deg) scale(1.1)";

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 40, 56);

    setTimeout(() => document.body.removeChild(dragImage), 0);

    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        card,
        source: "clipboard",
        clipboardIndex: index,
        cardId: card.id,
        isReverseHolo: card.isReverseHolo,
      })
    );
  };

  const handleDragEnd = () => {
    // Clear visual feedback for the dragged card
    setDraggedCardIndex(null);
  };

  // Handle drops from binder cards
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set to false if we're actually leaving the clipboard container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));

      // Extract the actual card object based on the drag source
      let cardToAdd;
      if (dragData.source === "clipboard") {
        // Prevent dropping clipboard cards back onto clipboard
        return;
      } else if (dragData.card) {
        // Card from binder or search
        cardToAdd = dragData.card;
      } else if (dragData.source === "binder") {
        // Direct card object
        cardToAdd = dragData;
      } else {
        // Fallback - assume dragData is the card itself
        cardToAdd = dragData;
      }

      const added = onAddToClipboard(cardToAdd);

      if (!added) {
        logger.debug("Could not add card to clipboard (full or duplicate)");
      }
    } catch (error) {
      logger.error("Error handling drop:", error);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={`fixed right-4 top-20 z-40`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          onClick={onToggleCollapse}
          className={`${
            theme.colors.background.card
          } border rounded-l-xl p-2.5 shadow-lg hover:scale-105 transition-all duration-200 ${
            isDragOver
              ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
              : theme.colors.border.light
          }`}
          title="Open Card Clipboard"
        >
          <div className="flex flex-col items-center gap-1.5">
            <Clipboard className={`w-4 h-4 ${theme.colors.text.accent}`} />
            {clipboardCards.length > 0 && (
              <div
                className={`w-5 h-5 rounded-full ${
                  theme.colors.button.accent
                } flex items-center justify-center text-xs font-medium ${getAccentTextColor()}`}
              >
                {clipboardCards.length}
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-4 top-20 w-72 ${
        theme.colors.background.card
      } rounded-xl shadow-2xl border z-40 max-h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
        isDragOver
          ? "border-blue-500 ring-2 ring-blue-500/30 scale-105"
          : theme.colors.border.light
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className={`${theme.colors.background.sidebar} border-b ${theme.colors.border.light} p-4 rounded-t-xl`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg ${theme.colors.background.main} flex items-center justify-center`}
            >
              <Clipboard className={`w-4 h-4 ${theme.colors.text.accent}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${theme.colors.text.primary}`}>
                Card Clipboard
              </h3>
              <p className={`text-xs ${theme.colors.text.secondary}`}>
                {clipboardCards.length}/5 cards
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {clipboardCards.length > 0 && (
              <button
                onClick={onClearClipboard}
                className={`p-1.5 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
                title="Clear all cards"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
              title="Collapse clipboard"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {clipboardCards.length === 0 ? (
          <div className="text-center py-8">
            <div
              className={`w-16 h-16 rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mx-auto mb-3`}
            >
              <Clipboard className={`w-8 h-8 ${theme.colors.text.secondary}`} />
            </div>
            <p className={`${theme.colors.text.secondary} text-sm mb-2`}>
              No cards in clipboard
            </p>
            <p className={`${theme.colors.text.secondary} text-xs`}>
              Drag cards here to hold them while browsing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clipboardCards.map((card, index) => (
              <div
                key={`${card.id}-${card.isReverseHolo}-${
                  card.clipboardAddedAt || index
                }`}
                className={`relative group cursor-move transition-all duration-200 ${
                  draggedCardIndex === index
                    ? "opacity-50 transform rotate-2 scale-105"
                    : ""
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, card, index)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className={`relative rounded-lg overflow-hidden border-2 ${theme.colors.border.light} hover:border-blue-400 transition-colors`}
                >
                  {/* Card Image */}
                  <img
                    src={getHighResImageUrl(card)}
                    alt={card.name}
                    className="w-full aspect-[5/7] object-cover"
                    onError={(e) => {
                      e.target.src = card.images.small;
                    }}
                  />

                  {/* Reverse Holo Indicator */}
                  {card.isReverseHolo && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Bottom overlay - Action buttons only */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Action buttons */}
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => onAddToCurrentPage(card)}
                        className={`
                          flex-1 px-2 py-2 rounded-lg ${theme.colors.button.success} backdrop-blur-sm bg-opacity-90
                          flex items-center justify-center gap-1 shadow-lg
                          hover:bg-opacity-80 transition-all duration-200
                          text-xs font-medium
                        `}
                        title="Add to current page"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>

                      <button
                        onClick={() => onRemoveFromClipboard(index)}
                        className={`
                          flex-1 px-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm bg-opacity-90
                          flex items-center justify-center gap-1 shadow-lg
                          hover:bg-opacity-80 transition-all duration-200
                          text-xs font-medium
                        `}
                        title="Remove from clipboard"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {clipboardCards.length > 0 && (
        <div className={`border-t ${theme.colors.border.light} p-3`}>
          <button
            onClick={() => {
              // Process cards in reverse order to maintain correct indices
              // When removing from an array, start from the end to avoid index shifting
              for (let i = clipboardCards.length - 1; i >= 0; i--) {
                onAddToCurrentPage(clipboardCards[i]);
              }
            }}
            className={`w-full ${
              theme.colors.button.accent
            } rounded-lg py-2 px-3 text-sm font-medium ${getAccentTextColor()} hover:scale-[1.02] transition-transform flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            Add All to Page {currentPage}
          </button>
        </div>
      )}
    </div>
  );
};

CardClipboard.propTypes = {
  clipboardCards: PropTypes.array.isRequired,
  onAddToClipboard: PropTypes.func.isRequired,
  onRemoveFromClipboard: PropTypes.func.isRequired,
  onAddToCurrentPage: PropTypes.func.isRequired,
  onClearClipboard: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
};

export default CardClipboard;
