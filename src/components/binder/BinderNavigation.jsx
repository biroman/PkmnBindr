import PropTypes from "prop-types";
import { useDroppable } from "@dnd-kit/core";
import {
  PlusIcon,
  Cog6ToothIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  SwatchIcon,
  DocumentArrowDownIcon,
  DocumentPlusIcon,
  TrashIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  EllipsisVerticalIcon,
  ShareIcon,
  CursorArrowRaysIcon,
  ArrowsPointingInIcon,
  BookOpenIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BinderNavigation = ({
  navigation,
  positions,
  onAddPage,
  isReadOnly = false,
  mode = "edit",
  activeCard = null,
  className = "",
  currentPageConfig = null,
  isMobile = false,
  // Mobile toolbar props
  toolbarActions = {},
  isToolbarOpen = false,
  onToggleToolbar = () => {},
  // Drag to delete handler
  onCardDelete = null,
  // Drag progress props
  navigationProgress = 0,
  currentEdgeZone = null,
  // Public view props
  isPublicView = false,
}) => {
  const { canGoNext, canGoPrev, goToPrevPage, goToNextPage } = navigation;

  // Mobile more menu state - must be at top level to avoid conditional hook calls
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  // Handle click outside to close more menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMoreMenuOpen &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isMoreMenuOpen]);

  // Set up droppable for delete zone
  const { isOver: isOverDelete, setNodeRef: setDeleteRef } = useDroppable({
    id: "delete-zone",
    data: {
      type: "delete-zone",
    },
  });

  // Set up droppable zones for edge navigation on mobile
  const { isOver: isOverPrevPage, setNodeRef: setPrevPageRef } = useDroppable({
    id: "mobile-prev-page",
    data: {
      type: "edge-navigation",
      direction: "left",
      canNavigate: canGoPrev,
    },
  });

  const { isOver: isOverNextPage, setNodeRef: setNextPageRef } = useDroppable({
    id: "mobile-next-page",
    data: {
      type: "edge-navigation",
      direction: "right",
      canNavigate: canGoNext,
    },
  });

  // On mobile, show drag-to-delete interface when dragging
  if (activeCard && isMobile) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          {/* Progress Bar */}
          {navigationProgress > 0 &&
            (currentEdgeZone === "left" || currentEdgeZone === "right") && (
              <div className="absolute top-0 left-0 h-1 bg-blue-100 dark:bg-blue-900 w-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${navigationProgress}%` }}
                />
              </div>
            )}

          <div className="flex items-center justify-center max-w-md mx-auto h-12 gap-2">
            {/* Left Navigation Zone */}
            <div
              ref={setPrevPageRef}
              className={`flex-1 flex items-center justify-center h-full rounded-lg border-2 border-dashed transition-all duration-200 ${
                isOverPrevPage && canGoPrev
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-950 scale-105"
                  : canGoPrev
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950"
                  : "border-border bg-secondary opacity-50"
              }`}
            >
              <ChevronLeft
                className={`w-5 h-5 mr-1 transition-colors ${
                  isOverPrevPage && canGoPrev
                    ? "text-blue-600 dark:text-blue-400"
                    : canGoPrev
                    ? "text-blue-400 dark:text-blue-500"
                    : "text-secondary"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isOverPrevPage && canGoPrev
                    ? "text-blue-700 dark:text-blue-300"
                    : canGoPrev
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-secondary"
                }`}
              >
                {isOverPrevPage && canGoPrev
                  ? "Release to Go Back"
                  : "Previous"}
              </span>
            </div>

            {/* Drag to delete zone */}
            <div
              ref={setDeleteRef}
              className={`flex-1 flex items-center justify-center h-full rounded-lg border-2 border-dashed transition-all duration-200 ${
                isOverDelete
                  ? "border-red-500 bg-red-100 dark:bg-red-950 scale-105"
                  : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950"
              }`}
            >
              <TrashIcon
                className={`w-5 h-5 mr-1 transition-colors ${
                  isOverDelete
                    ? "text-red-600 dark:text-red-400"
                    : "text-red-400 dark:text-red-500"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isOverDelete
                    ? "text-red-700 dark:text-red-300"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {isOverDelete ? "Release to Delete" : "Delete"}
              </span>
            </div>

            {/* Right Navigation Zone */}
            <div
              ref={setNextPageRef}
              className={`flex-1 flex items-center justify-center h-full rounded-lg border-2 border-dashed transition-all duration-200 ${
                isOverNextPage && canGoNext
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-950 scale-105"
                  : canGoNext
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950"
                  : "border-border bg-secondary opacity-50"
              }`}
            >
              <span
                className={`text-xs font-medium mr-1 transition-colors ${
                  isOverNextPage && canGoNext
                    ? "text-blue-700 dark:text-blue-300"
                    : canGoNext
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-secondary"
                }`}
              >
                {isOverNextPage && canGoNext ? "Release to Go Forward" : "Next"}
              </span>
              <ChevronRight
                className={`w-5 h-5 transition-colors ${
                  isOverNextPage && canGoNext
                    ? "text-blue-600 dark:text-blue-400"
                    : canGoNext
                    ? "text-blue-400 dark:text-blue-500"
                    : "text-secondary"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show navigation during drag operations on desktop
  if (activeCard && !isMobile) {
    return null;
  }

  // Don't show add page functionality in readonly modes
  const showAddPage = !isReadOnly && mode === "edit";

  // Get current page display text
  const getCurrentPageText = () => {
    if (!currentPageConfig) return "Page 1";

    // Check if we're on the cover page
    if (currentPageConfig.leftPage.type === "cover") {
      return "Cover";
    }

    // For card pages, show the page number
    if (isMobile) {
      // On mobile, show single page number
      return `Page ${currentPageConfig.leftPage.pageNumber || 1}`;
    } else {
      // On desktop, show both page numbers
      const leftPage = currentPageConfig.leftPage.pageNumber;
      const rightPage = currentPageConfig.rightPage.pageNumber;
      return `Pages ${leftPage}-${rightPage}`;
    }
  };

  // Mobile layout - A refined single-row navigation bar with a "More" menu
  if (isMobile) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-3 py-2">
          <div
            className={`flex items-center ${
              isPublicView
                ? "w-full justify-center"
                : "max-w-md mx-auto justify-between"
            } gap-2`}
          >
            {/* Page Navigation - Expanded in public view */}
            <div
              className={`flex items-center gap-1 ${
                isPublicView ? "w-full justify-between" : ""
              }`}
            >
              <button
                onClick={goToPrevPage}
                disabled={!canGoPrev}
                className="flex items-center justify-center w-16 h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                title="Previous Page"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors" />
              </button>
              <div className="text-base font-bold text-gray-900 dark:text-gray-100 flex-1 text-center px-4">
                {getCurrentPageText()}
              </div>
              <button
                onClick={showAddPage && !canGoNext ? onAddPage : goToNextPage}
                disabled={!showAddPage && !canGoNext}
                className={`flex items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                  showAddPage && !canGoNext
                    ? "border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 bg-white dark:bg-gray-800"
                    : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-700 dark:text-gray-300"
                }`}
                title={showAddPage && !canGoNext ? "Add Page" : "Next Page"}
              >
                {showAddPage && !canGoNext ? (
                  <DocumentPlusIcon className="w-6 h-6 transition-colors" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors" />
                )}
              </button>
            </div>

            {/* Actions - Only show if not in public view or has actions */}
            {!isPublicView &&
              (toolbarActions.onAddCard ||
                Object.keys(toolbarActions).length > 0) && (
                <div className="flex items-center gap-2">
                  {toolbarActions.onAddCard && (
                    <button
                      onClick={toolbarActions.onAddCard}
                      className="flex items-center justify-center h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                      title="Add Card"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  )}
                  {/* "More" Menu - Hidden in public view */}
                  {!isPublicView && (
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className="flex items-center justify-center w-11 h-11 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="More Actions"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>

                      {isMoreMenuOpen && (
                        <div
                          className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden"
                          onClick={() => setIsMoreMenuOpen(false)}
                        >
                          <div className="py-1">
                            {toolbarActions.onPageOverview && (
                              <button
                                onClick={toolbarActions.onPageOverview}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Squares2X2Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Page Overview</span>
                              </button>
                            )}
                            {/* --- Selection & Reorder Group --- */}
                            {toolbarActions.onToggleSelectionMode && (
                              <button
                                onClick={toolbarActions.onToggleSelectionMode}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  toolbarActions.selectionMode
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <CursorArrowRaysIcon
                                  className={`w-5 h-5 ${
                                    toolbarActions.selectionMode
                                      ? "text-green-500 dark:text-green-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                />
                                <span>
                                  {toolbarActions.selectionMode
                                    ? "Done Selecting"
                                    : "Select Cards"}
                                </span>
                              </button>
                            )}
                            {toolbarActions.onToggleReorderMode && (
                              <button
                                onClick={toolbarActions.onToggleReorderMode}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  toolbarActions.reorderMode === "shift"
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <ArrowsRightLeftIcon
                                  className={`w-5 h-5 ${
                                    toolbarActions.reorderMode === "shift"
                                      ? "text-purple-500 dark:text-purple-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                />
                                <span>
                                  {toolbarActions.reorderMode === "shift"
                                    ? "Shift Mode"
                                    : "Swap Mode"}
                                </span>
                              </button>
                            )}
                            {(toolbarActions.onToggleSelectionMode ||
                              toolbarActions.onToggleReorderMode) && (
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            )}
                            {toolbarActions.onCompactPage && (
                              <button
                                onClick={toolbarActions.onCompactPage}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <ArrowsPointingInIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Compact Page</span>
                              </button>
                            )}
                            {toolbarActions.onCompactBinder && (
                              <button
                                onClick={toolbarActions.onCompactBinder}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <BookOpenIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Compact Binder</span>
                              </button>
                            )}
                            {(toolbarActions.onCompactPage ||
                              toolbarActions.onCompactBinder) && (
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            )}
                            {toolbarActions.onColorPicker && (
                              <button
                                onClick={toolbarActions.onColorPicker}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <SwatchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Customize</span>
                              </button>
                            )}
                            {toolbarActions.onMobileSettings && (
                              <button
                                onClick={toolbarActions.onMobileSettings}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Cog6ToothIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Settings</span>
                              </button>
                            )}
                            {toolbarActions.onShare && (
                              <button
                                onClick={toolbarActions.onShare}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <ShareIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <span>Share Binder</span>
                              </button>
                            )}
                            {(toolbarActions.onColorPicker ||
                              toolbarActions.onMobileSettings ||
                              toolbarActions.onShare) && (
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            )}
                            {toolbarActions.onClearBinder && (
                              <button
                                onClick={toolbarActions.onClearBinder}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <TrashIcon className="w-5 h-5" />
                                <span>Clear Binder</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout (existing logic)
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Left Navigation Button */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 pointer-events-auto"
        style={{ left: positions.left }}
      >
        <button
          onClick={goToPrevPage}
          disabled={!canGoPrev}
          className="w-14 h-14 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-xl hover:shadow-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-7 h-7 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* Right Navigation Button */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 pointer-events-auto"
        style={{ right: positions.right }}
      >
        <button
          onClick={showAddPage && !canGoNext ? onAddPage : goToNextPage}
          disabled={!showAddPage && !canGoNext}
          className={`w-14 h-14 backdrop-blur-sm rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center ${
            showAddPage && !canGoNext
              ? "bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-400 hover:border-blue-500"
              : "bg-white/95 dark:bg-gray-800/95 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
          title={showAddPage && !canGoNext ? "Add New Page" : "Next Page"}
          aria-label={
            showAddPage && !canGoNext ? "Add new page" : "Go to next page"
          }
        >
          {showAddPage && !canGoNext ? (
            <PlusIcon className="w-7 h-7" />
          ) : (
            <ChevronRight className="w-7 h-7 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors" />
          )}
        </button>
      </div>
    </div>
  );
};

BinderNavigation.propTypes = {
  navigation: PropTypes.shape({
    canGoNext: PropTypes.bool.isRequired,
    canGoPrev: PropTypes.bool.isRequired,
    goToNextPage: PropTypes.func.isRequired,
    goToPrevPage: PropTypes.func.isRequired,
  }).isRequired,
  positions: PropTypes.shape({
    left: PropTypes.string.isRequired,
    right: PropTypes.string.isRequired,
  }).isRequired,
  onAddPage: PropTypes.func,
  isReadOnly: PropTypes.bool,
  mode: PropTypes.oneOf(["edit", "readonly", "admin", "preview"]),
  activeCard: PropTypes.object,
  className: PropTypes.string,
  currentPageConfig: PropTypes.object,
  isMobile: PropTypes.bool,
  // Mobile toolbar props
  toolbarActions: PropTypes.shape({
    onAddCard: PropTypes.func,
    onPageOverview: PropTypes.func,
    onShare: PropTypes.func,
    onColorPicker: PropTypes.func,
    onMobileSettings: PropTypes.func,
    onToggleSelectionMode: PropTypes.func,
    selectionMode: PropTypes.bool,
    onClearBinder: PropTypes.func,
    onCompactPage: PropTypes.func,
    onCompactBinder: PropTypes.func,
    onToggleReorderMode: PropTypes.func,
    reorderMode: PropTypes.string,
  }),
  isToolbarOpen: PropTypes.bool,
  onToggleToolbar: PropTypes.func,
  onCardDelete: PropTypes.func,
  // Drag progress props
  navigationProgress: PropTypes.number,
  currentEdgeZone: PropTypes.string,
};

export default BinderNavigation;
