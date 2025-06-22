import PropTypes from "prop-types";
import { useDroppable } from "@dnd-kit/core";
import {
  PlusIcon,
  Cog6ToothIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  SwatchIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

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
}) => {
  const { canGoNext, canGoPrev, goToPrevPage, goToNextPage } = navigation;

  // Set up droppable for delete zone
  const { isOver: isOverDelete, setNodeRef: setDeleteRef } = useDroppable({
    id: "delete-zone",
    data: {
      type: "delete-zone",
    },
  });

  // On mobile, show drag-to-delete interface when dragging
  if (activeCard && isMobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}>
        <div className="bg-red-50/95 backdrop-blur-sm border-t border-red-200 px-4 py-3">
          <div className="flex items-center justify-center max-w-md mx-auto h-12">
            {/* Drag to delete zone */}
            <div
              ref={setDeleteRef}
              className={`flex items-center justify-center w-full h-full rounded-lg border-2 border-dashed transition-all duration-200 ${
                isOverDelete
                  ? "border-red-500 bg-red-100 scale-105"
                  : "border-red-300 bg-red-50"
              }`}
            >
              <TrashIcon
                className={`w-6 h-6 mr-2 transition-colors ${
                  isOverDelete ? "text-red-600" : "text-red-400"
                }`}
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isOverDelete ? "text-red-700" : "text-red-500"
                }`}
              >
                {isOverDelete ? "Release to Delete" : "Drop to Delete"}
              </span>
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

  // Mobile layout - navigation with inline toolbar
  if (isMobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}>
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Left Navigation Button */}
            <button
              onClick={goToPrevPage}
              disabled={!canGoPrev}
              className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors flex-shrink-0"
              title="Previous Page"
              aria-label="Go to previous page"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Center section - switches between page info and toolbar */}
            <div className="flex-1 flex items-center justify-center mx-4 min-w-0">
              {isToolbarOpen ? (
                /* Toolbar Mode - Scrollable toolbar icons */
                <div className="flex items-center w-full relative">
                  {/* Left fade indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/95 to-transparent pointer-events-none z-10"></div>

                  {/* Scrollable toolbar container */}
                  <div className="flex-1 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center space-x-2 px-4 min-w-max">
                      {/* Add Card - Primary action */}
                      {toolbarActions.onAddCard && (
                        <button
                          onClick={toolbarActions.onAddCard}
                          className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex-shrink-0"
                          title="Add Cards"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* Page Overview */}
                      {toolbarActions.onPageOverview && (
                        <button
                          onClick={toolbarActions.onPageOverview}
                          className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex-shrink-0"
                          title="Page Overview"
                        >
                          <Squares2X2Icon className="w-5 h-5" />
                        </button>
                      )}

                      {/* Color Picker */}
                      {toolbarActions.onColorPicker && (
                        <button
                          onClick={toolbarActions.onColorPicker}
                          className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex-shrink-0"
                          title="Customize Color"
                        >
                          <SwatchIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* Settings */}
                      {toolbarActions.onMobileSettings && (
                        <button
                          onClick={toolbarActions.onMobileSettings}
                          className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex-shrink-0"
                          title="Settings"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* PDF Export - Hidden on mobile */}
                      {toolbarActions.onPdfExport && false && (
                        <button
                          onClick={toolbarActions.onPdfExport}
                          className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex-shrink-0"
                          title="Export PDF"
                        >
                          <DocumentArrowDownIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* Clear Binder */}
                      {toolbarActions.onClearBinder && (
                        <button
                          onClick={toolbarActions.onClearBinder}
                          className="flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors flex-shrink-0"
                          title="Clear Binder"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right fade indicator */}
                  <div className="absolute right-10 top-0 bottom-0 w-4 bg-gradient-to-l from-white/95 to-transparent pointer-events-none z-10"></div>

                  {/* Close toolbar button - always visible */}
                  <button
                    onClick={onToggleToolbar}
                    className="flex items-center justify-center w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors ml-2 flex-shrink-0"
                    title="Close Toolbar"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* Navigation Mode - Show page info and toolbar toggle */
                <div className="flex items-center space-x-3">
                  {/* Page Indicator */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {getCurrentPageText()}
                    </span>
                  </div>

                  {/* Toolbar Toggle Button */}
                  <button
                    onClick={onToggleToolbar}
                    className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                    title="Open Toolbar"
                    aria-label="Open toolbar"
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Navigation Button */}
            <button
              onClick={showAddPage && !canGoNext ? onAddPage : goToNextPage}
              disabled={!showAddPage && !canGoNext}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors flex-shrink-0 ${
                showAddPage && !canGoNext
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              title={showAddPage && !canGoNext ? "Add New Page" : "Next Page"}
              aria-label={
                showAddPage && !canGoNext ? "Add new page" : "Go to next page"
              }
            >
              {showAddPage && !canGoNext ? (
                <PlusIcon className="w-6 h-6" />
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
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
          className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
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
          className={`w-12 h-12 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${
            showAddPage && !canGoNext
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-white/90 hover:bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
          title={showAddPage && !canGoNext ? "Add New Page" : "Next Page"}
          aria-label={
            showAddPage && !canGoNext ? "Add new page" : "Go to next page"
          }
        >
          {showAddPage && !canGoNext ? (
            <PlusIcon className="w-6 h-6" />
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
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
};

export default BinderNavigation;
