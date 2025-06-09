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
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  useDndContext,
} from "@dnd-kit/core";
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
  allCardPages,
  highlightedPages = [], // Pages that should be highlighted during drag
  isBinderSelectionMode = false,
  selectionMode = "cardPages",
  showHeader = true,
}) => {
  const { getCardFromCache } = useCardCache();
  const { active } = useDndContext();

  const isDraggable = !isCover;

  const {
    attributes,
    listeners,
    setNodeRef: dragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `card-page-${cardPageIndex}`,
    data: {
      type: "card-page",
      cardPageIndex,
      selectedPages:
        selectedPages.length > 0 && selectedPages.includes(cardPageIndex)
          ? selectedPages
          : [cardPageIndex],
    },
    disabled: !isDraggable,
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop-card-page-${cardPageIndex}`,
    data: {
      type: "card-page-drop",
      cardPageIndex,
      accepts: "card-page",
    },
    disabled: isCover,
  });

  // Use globally calculated highlights (passed as prop)
  const shouldHighlight = highlightedPages.includes(cardPageIndex);

  // Combine refs
  const setNodeRef = (node) => {
    dragRef(node);
    dropRef(node);
  };

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
    console.log("CardPageItem clicked:", {
      cardPageIndex,
      isSelectionMode,
      isBinderSelectionMode,
      isSelected,
      ctrlKey: e.ctrlKey,
      preventDefault: false,
    });

    // Don't handle clicks if in manage mode
    if (selectionMode === "binderPages") {
      return;
    }

    // Don't handle clicks if in binder selection mode - let the binder overlay handle it
    if (isBinderSelectionMode) {
      return;
    }

    if (isSelectionMode) {
      console.log("Preventing default and toggling selection");
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(cardPageIndex);
    } else if (isSelected) {
      // If page is selected but not in selection mode, deselect it
      console.log("Deselecting page (not in selection mode)");
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(cardPageIndex);
    } else {
      console.log("Navigating to card page");
      onCardPageClick(cardPageIndex);
    }
  };

  // Add component mount logging
  useEffect(() => {
    console.log("CardPageItem mounted:", {
      cardPageIndex,
      isDraggable,
      isSelected,
    });
  }, [cardPageIndex, isDraggable, isSelected]);

  return (
    <div
      ref={setNodeRef}
      {...(isDraggable && !isSelectionMode && selectionMode !== "binderPages"
        ? { ...attributes, ...listeners }
        : {})}
      onClick={handleClick}
      onMouseDown={(e) => {
        console.log("MouseDown on CardPageItem:", {
          cardPageIndex,
          isDraggable,
          isSelectionMode,
        });
      }}
      onMouseUp={(e) => {
        console.log("MouseUp on CardPageItem:", {
          cardPageIndex,
          isDraggable,
          isSelectionMode,
        });
      }}
      className={`
        relative bg-white rounded-xl shadow-md border-2 transition-all duration-300 group
        ${isDragging ? "opacity-50 scale-95 shadow-2xl z-50" : ""}
        ${
          shouldHighlight && !isCover && !isSelectionMode
            ? "ring-4 ring-blue-400 ring-opacity-50 scale-105"
            : ""
        }
        ${isSelected ? "ring-4 ring-green-400 ring-opacity-70" : ""}
        ${
          selectionMode === "binderPages"
            ? "cursor-not-allowed"
            : isBinderSelectionMode
            ? "opacity-40 cursor-default"
            : isSelectionMode
            ? "cursor-pointer hover:shadow-lg"
            : isDraggable
            ? "cursor-grab hover:shadow-lg"
            : "cursor-pointer hover:shadow-lg"
        }
        ${isDragging ? "cursor-grabbing" : ""}
        ${
          isCover
            ? "border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100"
            : selectionMode === "binderPages"
            ? "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 opacity-60"
            : cardCount > 0
            ? "border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100"
            : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100"
        }
                ${
                  gridConfig.total === 36
                    ? "h-[240px]"
                    : gridConfig.total === 25
                    ? "h-[200px]"
                    : gridConfig.total === 16
                    ? "h-[160px]"
                    : gridConfig.total === 12
                    ? "h-[140px]"
                    : gridConfig.total === 9
                    ? "h-[140px]"
                    : "h-[120px]"
                } flex flex-col
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
      {showHeader && (
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
                      selectionMode === "binderPages"
                        ? "bg-slate-400 text-white"
                        : cardCount > 0
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
      )}

      {/* Content Area */}
      <div className={`flex-1 ${showHeader ? "p-4 pt-0" : "p-2"}`}>
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
            className="grid h-full items-center justify-items-center gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
            }}
          >
            {pageCards.map((card, index) => (
              <div
                key={index}
                className={`
                  w-6 h-8 rounded-sm overflow-hidden border transition-all duration-200
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

      {/* Enhanced Drag Overlay with Multi-Selection */}
      {isDragging && selectionMode !== "binderPages" && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
            <div className="flex items-center space-x-2">
              <DocumentDuplicateIcon className="w-5 h-5" />
              <span>
                Moving{" "}
                {selectedPages.length > 1
                  ? `${selectedPages.length} Pages`
                  : `Page ${cardPageIndex}`}
              </span>
            </div>
            {selectedPages.length > 1 && (
              <div className="text-xs text-blue-100 mt-1">
                Pages: {selectedPages.slice(0, 3).join(", ")}
                {selectedPages.length > 3 &&
                  ` +${selectedPages.length - 3} more`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Drop Indicator */}
      {shouldHighlight &&
        !isCover &&
        !isSelectionMode &&
        selectionMode !== "binderPages" && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-4 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
              <div className="flex items-center space-x-2">
                <ArrowsRightLeftIcon className="w-5 h-5" />
                <span>
                  {highlightedPages.length > 1
                    ? `Drop ${highlightedPages.length} Pages`
                    : "Drop Here"}
                </span>
              </div>
              {highlightedPages.length > 1 && (
                <div className="text-xs text-blue-100 mt-1">
                  Will occupy positions: {highlightedPages.join(", ")}
                </div>
              )}
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
  const [selectedPages, setSelectedPages] = useState(new Set()); // Card pages selected
  const [selectedBinderPages, setSelectedBinderPages] = useState(new Set()); // Binder pages selected
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState("pages"); // 'pages' or 'cards'
  const [selectionMode, setSelectionMode] = useState("cardPages"); // 'cardPages' or 'binderPages'
  const [activeId, setActiveId] = useState(null);
  const [activeDragData, setActiveDragData] = useState(null);
  const [currentHoverTarget, setCurrentHoverTarget] = useState(null);

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

  // Drag handlers for custom overlay
  const handleDragStart = (event) => {
    console.log("DndContext handleDragStart:", event);
    setActiveId(event.active.id);
    setActiveDragData(event.active.data.current);
    setCurrentHoverTarget(null);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over && over.data.current?.type === "card-page-drop") {
      setCurrentHoverTarget(over.data.current.cardPageIndex);
    } else {
      setCurrentHoverTarget(null);
    }
  };

  const handleDragEnd = (event) => {
    console.log("DndContext handleDragEnd:", event);
    const { active, over } = event;

    setActiveId(null);
    setActiveDragData(null);
    setCurrentHoverTarget(null);

    if (!active || !over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle card page to card page drops
    if (
      activeData?.type === "card-page" &&
      overData?.type === "card-page-drop"
    ) {
      const sourcePages = activeData.selectedPages || [
        activeData.cardPageIndex,
      ];
      const targetPage = overData.cardPageIndex;

      if (!sourcePages.includes(targetPage)) {
        handleMoveCardPages(sourcePages, targetPage);
      }
    }
  };

  // Calculate which pages should be highlighted based on current hover target
  const getHighlightedPages = useCallback(() => {
    if (!activeDragData || !currentHoverTarget) return [];

    const pagesToMove = activeDragData.selectedPages || [
      activeDragData.cardPageIndex,
    ];
    const numPages = pagesToMove.length;

    // Find non-cover pages
    const nonCoverPages = allCardPages.filter((page) => page !== 0);
    const hoverIndex = nonCoverPages.indexOf(currentHoverTarget);

    if (hoverIndex === -1) return [];

    // Calculate consecutive pages starting from hover target
    const highlightPages = [];
    for (
      let i = 0;
      i < numPages && hoverIndex + i < nonCoverPages.length;
      i++
    ) {
      highlightPages.push(nonCoverPages[hoverIndex + i]);
    }

    console.log("Global highlights calculated:", {
      currentHoverTarget,
      pagesToMove,
      highlightPages,
    });

    return highlightPages;
  }, [activeDragData, currentHoverTarget, allCardPages]);

  const highlightedPages = getHighlightedPages();

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
    setSelectedBinderPages(new Set());
  };

  const handleDeleteBinderPages = () => {
    if (selectedBinderPages.size === 0) return;
    setDeleteType("binderPages");
    setShowDeleteModal(true);
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
      // Sort source pages to maintain order during moves
      const sortedSourcePages = [...sourcePages].sort((a, b) => a - b);
      console.log(
        "Moving pages:",
        sortedSourcePages,
        "to position:",
        targetPageIndex
      );

      // For multiple page moves, we need to place them consecutively starting from target
      for (let i = 0; i < sortedSourcePages.length; i++) {
        const sourcePage = sortedSourcePages[i];
        const destinationPage = targetPageIndex + i;

        // Skip if source and destination are the same
        if (sourcePage === destinationPage) continue;

        console.log(`Moving page ${sourcePage} to position ${destinationPage}`);

        const result = await reorderCardPages(
          currentBinder.id,
          sourcePage,
          destinationPage
        );

        if (!result.success) {
          console.error("Card page reordering failed:", result.error);
          toast.error(`Failed to move page ${sourcePage}`);
          return; // Stop on first failure
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setSelectedPages(new Set()); // Clear selection after move
      toast.success(
        `Successfully moved ${sortedSourcePages.length} page${
          sortedSourcePages.length > 1 ? "s" : ""
        }`
      );
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
    if (!currentBinder) return;

    // Handle different delete types
    if (deleteType === "binderPages") {
      if (selectedBinderPages.size === 0) return;

      try {
        const selectedBinderPagesArray = Array.from(selectedBinderPages);

        // Remove all cards from the selected binder pages first
        for (const binderPageNum of selectedBinderPagesArray) {
          // Calculate which card pages belong to this binder page
          let cardPagesInBinder = [];
          if (binderPageNum === 1) {
            cardPagesInBinder = [1]; // First binder page has cover (0) and card page 1
          } else {
            // Subsequent binder pages have 2 card pages each
            const firstCardPage = 2 + (binderPageNum - 2) * 2;
            cardPagesInBinder = [firstCardPage, firstCardPage + 1];
          }

          // Remove cards from these card pages
          for (const cardPageIndex of cardPagesInBinder) {
            const cardsPerPage = gridConfig.total;
            const startPosition = (cardPageIndex - 1) * cardsPerPage;
            const endPosition = startPosition + cardsPerPage - 1;

            for (
              let position = startPosition;
              position <= endPosition;
              position++
            ) {
              if (currentBinder.cards[position.toString()]) {
                await removeCardFromBinder(currentBinder.id, position);
                await new Promise((resolve) => setTimeout(resolve, 5));
              }
            }
          }
        }

        // Update binder page count
        const currentPageCount = currentBinder.settings?.pageCount || 1;
        const newPageCount = Math.max(
          1,
          currentPageCount - selectedBinderPagesArray.length
        );

        if (newPageCount !== currentPageCount) {
          await updateBinderSettings(currentBinder.id, {
            pageCount: newPageCount,
          });
        }

        toast.success(
          `Deleted ${selectedBinderPagesArray.length} binder page${
            selectedBinderPagesArray.length > 1 ? "s" : ""
          }`
        );

        setSelectedBinderPages(new Set());
        setShowDeleteModal(false);
        return;
      } catch (error) {
        console.error("Failed to delete binder pages:", error);
        toast.error("Failed to delete binder pages");
        return;
      }
    }

    // Handle card page operations (existing logic)
    if (selectedPages.size === 0) return;

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
        // Delete pages: reduce page count to effectively remove the pages
        const currentPageCount = currentBinder.settings?.pageCount || 1;
        const validPagesToDelete = selectedPagesArray.filter((p) => p > 0); // Exclude cover page

        if (validPagesToDelete.length > 0) {
          // Calculate current maximum card page based on existing cards and current page count
          let currentMaxCardPage = 1;
          if (currentPageCount === 1) {
            currentMaxCardPage = 1; // Just the first card page
          } else {
            currentMaxCardPage = 1 + (currentPageCount - 1) * 2; // First card page + pairs for remaining binder pages
          }

          // Find the highest card page that will remain after deletion
          const allCurrentCardPages = Array.from(
            { length: currentMaxCardPage },
            (_, i) => i + 1
          );
          const remainingCardPages = allCurrentCardPages.filter(
            (pageNum) => !validPagesToDelete.includes(pageNum)
          );

          // Calculate the minimum binder pages needed for remaining card pages
          let newPageCount = 1; // Always need at least the cover page
          if (remainingCardPages.length > 0) {
            const highestRemainingCardPage = Math.max(...remainingCardPages);
            if (highestRemainingCardPage > 1) {
              // Convert card pages to binder pages: first card page is with cover, then pairs
              newPageCount = 1 + Math.ceil((highestRemainingCardPage - 1) / 2);
            }
          }

          // Ensure we don't go below minimum
          newPageCount = Math.max(
            newPageCount,
            currentBinder.settings?.minPages || 1
          );

          // Update page count if it's different
          if (newPageCount !== currentPageCount) {
            await updateBinderSettings(currentBinder.id, {
              pageCount: newPageCount,
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

  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  📚 Page Overview
                </h2>
                <p className="text-slate-600 text-sm">
                  {currentBinder.metadata?.name} • {totalCards} cards •{" "}
                  {gridConfig.name} grid
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Mode & Actions Row */}
                {/* Simple Mode Toggle */}
                <div className="bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectionMode("cardPages");
                        clearSelection();
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        selectionMode === "cardPages"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      📋 Organize
                    </button>
                    <button
                      onClick={() => {
                        setSelectionMode("binderPages");
                        clearSelection();
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        selectionMode === "binderPages"
                          ? "bg-slate-700 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ⚙️ Manage
                    </button>
                  </div>
                </div>

                {/* Help Text & Status */}
                <div className="text-xs text-slate-500 italic">
                  {selectionMode === "cardPages"
                    ? isCtrlPressed
                      ? "✨ Click cards to select them"
                      : "💡 Hold Ctrl + click cards to select"
                    : isCtrlPressed
                    ? "✨ Click binder sections to select pages"
                    : "💡 Hold Ctrl + click binder sections to select"}
                </div>

                {isCtrlPressed && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Selection active</span>
                  </div>
                )}

                {((selectionMode === "cardPages" && selectedPages.size > 0) ||
                  (selectionMode === "binderPages" &&
                    selectedBinderPages.size > 0)) && (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
                    <span className="text-xs font-medium text-slate-700">
                      {selectionMode === "cardPages"
                        ? `${selectedPages.size} cards`
                        : `${selectedBinderPages.size} pages`}
                    </span>
                    <div className="w-px h-3 bg-slate-300"></div>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    {selectionMode === "cardPages" ? (
                      <button
                        onClick={() => handleDeleteSelected("cards")}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Clear Cards
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteBinderPages()}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <TrashIcon className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Close Overview"
                >
                  <XMarkIcon className="w-6 h-6 text-slate-600 hover:text-slate-800" />
                </button>
              </div>
            </div>
          </div>

          {/* Card Pages Grid */}
          <div
            className="flex-1 overflow-auto p-8"
            onClick={handleBackgroundClick}
          >
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {console.log("DndContext rendering")}

              <div className="flex flex-wrap gap-8">
                {Object.entries(pageGroups).map(([groupNum, groupPages]) => {
                  const binderPageNum = parseInt(groupNum);
                  const isBinderPageSelected =
                    selectedBinderPages.has(binderPageNum);
                  const isBinderSelectionMode =
                    selectionMode === "binderPages" && isCtrlPressed;

                  return (
                    <div key={groupNum} className="relative">
                      {/* Binder Page Group Label */}
                      <div
                        className={`absolute -top-6 left-0 text-xs font-medium px-2 py-1 rounded-md border shadow-sm transition-all duration-200 ${
                          selectionMode === "binderPages"
                            ? "text-blue-700 bg-blue-50 border-blue-300 font-semibold"
                            : "text-slate-500 bg-white border-slate-200"
                        }`}
                      >
                        Binder Page {groupNum}
                        {selectionMode === "binderPages" && (
                          <span className="ml-1 text-slate-600">📦</span>
                        )}
                      </div>

                      {/* Binder Page Selection Overlay */}
                      {isBinderSelectionMode && (
                        <div
                          className={`absolute inset-0 rounded-2xl transition-all duration-200 cursor-pointer z-10 ${
                            isBinderPageSelected
                              ? "border-2 border-blue-600 bg-blue-200 bg-opacity-60 shadow-lg"
                              : "border-2 border-dashed border-blue-400 hover:border-blue-600 hover:bg-blue-100 hover:bg-opacity-40"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedBinderPages((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(binderPageNum)) {
                                newSet.delete(binderPageNum);
                              } else {
                                newSet.add(binderPageNum);
                              }
                              return newSet;
                            });
                          }}
                        >
                          {/* Interactive Indicator */}
                          {!isBinderPageSelected && !isCtrlPressed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md">
                                📦 Hold Ctrl + Click
                              </div>
                            </div>
                          )}
                          {!isBinderPageSelected && isCtrlPressed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md animate-pulse">
                                📦 Click to select
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {isBinderPageSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold z-20 shadow-sm border-2 border-white">
                          ✓
                        </div>
                      )}

                      {/* Group Container */}
                      <div
                        className={`inline-flex rounded-2xl p-4 gap-6 transition-all duration-200 ${
                          selectionMode === "binderPages"
                            ? isBinderPageSelected
                              ? "border-2 border-blue-500 bg-blue-200/70 shadow-md"
                              : "border-2 border-dashed border-blue-400 bg-blue-100/50 hover:border-blue-500 hover:bg-blue-200/50 cursor-pointer"
                            : "border-2 border-dashed border-slate-200 bg-slate-50/30"
                        }`}
                      >
                        {groupPages.map((cardPageIndex) => (
                          <div
                            key={cardPageIndex}
                            className={`flex-shrink-0 ${
                              gridConfig.total === 36
                                ? "w-[180px]"
                                : gridConfig.total === 25
                                ? "w-[150px]"
                                : gridConfig.total === 16
                                ? "w-[120px]"
                                : gridConfig.total === 12
                                ? "w-[120px]"
                                : "w-[90px]"
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Page Label Outside */}
                              <div className="text-center">
                                <div className="text-xs font-semibold text-slate-700">
                                  {cardPageIndex === 0
                                    ? "Cover"
                                    : `Page ${cardPageIndex}`}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {cardPageIndex === 0
                                    ? "Fixed"
                                    : (() => {
                                        const startPos =
                                          (cardPageIndex - 1) *
                                          gridConfig.total;
                                        const endPos =
                                          startPos + gridConfig.total - 1;
                                        let cardCount = 0;
                                        for (
                                          let pos = startPos;
                                          pos <= endPos;
                                          pos++
                                        ) {
                                          if (
                                            currentBinder.cards[pos.toString()]
                                          ) {
                                            cardCount++;
                                          }
                                        }
                                        return `${cardCount}/${gridConfig.total}`;
                                      })()}
                                </div>
                              </div>

                              <div
                                className={`transition-all duration-200 ${
                                  selectionMode === "cardPages"
                                    ? "hover:scale-105 hover:z-10"
                                    : "cursor-default"
                                }`}
                              >
                                <CardPageItem
                                  key={`${cardPageIndex}-${gridConfig.name}`}
                                  cardPageIndex={cardPageIndex}
                                  binder={currentBinder}
                                  gridConfig={gridConfig}
                                  onCardPageClick={handleCardPageClick}
                                  onMoveCardPages={handleMoveCardPages}
                                  isCover={cardPageIndex === 0}
                                  isSelectionMode={
                                    selectionMode === "cardPages" &&
                                    isCtrlPressed
                                  }
                                  isSelected={selectedPages.has(cardPageIndex)}
                                  onToggleSelection={handleToggleSelection}
                                  selectedPages={selectedPagesArray}
                                  allCardPages={allCardPages}
                                  highlightedPages={highlightedPages}
                                  isBinderSelectionMode={isBinderSelectionMode}
                                  selectionMode={selectionMode}
                                  showHeader={false}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom DragOverlay for Multi-Selection */}
              <DragOverlay>
                {(() => {
                  console.log(
                    "DragOverlay render - currentDragItem:",
                    activeId
                  );
                  return activeId && activeDragData ? (
                    <div className="pointer-events-none">
                      {activeDragData.selectedPages &&
                      activeDragData.selectedPages.length > 1 ? (
                        /* Multi-page drag overlay */
                        <div className="relative">
                          {/* Stack of pages effect */}
                          {activeDragData.selectedPages
                            .slice(0, 3)
                            .map((pageIndex, index) => (
                              <div
                                key={pageIndex}
                                className={`
                              absolute bg-white rounded-xl shadow-lg border-2 border-blue-400 w-[120px] h-[180px]
                              flex items-center justify-center transform transition-all duration-200
                              ${
                                index === 0
                                  ? "z-30"
                                  : index === 1
                                  ? "z-20"
                                  : "z-10"
                              }
                            `}
                                style={{
                                  left: `${index * 8}px`,
                                  top: `${index * 8}px`,
                                  transform: `rotate(${index * 2}deg) scale(${
                                    1 - index * 0.05
                                  })`,
                                }}
                              >
                                <div className="text-center">
                                  <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="font-bold text-sm">
                                      {pageIndex}
                                    </span>
                                  </div>
                                  <div className="text-xs font-medium text-slate-700">
                                    Page {pageIndex}
                                  </div>
                                </div>
                              </div>
                            ))}

                          {/* Count badge for more than 3 pages */}
                          {activeDragData.selectedPages.length > 3 && (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-40">
                              +{activeDragData.selectedPages.length - 3}
                            </div>
                          )}

                          {/* Main overlay info */}
                          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg whitespace-nowrap z-40">
                            <div className="flex items-center space-x-2">
                              <DocumentDuplicateIcon className="w-5 h-5" />
                              <span>
                                Moving {activeDragData.selectedPages.length}{" "}
                                Pages
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Single page drag overlay */
                        <div className="relative">
                          <div className="bg-white rounded-xl shadow-lg border-2 border-blue-400 w-[120px] h-[180px] flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                                <span className="font-bold text-sm">
                                  {activeDragData.cardPageIndex}
                                </span>
                              </div>
                              <div className="text-xs font-medium text-slate-700">
                                Page {activeDragData.cardPageIndex}
                              </div>
                            </div>
                          </div>

                          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <DocumentIcon className="w-5 h-5" />
                              <span>
                                Moving Page {activeDragData.cardPageIndex}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </DragOverlay>
            </DndContext>
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
        selectedPages={
          deleteType === "binderPages"
            ? Array.from(selectedBinderPages)
            : selectedPagesArray
        }
        binder={currentBinder}
        gridConfig={gridConfig}
        deleteType={deleteType}
      />
    </>
  );
};

export default BinderPageOverview;
