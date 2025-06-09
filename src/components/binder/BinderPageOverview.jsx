import { useState, useRef, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  DocumentIcon,
  LockClosedIcon,
  Squares2X2Icon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useBinderContext } from "../../contexts/BinderContext";
import { useCardCache } from "../../contexts/CardCacheContext";
import { getGridConfig } from "../../hooks/useBinderDimensions";
import { toast } from "react-hot-toast";

const ITEM_TYPE = "CARD_PAGE";

// Individual Card Page Component
const CardPageItem = ({
  cardPageIndex,
  binder,
  gridConfig,
  onCardPageClick,
  onMoveCardPages,
  isCover = false,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  selectedPages,
}) => {
  const { getCardFromCache } = useCardCache();
  const ref = useRef(null);

  const isDraggable = !isCover;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: {
      cardPageIndex,
      selectedPages: isSelected ? selectedPages : [cardPageIndex],
    },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, dragItem }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item) => {
      if (!isCover && !isSelectionMode) {
        const pagesToMove = item.selectedPages || [item.cardPageIndex];
        if (!pagesToMove.includes(cardPageIndex)) {
          onMoveCardPages(pagesToMove, cardPageIndex);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dragItem: monitor.getItem(),
    }),
  });

  // Combine drag and drop refs
  if (isDraggable) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  // Get cards for this card page
  const getCardsForCardPage = (cardPageIndex) => {
    if (isCover) return [];

    const cardsPerPage = gridConfig.total;
    const startPosition = (cardPageIndex - 1) * cardsPerPage;
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
  const cardCount = isCover
    ? 0
    : pageCards.filter((card) => card !== null).length;
  const totalSlots = isCover ? 0 : gridConfig.total;

  const handleClick = (e) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(cardPageIndex);
    } else if (isSelected) {
      // If page is selected but not in selection mode, deselect it
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(cardPageIndex);
    } else {
      onCardPageClick(cardPageIndex);
    }
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`
        relative bg-white rounded-xl shadow-md border-2 transition-all duration-300 cursor-pointer
        hover:shadow-lg group
        ${isDragging ? "opacity-50 scale-95 shadow-2xl z-50" : ""}
        ${
          isOver && !isCover && !isSelectionMode
            ? "ring-4 ring-blue-400 ring-opacity-50"
            : ""
        }
        ${
          isOver &&
          !isCover &&
          !isSelectionMode &&
          dragItem &&
          (dragItem.selectedPages?.length > 1 || false)
            ? "ring-8 ring-orange-400 ring-opacity-30"
            : ""
        }
        ${isSelected ? "ring-4 ring-green-400 ring-opacity-70" : ""}
        ${isSelectionMode ? "cursor-pointer" : ""}
        ${
          isCover
            ? "border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100"
            : cardCount > 0
            ? "border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100"
            : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100"
        }
        h-[250px] flex flex-col
      `}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center z-10">
          <span className="text-white font-bold text-xs">✓</span>
        </div>
      )}

      {/* Selection Mode Overlay */}
      {isSelectionMode && (
        <div className="absolute top-2 left-2 w-6 h-6 border-2 border-slate-400 rounded bg-white flex items-center justify-center z-10">
          {isSelected && <div className="w-3 h-3 bg-green-500 rounded"></div>}
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isCover ? (
              <>
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Cover</div>
                  <div className="text-xs text-purple-600 flex items-center">
                    <LockClosedIcon className="w-3 h-3 mr-1" />
                    Fixed position
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    cardCount > 0
                      ? "bg-blue-500 text-white"
                      : "bg-slate-400 text-white"
                  }`}
                >
                  <span className="font-bold text-sm">{cardPageIndex}</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    Page {cardPageIndex}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center">
                    <Squares2X2Icon className="w-3 h-3 mr-1" />
                    {cardCount}/{totalSlots} cards
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 pt-0">
        {isCover ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-700 font-bold text-2xl">📖</span>
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Binder Cover
              </div>
            </div>
          </div>
        ) : pageCards.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <DocumentDuplicateIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <div className="text-sm text-slate-500 font-medium">
                Empty Page
              </div>
              <div className="text-xs text-slate-400">No cards added yet</div>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-1 h-full ${
              gridConfig.name === "3x3"
                ? "grid-cols-3"
                : gridConfig.name === "4x4"
                ? "grid-cols-4"
                : gridConfig.name === "5x5"
                ? "grid-cols-5"
                : gridConfig.name === "6x6"
                ? "grid-cols-6"
                : "grid-cols-3"
            }`}
          >
            {pageCards.map((card, index) => (
              <div
                key={index}
                className={`
                  aspect-[2/3] rounded-sm overflow-hidden border-2 transition-all duration-200
                  ${
                    card
                      ? "border-slate-200 shadow-sm hover:shadow-md"
                      : "border-dashed border-slate-300 bg-slate-50"
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
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
            Moving{" "}
            {isSelected && selectedPages.length > 1
              ? `${selectedPages.length} Pages`
              : `Page ${cardPageIndex}`}
          </div>
        </div>
      )}

      {/* Drop Indicator */}
      {isOver && !isCover && !isSelectionMode && dragItem && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-4 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
            {(() => {
              const movingPages = dragItem.selectedPages || [
                dragItem.cardPageIndex,
              ];
              const movingCount = movingPages.length;

              if (movingCount === 1) {
                return `Drop Page ${dragItem.cardPageIndex} Here`;
              } else {
                return `Drop ${movingCount} Pages Here`;
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedPages,
  binder,
  gridConfig,
  deleteType = "pages",
}) => {
  if (!isOpen) return null;

  // Check which selected pages have cards
  const pagesWithCards = selectedPages.filter((pageIndex) => {
    if (pageIndex === 0) return false; // Cover page
    const cardsPerPage = gridConfig.total;
    const startPosition = (pageIndex - 1) * cardsPerPage;
    const endPosition = startPosition + cardsPerPage - 1;

    for (let pos = startPosition; pos <= endPosition; pos++) {
      if (binder.cards[pos.toString()]) {
        return true;
      }
    }
    return false;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {deleteType === "pages" ? "Delete Pages" : "Clear Cards"}
            </h3>
            <p className="text-sm text-slate-600">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-slate-700 mb-3">
            You are about to{" "}
            {deleteType === "pages" ? "delete" : "clear cards from"}{" "}
            <span className="font-bold">{selectedPages.length}</span> page
            {selectedPages.length > 1 ? "s" : ""}:
          </p>

          <div className="bg-slate-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
            {selectedPages.map((pageIndex) => (
              <div key={pageIndex} className="text-sm text-slate-600 py-1">
                Page {pageIndex}
              </div>
            ))}
          </div>

          {pagesWithCards.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">
                  Warning: Pages contain cards
                </span>
              </div>
              <p className="text-sm text-red-700">
                {pagesWithCards.length} page
                {pagesWithCards.length > 1 ? "s" : ""} contain
                {pagesWithCards.length === 1 ? "s" : ""} cards that will be
                permanently deleted.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${
              deleteType === "pages"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {deleteType === "pages" ? "Delete" : "Clear"} {selectedPages.length}{" "}
            Page
            {selectedPages.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Binder Page Overview Component
const BinderPageOverview = ({
  isOpen,
  onClose,
  currentBinder,
  onCardPageSelect,
}) => {
  const { reorderCardPages, removeCardFromBinder, updateBinderSettings } =
    useBinderContext();
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState("pages"); // 'pages' or 'cards'

  const gridConfig = getGridConfig(currentBinder.settings?.gridSize || "3x3");

  // Calculate total card pages needed
  const totalCards = Object.keys(currentBinder.cards || {}).length;
  const cardsPerPage = gridConfig.total;

  // Calculate minimum card pages based on actual card positions
  let minCardPages = 1; // Always have at least 1 card page
  if (totalCards > 0) {
    const highestPosition = Math.max(
      ...Object.keys(currentBinder.cards).map((pos) => parseInt(pos))
    );
    minCardPages = Math.ceil((highestPosition + 1) / cardsPerPage);
  }

  // Convert binder page count to card page count
  // Each binder page (after page 1) contains 2 card pages
  // Page 1 is special: cover + 1 card page
  const binderPageCount = currentBinder.settings?.pageCount || 1;
  let maxCardPagesFromBinder;
  if (binderPageCount === 1) {
    maxCardPagesFromBinder = 1; // Just the first card page
  } else {
    maxCardPagesFromBinder = 1 + (binderPageCount - 1) * 2; // First card page + pairs for remaining binder pages
  }

  const displayPages = Math.max(minCardPages, maxCardPagesFromBinder);

  // Create array of all card pages (including cover)
  const allCardPages = Array.from(
    { length: displayPages + 1 },
    (_, index) => index
  );

  // Keyboard event handlers
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Control" && !isCtrlPressed) {
        setIsCtrlPressed(true);
      }
    },
    [isCtrlPressed]
  );

  const handleKeyUp = useCallback(
    (e) => {
      if (e.key === "Control" && isCtrlPressed) {
        setIsCtrlPressed(false);
      }
    },
    [isCtrlPressed]
  );

  // Set up keyboard listeners
  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [isOpen, handleKeyDown, handleKeyUp]);

  // Clear selection when closing modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedPages(new Set());
    }
  }, [isOpen]);

  // Early return after all hooks are called
  if (!isOpen || !currentBinder) return null;

  // Function to get binder page group for visual grouping
  const getBinderPageGroup = (cardPageIndex) => {
    if (cardPageIndex === 0) return 1; // Cover is in binder page 1
    if (cardPageIndex === 1) return 1; // Card page 1 is with cover in binder page 1
    return Math.floor((cardPageIndex - 2) / 2) + 2; // Subsequent pages are paired
  };

  // Get groups for styling
  const pageGroups = {};
  allCardPages.forEach((pageIndex) => {
    const group = getBinderPageGroup(pageIndex);
    if (!pageGroups[group]) pageGroups[group] = [];
    pageGroups[group].push(pageIndex);
  });

  const handleCardPageClick = (cardPageIndex) => {
    if (!isCtrlPressed) {
      onCardPageSelect(cardPageIndex);
      onClose();
    }
  };

  const handleToggleSelection = (cardPageIndex) => {
    if (cardPageIndex === 0) return; // Can't select cover page

    setSelectedPages((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(cardPageIndex)) {
        newSelection.delete(cardPageIndex);
      } else {
        newSelection.add(cardPageIndex);
      }
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleBackgroundClick = (e) => {
    // Clear selection if clicking on the grid background (not on a card)
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const handleMoveCardPages = async (sourcePages, targetPageIndex) => {
    if (sourcePages.includes(targetPageIndex)) return;
    if (sourcePages.includes(0) || targetPageIndex === 0) {
      toast.error("Cannot move the cover page");
      return;
    }

    try {
      // For now, just move the first page to the target (simplified)
      // You could implement more complex batch reordering logic here
      const result = await reorderCardPages(
        currentBinder.id,
        sourcePages[0],
        targetPageIndex
      );

      if (!result.success) {
        console.error("Card page reordering failed:", result.error);
      } else {
        setSelectedPages(new Set()); // Clear selection after move
      }
    } catch (error) {
      console.error("Failed to reorder card pages:", error);
      toast.error("Failed to reorder card pages");
    }
  };

  const handleDeleteSelected = (deleteType = "pages") => {
    if (selectedPages.size === 0) return;
    setDeleteType(deleteType);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!currentBinder || selectedPages.size === 0) return;

    try {
      const selectedPagesArray = Array.from(selectedPages);
      const cardsPerPage = gridConfig.total;
      let totalCardsRemoved = 0;

      // Remove all cards from selected pages
      for (const pageIndex of selectedPagesArray) {
        if (pageIndex === 0) continue; // Skip cover page

        // Calculate position range for this card page
        const startPosition = (pageIndex - 1) * cardsPerPage;
        const endPosition = startPosition + cardsPerPage - 1;

        // Remove all cards in this page's position range
        for (
          let position = startPosition;
          position <= endPosition;
          position++
        ) {
          if (currentBinder.cards[position.toString()]) {
            await removeCardFromBinder(currentBinder.id, position);
            totalCardsRemoved++;
            // Small delay to prevent overwhelming the system
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        }
      }

      // Handle page deletion vs cards-only deletion
      if (deleteType === "pages") {
        // Delete pages: reduce pageCount to remove the pages themselves
        const currentPageCount = currentBinder.settings?.pageCount || 1;
        const validPagesToDelete = selectedPagesArray.filter((p) => p > 0); // Exclude cover page

        if (validPagesToDelete.length > 0) {
          // Calculate remaining cards after deletion
          const remainingCards = {};
          Object.keys(currentBinder.cards).forEach((posStr) => {
            const pos = parseInt(posStr);
            const cardPageIndex = Math.floor(pos / cardsPerPage) + 1;

            // Keep cards that are NOT on deleted pages
            if (!validPagesToDelete.includes(cardPageIndex)) {
              remainingCards[posStr] = currentBinder.cards[posStr];
            }
          });

          // Calculate minimum pages needed for remaining cards
          let newCardPageCount = 1; // Always need at least 1 card page
          if (Object.keys(remainingCards).length > 0) {
            const highestRemainingPosition = Math.max(
              ...Object.keys(remainingCards).map((pos) => parseInt(pos))
            );
            newCardPageCount = Math.ceil(
              (highestRemainingPosition + 1) / cardsPerPage
            );
          }

          // Convert card pages to binder pages
          let newBinderPageCount;
          if (newCardPageCount === 1) {
            newBinderPageCount = 1; // Just need the cover + first card page
          } else {
            newBinderPageCount = 1 + Math.ceil((newCardPageCount - 1) / 2); // Cover page + pairs for remaining card pages
          }

          newBinderPageCount = Math.max(
            newBinderPageCount,
            currentBinder.settings?.minPages || 1
          );

          if (newBinderPageCount < currentPageCount) {
            await updateBinderSettings(currentBinder.id, {
              pageCount: newBinderPageCount,
            });
          }
        }

        toast.success(
          totalCardsRemoved > 0
            ? `Deleted ${selectedPagesArray.filter((p) => p > 0).length} page${
                selectedPagesArray.filter((p) => p > 0).length > 1 ? "s" : ""
              } and removed ${totalCardsRemoved} card${
                totalCardsRemoved !== 1 ? "s" : ""
              }`
            : `Deleted ${
                selectedPagesArray.filter((p) => p > 0).length
              } empty page${
                selectedPagesArray.filter((p) => p > 0).length > 1 ? "s" : ""
              }`
        );
      } else {
        // Cards only: just clear cards, keep page structure
        toast.success(
          totalCardsRemoved > 0
            ? `Cleared ${totalCardsRemoved} card${
                totalCardsRemoved !== 1 ? "s" : ""
              } from ${selectedPagesArray.filter((p) => p > 0).length} page${
                selectedPagesArray.filter((p) => p > 0).length > 1 ? "s" : ""
              }`
            : `Selected pages were already empty`
        );
      }

      setSelectedPages(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error(
        `Failed to ${deleteType === "pages" ? "delete pages" : "clear cards"}:`,
        error
      );
      toast.error(
        `Failed to ${deleteType === "pages" ? "delete pages" : "clear cards"}`
      );
    }
  };

  const selectedPagesArray = Array.from(selectedPages);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  📚 Page Overview
                </h2>
                <p className="text-slate-600 text-lg">
                  {currentBinder.metadata?.name} • {totalCards} cards •{" "}
                  {gridConfig.name} grid
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Selection Mode Indicator */}
                {isCtrlPressed && (
                  <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-3">
                    <div className="flex items-center space-x-2 text-sm text-green-700">
                      <span className="font-medium">🎯 Selection Mode</span>
                      <span>({selectedPages.size} selected)</span>
                    </div>
                  </div>
                )}

                {/* Selection Actions */}
                {selectedPages.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={clearSelection}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-3 rounded-xl transition-colors text-sm font-medium"
                    >
                      Clear ({selectedPages.size})
                    </button>
                    <button
                      onClick={() => handleDeleteSelected("cards")}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl transition-colors flex items-center space-x-2"
                    >
                      <DocumentIcon className="w-5 h-5" />
                      <span className="font-medium">Clear Cards</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSelected("pages")}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl transition-colors flex items-center space-x-2"
                    >
                      <TrashIcon className="w-5 h-5" />
                      <span className="font-medium">Delete Pages</span>
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-200">
                  <div className="flex items-center space-x-3 text-sm text-slate-600">
                    <EyeIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {isCtrlPressed
                        ? "Hold Ctrl to select • Release to drag"
                        : "Click to navigate • Drag to reorder • Hold Ctrl to select"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Card Pages Grid */}
          <div
            className="flex-1 overflow-auto p-8"
            onClick={handleBackgroundClick}
          >
            <DndProvider backend={HTML5Backend}>
              <div className="flex flex-wrap gap-8">
                {Object.entries(pageGroups).map(([groupNum, groupPages]) => (
                  <div key={groupNum} className="relative">
                    {/* Binder Page Group Label */}
                    <div className="absolute -top-6 left-0 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                      Binder Page {groupNum}
                    </div>

                    {/* Group Container with subtle border - only wraps content */}
                    <div className="inline-flex border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/30 gap-6">
                      {groupPages.map((cardPageIndex) => (
                        <div
                          key={cardPageIndex}
                          className="flex-shrink-0 w-[150px]"
                        >
                          <CardPageItem
                            cardPageIndex={cardPageIndex}
                            binder={currentBinder}
                            gridConfig={gridConfig}
                            onCardPageClick={handleCardPageClick}
                            onMoveCardPages={handleMoveCardPages}
                            isCover={cardPageIndex === 0}
                            isSelectionMode={isCtrlPressed}
                            isSelected={selectedPages.has(cardPageIndex)}
                            onToggleSelection={handleToggleSelection}
                            selectedPages={selectedPagesArray}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DndProvider>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-8 py-6 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold">Total Pages:</span>{" "}
                  {displayPages + 1} (including cover)
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold">Cards per Page:</span>{" "}
                  {cardsPerPage}
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm text-slate-600">Cover (fixed)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm text-slate-600">Has cards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-slate-400 rounded"></div>
                  <span className="text-sm text-slate-600">Empty</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-slate-600">Selected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        selectedPages={selectedPagesArray}
        binder={currentBinder}
        gridConfig={gridConfig}
        deleteType={deleteType}
      />
    </>
  );
};

export default BinderPageOverview;
