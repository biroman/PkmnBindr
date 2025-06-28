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
} from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";

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
        <div className="relative bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          {/* Progress Bar */}
          {navigationProgress > 0 &&
            (currentEdgeZone === "left" || currentEdgeZone === "right") && (
              <div className="absolute top-0 left-0 h-1 bg-blue-100 w-full">
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
                  ? "border-blue-500 bg-blue-100 scale-105"
                  : canGoPrev
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-300 bg-gray-50 opacity-50"
              }`}
            >
              <svg
                className={`w-5 h-5 mr-1 transition-colors ${
                  isOverPrevPage && canGoPrev
                    ? "text-blue-600"
                    : canGoPrev
                    ? "text-blue-400"
                    : "text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span
                className={`text-xs font-medium transition-colors ${
                  isOverPrevPage && canGoPrev
                    ? "text-blue-700"
                    : canGoPrev
                    ? "text-blue-500"
                    : "text-gray-400"
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
                  ? "border-red-500 bg-red-100 scale-105"
                  : "border-red-300 bg-red-50"
              }`}
            >
              <TrashIcon
                className={`w-5 h-5 mr-1 transition-colors ${
                  isOverDelete ? "text-red-600" : "text-red-400"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isOverDelete ? "text-red-700" : "text-red-500"
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
                  ? "border-blue-500 bg-blue-100 scale-105"
                  : canGoNext
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-300 bg-gray-50 opacity-50"
              }`}
            >
              <span
                className={`text-xs font-medium mr-1 transition-colors ${
                  isOverNextPage && canGoNext
                    ? "text-blue-700"
                    : canGoNext
                    ? "text-blue-500"
                    : "text-gray-400"
                }`}
              >
                {isOverNextPage && canGoNext ? "Release to Go Forward" : "Next"}
              </span>
              <svg
                className={`w-5 h-5 transition-colors ${
                  isOverNextPage && canGoNext
                    ? "text-blue-600"
                    : canGoNext
                    ? "text-blue-400"
                    : "text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
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
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-3 py-2">
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
                className="flex items-center justify-center w-16 h-12 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                title="Previous Page"
              >
                <svg
                  className="w-6 h-6 text-gray-700 hover:text-blue-600 transition-colors"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="text-base font-bold text-gray-800 flex-1 text-center px-4">
                {getCurrentPageText()}
              </div>
              <button
                onClick={showAddPage && !canGoNext ? onAddPage : goToNextPage}
                disabled={!showAddPage && !canGoNext}
                className={`flex items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                  showAddPage && !canGoNext
                    ? "border-2 border-blue-500 text-blue-600 hover:bg-blue-50 bg-white"
                    : "bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700"
                }`}
                title={showAddPage && !canGoNext ? "Add Page" : "Next Page"}
              >
                {showAddPage && !canGoNext ? (
                  <DocumentPlusIcon className="w-6 h-6 transition-colors" />
                ) : (
                  <svg
                    className="w-6 h-6 hover:text-blue-600 transition-colors"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
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
                        className="flex items-center justify-center w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="More Actions"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                      </button>

                      {isMoreMenuOpen && (
                        <div
                          className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden"
                          onClick={() => setIsMoreMenuOpen(false)}
                        >
                          <div className="py-1">
                            {toolbarActions.onPageOverview && (
                              <button
                                onClick={toolbarActions.onPageOverview}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Squares2X2Icon className="w-5 h-5 text-gray-500" />
                                <span>Page Overview</span>
                              </button>
                            )}
                            {toolbarActions.onShare && (
                              <button
                                onClick={toolbarActions.onShare}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <ShareIcon className="w-5 h-5 text-gray-500" />
                                <span>Share Binder</span>
                              </button>
                            )}
                            {toolbarActions.onColorPicker && (
                              <button
                                onClick={toolbarActions.onColorPicker}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <SwatchIcon className="w-5 h-5 text-gray-500" />
                                <span>Customize</span>
                              </button>
                            )}
                            {toolbarActions.onMobileSettings && (
                              <button
                                onClick={toolbarActions.onMobileSettings}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                                <span>Settings</span>
                              </button>
                            )}
                            <div className="border-t border-gray-100 my-1"></div>
                            {toolbarActions.onClearBinder && (
                              <button
                                onClick={toolbarActions.onClearBinder}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
          className="w-14 h-14 bg-white/95 backdrop-blur-sm rounded-full shadow-xl hover:shadow-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <svg
            className="w-7 h-7 text-gray-700 hover:text-blue-600 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
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
              : "bg-white/95 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
          title={showAddPage && !canGoNext ? "Add New Page" : "Next Page"}
          aria-label={
            showAddPage && !canGoNext ? "Add new page" : "Go to next page"
          }
        >
          {showAddPage && !canGoNext ? (
            <PlusIcon className="w-7 h-7" />
          ) : (
            <svg
              className="w-7 h-7 hover:text-blue-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
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
    onColorPicker: PropTypes.func,
    onMobileSettings: PropTypes.func,
    onPdfExport: PropTypes.func,
    onClearBinder: PropTypes.func,
  }),
  isToolbarOpen: PropTypes.bool,
  onToggleToolbar: PropTypes.func,
  onCardDelete: PropTypes.func,
  // Drag progress props
  navigationProgress: PropTypes.number,
  currentEdgeZone: PropTypes.string,
};

export default BinderNavigation;
