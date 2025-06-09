import { useState, useRef } from "react";
import {
  XMarkIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useBinderContext } from "../../contexts/BinderContext";
import { useCardCache } from "../../contexts/CardCacheContext";
import { getGridConfig } from "../../hooks/useBinderDimensions";
import { toast } from "react-hot-toast";

const ITEM_TYPE = "PAGE";

// Draggable Page Component
const DraggablePage = ({
  pageIndex,
  logicalIndex,
  binder,
  gridConfig,
  onPageClick,
  onMovePages,
}) => {
  const { getCardFromCache } = useCardCache();
  const ref = useRef(null);

  // Cover page (pageIndex 0) should not be draggable
  const isCoverPage = pageIndex === 0;
  const isDraggable = !isCoverPage;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { pageIndex, logicalIndex },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item) => {
      // Don't allow dropping on cover page
      if (!isCoverPage && item.logicalIndex !== logicalIndex) {
        onMovePages(item.logicalIndex, logicalIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && !isCoverPage,
    }),
  });

  // Only apply drag/drop if not cover page
  if (isDraggable) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  // Get cards for this page
  const getCardsForPage = (pageIndex) => {
    const cardsPerPage = gridConfig.total;
    const startPosition = pageIndex * cardsPerPage;
    const pageCards = [];

    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardData = binder.cards[globalPosition.toString()];

      if (cardData) {
        const fullCard = getCardFromCache(cardData.cardId);
        pageCards.push(fullCard);
      } else {
        pageCards.push(null);
      }
    }

    return pageCards;
  };

  const pageCards = getCardsForPage(pageIndex);
  const cardCount = pageCards.filter((card) => card !== null).length;
  const isEmpty = cardCount === 0;

  // Calculate grid layout for mini preview
  const getGridLayout = () => {
    switch (gridConfig.name) {
      case "2x2":
        return { cols: 2, rows: 2 };
      case "3x3":
        return { cols: 3, rows: 3 };
      case "4x3":
        return { cols: 4, rows: 3 };
      case "4x4":
        return { cols: 4, rows: 4 };
      default:
        return { cols: 3, rows: 3 };
    }
  };

  const { cols, rows } = getGridLayout();

  return (
    <div
      ref={ref}
      onClick={() => onPageClick(pageIndex)}
      className={`
        relative group transition-all duration-300 transform
        ${
          isCoverPage
            ? "cursor-pointer" // Cover page is clickable but not draggable
            : isDragging
            ? "opacity-50 scale-95 cursor-grabbing"
            : "hover:scale-105 cursor-grab"
        }
        ${isOver ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        ${isEmpty ? "opacity-60" : ""}
        ${isCoverPage ? "ring-2 ring-purple-300" : ""}
      `}
    >
      {/* Page Container */}
      <div
        className={`
        bg-white rounded-xl shadow-lg border-2 transition-all duration-300
        ${
          isOver
            ? "border-blue-400 shadow-xl"
            : "border-slate-200 group-hover:border-slate-300"
        }
        ${isEmpty ? "border-dashed border-slate-300" : ""}
        p-4 aspect-[3/4]
      `}
      >
        {/* Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-bold text-slate-700">
              Page {logicalIndex + 1}
            </div>
            {pageIndex === 0 && (
              <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                Cover • Fixed
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <div className="text-xs text-slate-500">
              {cardCount}/{gridConfig.total}
            </div>
            {!isCoverPage && (
              <ArrowsRightLeftIcon className="w-3 h-3 text-slate-400" />
            )}
            {isCoverPage && (
              <div
                className="w-3 h-3 text-purple-400"
                title="Cover page cannot be moved"
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Mini Card Grid */}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <DocumentDuplicateIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs text-slate-400">Empty Page</div>
            </div>
          </div>
        ) : (
          <div
            className="grid gap-1 h-full"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {pageCards.map((card, slotIndex) => (
              <div
                key={slotIndex}
                className={`
                  rounded border transition-all duration-200
                  ${
                    card
                      ? "bg-slate-100 border-slate-200 overflow-hidden"
                      : "bg-slate-50 border-dashed border-slate-200"
                  }
                `}
              >
                {card && card.image && (
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Drag Indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Moving Page {logicalIndex + 1}
            </div>
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Drop here
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main PageOverview Component
const PageOverview = ({ isOpen, onClose, currentBinder, onPageSelect }) => {
  const { reorderPages } = useBinderContext();

  if (!isOpen || !currentBinder) return null;

  const gridConfig = getGridConfig(currentBinder.settings?.gridSize || "3x3");
  const pageCount = currentBinder.settings?.pageCount || 1;

  // Get page order from binder settings, default to sequential
  const pageOrder =
    currentBinder.settings?.pageOrder ||
    Array.from({ length: pageCount }, (_, i) => i);

  const handlePageClick = (pageIndex) => {
    onPageSelect(pageIndex);
    onClose();
  };

  const handleMovePages = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    try {
      await reorderPages(currentBinder.id, fromIndex, toIndex);
      toast.success(`Moved page ${fromIndex + 1} to position ${toIndex + 1}`);
    } catch (error) {
      console.error("Failed to reorder pages:", error);
      toast.error("Failed to reorder pages");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Page Overview</h2>
            <p className="text-slate-600 mt-1">
              {currentBinder.metadata?.name} • {pageCount} pages • Drag to
              reorder (cover page fixed)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
              <EyeIcon className="w-4 h-4" />
              <span>Click to view • Drag to reorder</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Page Grid */}
        <div className="flex-1 overflow-auto p-6">
          <DndProvider backend={HTML5Backend}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {pageOrder.map((pageIndex, logicalIndex) => (
                <DraggablePage
                  key={`${pageIndex}-${logicalIndex}`}
                  pageIndex={pageIndex}
                  logicalIndex={logicalIndex}
                  binder={currentBinder}
                  gridConfig={gridConfig}
                  onPageClick={handlePageClick}
                  onMovePages={handleMovePages}
                />
              ))}
            </div>
          </DndProvider>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              Total cards: {Object.keys(currentBinder.cards || {}).length} •
              Grid: {gridConfig.name} ({gridConfig.total} cards per page)
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded"></div>
                <span>Empty slot</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Card</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageOverview;
