import { useState } from "react";
import { PlusIcon, MinusIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import BinderUsageStatus from "./BinderUsageStatus";

const PageManager = ({ binder, className = "" }) => {
  const { addPage, removePage, getPageCount } = useBinderContext();

  if (!binder) return null;

  const currentPageCount = getPageCount(binder.id);
  const minPages = binder.settings?.minPages || 1;
  const maxPages = binder.settings?.maxPages || 100;
  const autoExpand = binder.settings?.autoExpand;

  // Calculate total card pages based on binder page count
  const calculateCardPages = () => {
    // First binder page has cover + 1 card page = 1 card page
    // Each additional binder page has 2 card pages
    // Formula: 1 + (binderPages - 1) * 2
    return currentPageCount === 0 ? 0 : 1 + (currentPageCount - 1) * 2;
  };

  const cardPages = calculateCardPages();

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BookOpenIcon className="w-5 h-5 text-slate-600" />
        <div>
          <h3 className="text-sm font-medium text-slate-700">
            Page Management
          </h3>
          <p className="text-xs text-slate-500">
            {currentPageCount} binder / {cardPages} card pages
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Page Count Display */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Binder Pages:</span>
              <span className="font-medium text-gray-900">
                {currentPageCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Card Pages:</span>
              <span className="font-medium text-gray-900">{cardPages}</span>
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

          {/* Usage Status */}
          <div className="border-t border-gray-200 pt-3">
            <BinderUsageStatus binder={binder} />
          </div>
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
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Binder pages are physical spreads you flip through</p>
          <p>• Card pages hold individual cards</p>
          <p>• Pages auto-expand when cards exceed space</p>
          <p>• Can only remove empty pages from end</p>
        </div>
      </div>
    </div>
  );
};

export default PageManager;
