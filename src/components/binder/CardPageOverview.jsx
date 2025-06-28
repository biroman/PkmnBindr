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
import { Lock } from "lucide-react";

const ITEM_TYPE = "CARD_PAGE";

// Draggable Card Page Component
const DraggableCardPage = ({
  cardPageIndex,
  binder,
  gridConfig,
  onCardPageClick,
  onMoveCardPages,
}) => {
  const { getCardFromCache } = useCardCache();
  const ref = useRef(null);

  // Cover card page (index 0) should not be draggable
  const isCoverCardPage = cardPageIndex === 0;
  const isDraggable = !isCoverCardPage;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { cardPageIndex },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item) => {
      // Don't allow dropping on cover card page
      if (!isCoverCardPage && item.cardPageIndex !== cardPageIndex) {
        onMoveCardPages(item.cardPageIndex, cardPageIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && !isCoverCardPage,
    }),
  });

  // Only apply drag/drop if not cover card page
  if (isDraggable) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  // Get cards for this card page
  const getCardsForCardPage = (cardPageIndex) => {
    const cardsPerPage = gridConfig.total;
    const startPosition = cardPageIndex * cardsPerPage;
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

  const pageCards = getCardsForCardPage(cardPageIndex);
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
      onClick={() => onCardPageClick(cardPageIndex)}
      className={`
        relative group transition-all duration-300 transform
        ${
          isCoverCardPage
            ? "cursor-pointer" // Cover card page is clickable but not draggable
            : isDragging
            ? "opacity-50 scale-95 cursor-grabbing"
            : "hover:scale-105 cursor-grab"
        }
        ${isOver ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        ${isEmpty ? "opacity-60" : ""}
        ${isCoverCardPage ? "ring-2 ring-purple-300" : ""}
      `}
    >
      {/* Card Page Container */}
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
        {/* Card Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-bold text-slate-700">
              Card Page {cardPageIndex + 1}
            </div>
            {cardPageIndex === 0 && (
              <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                With Cover • Fixed
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <div className="text-xs text-slate-500">
              {cardCount}/{gridConfig.total}
            </div>
            {!isCoverCardPage && (
              <ArrowsRightLeftIcon className="w-3 h-3 text-slate-400" />
            )}
            {isCoverCardPage && (
              <div
                className="w-3 h-3 text-purple-400"
                title="Cover card page cannot be moved"
              >
                <Lock className="w-full h-full" />
              </div>
            )}
          </div>
        </div>

        {/* Mini Card Grid */}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <DocumentDuplicateIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs text-slate-400">Empty Card Page</div>
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
              Moving Card Page {cardPageIndex + 1}
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

// Main Card Page Overview Component
const CardPageOverview = ({
  isOpen,
  onClose,
  currentBinder,
  onCardPageSelect,
}) => {
  const { reorderPages } = useBinderContext();

  if (!isOpen || !currentBinder) return null;

  const gridConfig = getGridConfig(currentBinder.settings?.gridSize || "3x3");
  const pageCount = currentBinder.settings?.pageCount || 1;

  // Calculate total card pages based on binder pages
  // Page 1 = 1 card page, subsequent pages = 2 card pages each
  const totalCardPages = pageCount === 1 ? 1 : 1 + (pageCount - 1) * 2;

  const handleCardPageClick = (cardPageIndex) => {
    onCardPageSelect(cardPageIndex);
    onClose();
  };

  const handleMoveCardPages = async (fromCardPageIndex, toCardPageIndex) => {
    if (fromCardPageIndex === toCardPageIndex) return;

    try {
      // Convert card page indices to binder page indices
      const fromBinderPageIndex =
        fromCardPageIndex === 0 ? 0 : Math.ceil(fromCardPageIndex / 2);
      const toBinderPageIndex =
        toCardPageIndex === 0 ? 0 : Math.ceil(toCardPageIndex / 2);

      await reorderPages(
        currentBinder.id,
        fromBinderPageIndex,
        toBinderPageIndex
      );
      toast.success(
        `Moved card page ${fromCardPageIndex + 1} to position ${
          toCardPageIndex + 1
        }`
      );
    } catch (error) {
      console.error("Failed to reorder card pages:", error);
      toast.error("Failed to reorder card pages");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Card Page Overview
            </h2>
            <p className="text-slate-600 mt-1">
              {currentBinder.metadata?.name} • {totalCardPages} card pages •
              Drag to reorder (cover page fixed)
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

        {/* Card Page Grid */}
        <div className="flex-1 overflow-auto p-6">
          <DndProvider backend={HTML5Backend}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: totalCardPages }, (_, cardPageIndex) => (
                <DraggableCardPage
                  key={cardPageIndex}
                  cardPageIndex={cardPageIndex}
                  binder={currentBinder}
                  gridConfig={gridConfig}
                  onCardPageClick={handleCardPageClick}
                  onMoveCardPages={handleMoveCardPages}
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
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                <span>Fixed (cover)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPageOverview;
