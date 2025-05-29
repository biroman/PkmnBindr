import { useState, useEffect } from "react";
import { useTheme } from "../../theme/ThemeContent";
import {
  X,
  ArrowLeft,
  ArrowRight,
  SkipBack,
  SkipForward,
  Plus,
  Move,
  AlertTriangle,
} from "lucide-react";
import PropTypes from "prop-types";
import logger from "../../utils/logger";

const MoveCardsModal = ({
  isOpen,
  onClose,
  selectedCards,
  currentPage,
  totalPages,
  onMoveCards,
}) => {
  const { theme } = useTheme();
  const [targetPage, setTargetPage] = useState(currentPage + 1); // Display as 1-indexed
  const [moveOption, setMoveOption] = useState("insert"); // "insert" or "newPage"
  const [isLoading, setIsLoading] = useState(false);

  // Reset target page when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetPage(currentPage + 1);
      setMoveOption("insert");
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleMove = async () => {
    setIsLoading(true);
    try {
      const targetPageIndex = targetPage - 1; // Convert back to 0-indexed
      await onMoveCards(selectedCards, targetPageIndex, moveOption);
      onClose();
    } catch (error) {
      logger.error("Error moving cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      setTargetPage(value);
    }
  };

  const navigateToPage = (direction) => {
    switch (direction) {
      case "first":
        setTargetPage(1);
        break;
      case "prev":
        setTargetPage(Math.max(1, targetPage - 1));
        break;
      case "next":
        setTargetPage(targetPage + 1);
        break;
      case "last":
        setTargetPage(totalPages);
        break;
      case "new":
        setTargetPage(totalPages + 1);
        setMoveOption("newPage");
        break;
    }
  };

  const isTargetPageNew = targetPage > totalPages;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${theme.colors.background.card} rounded-xl shadow-2xl border ${theme.colors.border.accent} w-full max-w-md`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${theme.colors.background.sidebar} flex items-center justify-center`}
            >
              <Move className={`w-5 h-5 ${theme.colors.text.accent}`} />
            </div>
            <div>
              <h2
                className={`text-lg font-semibold ${theme.colors.text.primary}`}
              >
                Move Cards
              </h2>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                Moving {selectedCards.length} card
                {selectedCards.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-all duration-200`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Cards Preview */}
        <div className="p-6 border-b border-gray-700/50">
          <h3
            className={`text-sm font-medium ${theme.colors.text.accent} mb-3`}
          >
            Selected Cards
          </h3>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {selectedCards.map((cardData) => (
              <div
                key={`${cardData.card.id}-${cardData.globalIndex}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme.colors.background.sidebar} border ${theme.colors.border.light}`}
              >
                <img
                  src={cardData.card.images.small}
                  alt={cardData.card.name}
                  className="w-6 h-8 object-contain rounded"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs font-medium ${theme.colors.text.primary} truncate`}
                  >
                    {cardData.card.name}
                  </div>
                  <div className={`text-xs ${theme.colors.text.secondary}`}>
                    #{cardData.card.number}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Destination Selection */}
        <div className="p-6">
          <h3
            className={`text-sm font-medium ${theme.colors.text.accent} mb-4`}
          >
            Choose Destination
          </h3>

          {/* Page Navigation */}
          <div className="space-y-4">
            {/* Quick Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateToPage("first")}
                disabled={targetPage === 1}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200`}
                title="First page"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateToPage("prev")}
                disabled={targetPage === 1}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200`}
                title="Previous page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Page Input */}
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-sm ${theme.colors.text.secondary}`}>
                  Page:
                </span>
                <input
                  type="number"
                  min="1"
                  value={targetPage}
                  onChange={handlePageInputChange}
                  className={`w-20 px-3 py-2 rounded-lg text-center ${theme.colors.background.sidebar} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
                <span className={`text-sm ${theme.colors.text.secondary}`}>
                  of {totalPages}
                </span>
              </div>

              <button
                onClick={() => navigateToPage("next")}
                disabled={targetPage >= totalPages && !isTargetPageNew}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200`}
                title="Next page"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateToPage("last")}
                disabled={targetPage === totalPages}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200`}
                title="Last page"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* New Page Option */}
            <button
              onClick={() => navigateToPage("new")}
              className={`w-full p-3 rounded-lg border-2 border-dashed ${
                isTargetPageNew
                  ? "border-blue-500 bg-blue-500/10"
                  : `border-gray-600 ${theme.colors.background.sidebar}`
              } hover:border-blue-400 transition-all duration-200 flex items-center justify-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              <span
                className={`text-sm font-medium ${theme.colors.text.primary}`}
              >
                Create New Page (Page {totalPages + 1})
              </span>
            </button>

            {/* Move Options */}
            {!isTargetPageNew && (
              <div className="space-y-3">
                <h4
                  className={`text-sm font-medium ${theme.colors.text.accent}`}
                >
                  How to handle existing cards:
                </h4>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="moveOption"
                      value="insert"
                      checked={moveOption === "insert"}
                      onChange={(e) => setMoveOption(e.target.value)}
                      className="mt-1 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <div
                        className={`text-sm font-medium ${theme.colors.text.primary}`}
                      >
                        Insert and shift existing cards
                      </div>
                      <div className={`text-xs ${theme.colors.text.secondary}`}>
                        Cards will be inserted at the beginning of the page,
                        pushing existing cards forward
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="moveOption"
                      value="fill"
                      checked={moveOption === "fill"}
                      onChange={(e) => setMoveOption(e.target.value)}
                      className="mt-1 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <div
                        className={`text-sm font-medium ${theme.colors.text.primary}`}
                      >
                        Fill empty slots only
                      </div>
                      <div className={`text-xs ${theme.colors.text.secondary}`}>
                        Cards will only be placed in empty slots on the target
                        page
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Warning for new page */}
            {isTargetPageNew && (
              <div
                className={`p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3`}
              >
                <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm font-medium text-blue-400`}>
                    Creating New Page
                  </div>
                  <div className={`text-xs text-blue-300`}>
                    A new page will be created at the end of your collection
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg ${theme.colors.button.secondary} font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isLoading || selectedCards.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg ${theme.colors.button.primary} font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <Move className="w-4 h-4" />
                Move Cards
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

MoveCardsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedCards: PropTypes.array.isRequired,
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onMoveCards: PropTypes.func.isRequired,
};

export default MoveCardsModal;
