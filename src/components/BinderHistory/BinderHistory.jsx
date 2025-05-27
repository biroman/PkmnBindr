import { useState } from "react";
import { useTheme } from "../../theme/ThemeContent";
import {
  History,
  Trash2,
  Clock,
  Plus,
  Minus,
  ArrowRightLeft,
  ArrowUpDown,
  Undo2,
  Redo2,
  AlertTriangle,
  X,
} from "lucide-react";
import PropTypes from "prop-types";

const BinderHistory = ({
  historyEntries,
  onRevertToEntry,
  onClearHistory,
  onNavigateHistory,
  canNavigateBack,
  canNavigateForward,
  currentPosition,
  isCollapsed,
  onToggleCollapse,
  onNavigateToPage,
  cardsPerPage = 9, // New prop for accurate page calculation
}) => {
  const { theme } = useTheme();
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [hoveredRevertIndex, setHoveredRevertIndex] = useState(null);

  const handleClearHistory = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearHistory = () => {
    onClearHistory();
    setShowClearConfirmation(false);
  };

  const cancelClearHistory = () => {
    setShowClearConfirmation(false);
  };

  // Helper function to calculate which page a position belongs to
  const calculatePageFromPosition = (position, cardsPerPage) => {
    if (position < cardsPerPage) {
      return 0; // Cover page (right side only)
    }

    // For positions beyond the first page, calculate which physical page
    const physicalPage = Math.floor(position / cardsPerPage);

    // Convert physical page to binder page (accounting for left/right layout)
    // Physical pages 0 = binder page 0 (cover)
    // Physical pages 1,2 = binder page 1 (left/right)
    // Physical pages 3,4 = binder page 2 (left/right)
    // etc.
    if (physicalPage === 0) {
      return 0;
    } else {
      return Math.ceil(physicalPage / 2);
    }
  };

  const handleRevertWithPageNavigation = (entryId) => {
    const entry = historyEntries.find((e) => e.id === entryId);
    if (entry && onNavigateToPage) {
      // Calculate page based on the position in the entry
      let targetPosition = null;

      if (entry.position !== undefined) {
        targetPosition = entry.position;
      } else if (entry.toPosition !== undefined) {
        targetPosition = entry.toPosition;
      } else if (entry.fromPosition !== undefined) {
        targetPosition = entry.fromPosition;
      } else if (
        entry.action === "bulk_move" &&
        entry.targetPosition !== undefined
      ) {
        targetPosition = entry.targetPosition;
      }

      if (targetPosition !== null) {
        const targetPage = calculatePageFromPosition(
          targetPosition,
          cardsPerPage
        );
        onNavigateToPage(targetPage);
      }
    }

    onRevertToEntry(entryId);
  };

  const handleNavigateWithPageNavigation = (direction) => {
    // Get the entry we're navigating to
    let targetEntry = null;

    if (direction === "back") {
      if (currentPosition === -1) {
        targetEntry = historyEntries[historyEntries.length - 1];
      } else if (currentPosition > 0) {
        targetEntry = historyEntries[currentPosition - 1];
      }
    } else if (direction === "forward") {
      if (
        currentPosition !== -1 &&
        currentPosition < historyEntries.length - 1
      ) {
        targetEntry = historyEntries[currentPosition + 1];
      }
    }

    if (targetEntry && onNavigateToPage) {
      // Calculate page based on the position in the entry
      let targetPosition = null;

      if (targetEntry.position !== undefined) {
        targetPosition = targetEntry.position;
      } else if (targetEntry.toPosition !== undefined) {
        targetPosition = targetEntry.toPosition;
      } else if (targetEntry.fromPosition !== undefined) {
        targetPosition = targetEntry.fromPosition;
      } else if (
        targetEntry.action === "bulk_move" &&
        targetEntry.targetPosition !== undefined
      ) {
        targetPosition = targetEntry.targetPosition;
      }

      if (targetPosition !== null) {
        const targetPage = calculatePageFromPosition(
          targetPosition,
          cardsPerPage
        );
        onNavigateToPage(targetPage);
      }
    }

    onNavigateHistory(direction);
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const entryTime = new Date(timestamp);
    const diffMs = now - entryTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return entryTime.toLocaleDateString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "add":
        return <Plus className="w-3 h-3 text-green-400" />;
      case "remove":
        return <Minus className="w-3 h-3 text-red-400" />;
      case "move":
        return <ArrowRightLeft className="w-3 h-3 text-blue-400" />;
      case "swap":
        return <ArrowUpDown className="w-3 h-3 text-purple-400" />;
      case "bulk_move":
        return <ArrowRightLeft className="w-3 h-3 text-orange-400" />;
      default:
        return <History className="w-3 h-3 text-gray-400" />;
    }
  };

  const getActionDescription = (entry) => {
    switch (entry.action) {
      case "add":
        return `Added ${entry.cardName} to position ${entry.position + 1}`;
      case "remove":
        return `Removed ${entry.cardName} from position ${entry.position + 1}`;
      case "move":
        return `Moved ${entry.cardName} from ${entry.fromPosition + 1} to ${
          entry.toPosition + 1
        }`;
      case "swap":
        return `Swapped cards at positions ${entry.fromPosition + 1} and ${
          entry.toPosition + 1
        }`;
      case "bulk_move":
        return (
          entry.description ||
          `Moved ${entry.cardCount} cards to page ${entry.targetPage}`
        );
      default:
        return "Unknown action";
    }
  };

  if (isCollapsed) {
    return (
      <div className={`fixed bottom-16 right-4 z-40`}>
        <button
          onClick={onToggleCollapse}
          className={`${theme.colors.background.card} border ${theme.colors.border.light} rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2`}
          title="Open Binder History"
        >
          <History className={`w-4 h-4 ${theme.colors.text.accent}`} />
          <span className={`text-sm font-medium ${theme.colors.text.primary}`}>
            History
          </span>
          {historyEntries.length > 0 && (
            <div
              className={`w-5 h-5 rounded-full ${theme.colors.button.accent} flex items-center justify-center text-xs font-medium ml-1 text-white`}
            >
              {historyEntries.length}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-16 right-4 w-96 ${theme.colors.background.card} border ${theme.colors.border.light} rounded-xl shadow-2xl z-40 max-h-[50vh] flex flex-col transition-all duration-300 ease-out`}
    >
      {/* Header */}
      <div
        className={`${theme.colors.background.sidebar} border-b ${theme.colors.border.light} p-3`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-lg ${theme.colors.background.main} flex items-center justify-center`}
            >
              <History className={`w-4 h-4 ${theme.colors.text.accent}`} />
            </div>
            <div>
              <h3
                className={`font-medium ${theme.colors.text.primary} text-sm`}
              >
                Binder History
              </h3>
              <p className={`text-xs ${theme.colors.text.secondary}`}>
                {historyEntries.length} action
                {historyEntries.length !== 1 ? "s" : ""} •
                {currentPosition !== -1 && (
                  <span className="text-blue-400 ml-1">
                    Position {currentPosition + 1}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Navigation Controls */}
            <button
              onClick={() => handleNavigateWithPageNavigation("back")}
              disabled={!canNavigateBack}
              className={`p-1.5 rounded-md ${theme.colors.button.secondary} hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleNavigateWithPageNavigation("forward")}
              disabled={!canNavigateForward}
              className={`p-1.5 rounded-md ${theme.colors.button.secondary} hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* Divider */}
            {historyEntries.length > 0 && (
              <div className={`w-px h-4 ${theme.colors.border.accent} mx-1`} />
            )}

            {historyEntries.length > 0 && (
              <button
                onClick={handleClearHistory}
                className={`p-1.5 rounded-md ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
                title="Clear all history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-md ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
              title="Close history panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {historyEntries.length === 0 ? (
          <div className="text-center py-8">
            <div
              className={`w-16 h-16 rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mx-auto mb-3`}
            >
              <History className={`w-8 h-8 ${theme.colors.text.secondary}`} />
            </div>
            <p className={`${theme.colors.text.secondary} text-sm mb-2`}>
              No history yet
            </p>
            <p className={`${theme.colors.text.secondary} text-xs`}>
              Actions you perform will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyEntries
              .slice()
              .reverse()
              .map((entry, index) => {
                const originalIndex = historyEntries.length - 1 - index;
                const isCurrentPosition = currentPosition === originalIndex;
                const isAfterCurrentPosition =
                  currentPosition !== -1 && originalIndex > currentPosition;

                // Check if this entry will be affected by reverting to the hovered entry
                const willBeReverted =
                  hoveredRevertIndex !== null && index <= hoveredRevertIndex;
                const isHoveredEntry = hoveredRevertIndex === index;

                return (
                  <div
                    key={entry.id}
                    className={`${
                      theme.colors.background.sidebar
                    } rounded-md p-2.5 border transition-all duration-200 group relative ${
                      isCurrentPosition
                        ? `${theme.colors.border.accent} ring-2 ring-blue-500/50 bg-blue-500/10`
                        : isAfterCurrentPosition
                        ? `${theme.colors.border.accent} opacity-50`
                        : willBeReverted && !isHoveredEntry
                        ? `${theme.colors.border.accent} opacity-40`
                        : isHoveredEntry
                        ? `${theme.colors.border.accent} opacity-60 ring-1 ring-gray-400/50`
                        : `${theme.colors.border.accent} hover:shadow-sm`
                    }`}
                  >
                    {/* Subtle indicator for the target entry */}
                    {isHoveredEntry && (
                      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-gray-400 rounded-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {getActionIcon(entry.action)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${theme.colors.text.primary} leading-tight truncate`}
                            >
                              {getActionDescription(entry)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock
                                className={`w-3 h-3 ${theme.colors.text.secondary}`}
                              />
                              <span
                                className={`text-xs ${theme.colors.text.secondary}`}
                              >
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleRevertWithPageNavigation(entry.id)
                            }
                            onMouseEnter={() => setHoveredRevertIndex(index)}
                            onMouseLeave={() => setHoveredRevertIndex(null)}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded-md ${theme.colors.button.secondary} hover:bg-opacity-80 transition-all duration-200 flex-shrink-0`}
                          >
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer */}
      {historyEntries.length > 0 && (
        <div className={`border-t ${theme.colors.border.light} px-3 py-2`}>
          <div className={`text-xs ${theme.colors.text.secondary} space-y-1`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>💡 Use Ctrl+Z/Y for quick undo/redo</span>
              </div>
              {currentPosition !== -1 && (
                <div className="text-blue-400 font-medium">
                  📍 Viewing position {currentPosition + 1}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear History Confirmation Dialog */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`${theme.colors.background.card} rounded-xl shadow-2xl border ${theme.colors.border.accent} p-6 max-w-sm mx-4`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme.colors.text.primary}`}>
                  Clear History
                </h3>
                <p className={`text-sm ${theme.colors.text.secondary}`}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className={`${theme.colors.text.secondary} mb-6`}>
              Are you sure you want to clear all {historyEntries.length} history
              entries? You will lose the ability to undo or navigate through
              previous actions.
            </p>

            <div className="flex gap-2">
              <button
                onClick={cancelClearHistory}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </div>
              </button>
              <button
                onClick={confirmClearHistory}
                className="flex-1 px-3 py-1.5 text-sm rounded-md bg-red-500 hover:bg-red-600 text-white hover:scale-105 transition-all"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

BinderHistory.propTypes = {
  historyEntries: PropTypes.array.isRequired,
  onRevertToEntry: PropTypes.func.isRequired,
  onClearHistory: PropTypes.func.isRequired,
  onNavigateHistory: PropTypes.func.isRequired,
  canNavigateBack: PropTypes.bool.isRequired,
  canNavigateForward: PropTypes.bool.isRequired,
  currentPosition: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
  onNavigateToPage: PropTypes.func.isRequired,
  cardsPerPage: PropTypes.number,
};

export default BinderHistory;
