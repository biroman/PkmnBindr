import PropTypes from "prop-types";
import { PlusIcon } from "@heroicons/react/24/outline";

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
}) => {
  const { canGoNext, canGoPrev, goToPrevPage, goToNextPage } = navigation;

  // Don't show navigation during drag operations
  if (activeCard) {
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

  // Mobile layout - navigation at bottom
  if (isMobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}>
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Left Navigation Button */}
            <button
              onClick={goToPrevPage}
              disabled={!canGoPrev}
              className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
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

            {/* Page Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-900">
                {getCurrentPageText()}
              </span>
            </div>

            {/* Right Navigation Button */}
            <button
              onClick={showAddPage && !canGoNext ? onAddPage : goToNextPage}
              disabled={!showAddPage && !canGoNext}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
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
};

export default BinderNavigation;
