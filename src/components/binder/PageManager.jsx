import { useState, useEffect } from "react";
import { PlusIcon, MinusIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import BinderUsageStatus from "./BinderUsageStatus";

const PageManager = ({ binder, className = "" }) => {
  const { addPage, removePage, getPageCount } = useBinderContext();
  const [targetPageCount, setTargetPageCount] = useState(0);

  useEffect(() => {
    if (binder) {
      setTargetPageCount(getPageCount(binder.id));
    }
  }, [binder, getPageCount]);

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

  const handlePageChange = async (newCount) => {
    if (newCount < minPages || newCount > maxPages) {
      return;
    }

    const diff = newCount - currentPageCount;
    if (diff > 0) {
      // Add pages
      for (let i = 0; i < diff; i++) {
        await addPage(binder.id);
      }
    } else if (diff < 0) {
      // Remove pages
      for (let i = 0; i < Math.abs(diff); i++) {
        await removePage(binder.id);
      }
    }
  };

  const handleIncrement = () => handlePageChange(currentPageCount + 1);
  const handleDecrement = () => handlePageChange(currentPageCount - 1);

  const canAddPage = currentPageCount < maxPages;
  const canRemovePage = currentPageCount > minPages;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          Page Management
        </label>
        <div className="text-xs text-slate-500">
          {currentPageCount} of {maxPages} pages
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDecrement}
          disabled={currentPageCount <= minPages}
          className="p-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MinusIcon className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex-1 text-center font-semibold text-slate-800 text-sm py-2 px-3 bg-slate-50 border rounded-lg">
          {currentPageCount} Pages
        </div>
        <button
          onClick={handleIncrement}
          disabled={currentPageCount >= maxPages}
          className="p-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      <BinderUsageStatus binder={binder} />
    </div>
  );
};

export default PageManager;
