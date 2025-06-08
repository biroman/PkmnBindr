import { useState } from "react";
import { PlusIcon, MinusIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";

const PageManager = ({ binder, className = "" }) => {
  const { addPage, removePage, getPageCount } = useBinderContext();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!binder) return null;

  const currentPageCount = getPageCount(binder.id);
  const minPages = binder.settings?.minPages || 1;
  const maxPages = binder.settings?.maxPages || 100;
  const autoExpand = binder.settings?.autoExpand;

  const handleAddPage = async () => {
    try {
      await addPage(binder.id);
    } catch (error) {
      console.error("Error adding page:", error);
    }
  };

  const handleRemovePage = async () => {
    try {
      await removePage(binder.id);
    } catch (error) {
      console.error("Error removing page:", error);
    }
  };

  const canAddPage = currentPageCount < maxPages;
  const canRemovePage = currentPageCount > minPages;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="w-5 h-5 text-gray-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Page Management</h3>
            <p className="text-sm text-gray-500">
              {currentPageCount} page{currentPageCount !== 1 ? "s" : ""} •{" "}
              {minPages}-{maxPages} allowed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {isExpanded ? "Hide" : "Manage"}
          </span>
          <div
            className={`transform transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            {/* Page Count Display */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Pages:</span>
                <span className="font-medium text-gray-900">
                  {currentPageCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Range:</span>
                <span className="text-gray-700">
                  {minPages} - {maxPages}
                </span>
              </div>
              {autoExpand && (
                <div className="mt-2 text-xs text-blue-600">
                  ✓ Auto-expand is enabled
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleAddPage}
                disabled={!canAddPage}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${
                    canAddPage
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
                title={
                  !canAddPage
                    ? `Maximum ${maxPages} pages allowed`
                    : "Add a new page"
                }
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Page</span>
              </button>

              <button
                onClick={handleRemovePage}
                disabled={!canRemovePage}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${
                    canRemovePage
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
                title={
                  !canRemovePage
                    ? `Minimum ${minPages} page${
                        minPages !== 1 ? "s" : ""
                      } required`
                    : "Remove last empty page"
                }
              >
                <MinusIcon className="w-4 h-4" />
                <span>Remove Page</span>
              </button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                • Pages are added automatically when cards exceed current space
              </p>
              <p>• Can only remove empty pages from the end</p>
              <p>• Grid size changes may affect pages needed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageManager;
