import React, { useState, useRef, useEffect, useCallback } from "react";
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
  CursorArrowRaysIcon,
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

// Mobile breakpoint and constants
const MOBILE_BREAKPOINT = 768;
const NAVBAR_HEIGHT = 65;
const MOBILE_PADDING = 16;

const ItemTypes = {
  CARD_PAGE: "card_page",
};

// Helper function to get low-quality image URL for thumbnails
// This significantly improves performance by using standard quality images
// instead of _hires versions for tiny thumbnail previews
const getLowQualityImageUrl = (card) => {
  if (!card) return "";

  // Get the image URL (prefer imageSmall, fallback to image)
  let imageUrl = card.imageSmall || card.image || "";

  if (imageUrl) {
    // Remove _hires from the URL to get standard quality
    // e.g., "10_hires.png" becomes "10.png"
    imageUrl = imageUrl.replace(/_hires\.png$/, ".png");
  }

  return imageUrl;
};

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
  currentHoverTarget = null,
  activeDragData = null,
  isMobile = false,
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

    // Debug: uncomment for troubleshooting
    // console.log(`[PageOverview] Getting cards for page ${cardPageIndex}, startPos: ${startPosition}, cardsPerPage: ${cardsPerPage}`);
    // console.log(`[PageOverview] Binder has cards:`, Object.keys(binder.cards || {}).length);

    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardData = binder.cards[globalPosition.toString()];

      // Debug: uncomment for troubleshooting
      // console.log(`[PageOverview] Position ${globalPosition}: cardData exists = ${!!cardData}`);

      if (cardData) {
        // Try to get full card data from cache first
        let fullCard = getCardFromCache(cardData.cardId);

        if (fullCard) {
          // Use cached card data
          pageCards.push({
            ...fullCard,
            binderMetadata: cardData,
          });
        } else if (cardData.cardData) {
          // Use stored card data from binder (for cloud-synced cards)
          pageCards.push({
            ...cardData.cardData,
            binderMetadata: cardData,
          });
        } else if (cardData.name && cardData.image) {
          // Direct card data (admin normalized format)
          pageCards.push(cardData);
        } else {
          // Fallback for old binder format - create minimal card object
          pageCards.push({
            id: cardData.cardId,
            name: "Unknown Card",
            image: "",
            binderMetadata: cardData,
          });
        }
      } else {
        pageCards.push(null);
      }
    }

    // Debug: uncomment for troubleshooting
    // console.log(`[PageOverview] Page ${cardPageIndex} final pageCards:`, pageCards);
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
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      className={`
        relative bg-card-background rounded-sm shadow-md border-2 transition-all duration-300 group
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
            ? "border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
            : selectionMode === "binderPages"
            ? "border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 opacity-60"
            : cardCount > 0
            ? "border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
            : "border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
        }
        ${
          gridConfig.total === 36
            ? "h-[240px] md:h-[200px] lg:h-[240px]"
            : gridConfig.total === 25
            ? "h-[200px] md:h-[160px] lg:h-[200px]"
            : gridConfig.total === 16
            ? "h-[160px] md:h-[140px] lg:h-[160px]"
            : gridConfig.total === 12
            ? "h-[140px] md:h-[120px] lg:h-[140px]"
            : gridConfig.total === 9
            ? "h-[140px] md:h-[120px] lg:h-[140px]"
            : "h-[120px] md:h-[100px] lg:h-[120px]"
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
        <div className="absolute top-2 left-2 w-6 h-6 border-2 border-slate-400 dark:border-slate-600 rounded bg-card-background flex items-center justify-center z-10">
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
                {card && getLowQualityImageUrl(card) && (
                  <img
                    src={getLowQualityImageUrl(card)}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    style={{
                      imageRendering: "auto",
                      maxWidth: "24px",
                      maxHeight: "32px",
                    }}
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
                  {(() => {
                    const sortedHighlights = [...highlightedPages].sort(
                      (a, b) => a - b
                    );
                    // Check if this is backwards placement by seeing if the hover target is the last highlighted page
                    const isBackwards =
                      currentHoverTarget &&
                      sortedHighlights[sortedHighlights.length - 1] ===
                        currentHoverTarget;
                    return `Will occupy positions: ${sortedHighlights.join(
                      ", "
                    )}${isBackwards ? " (fitted backwards)" : ""}`;
                  })()}
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

  const selectedPagesArray = Array.from(selectedPages);
  const cardsPerPage = gridConfig.total;

  // Calculate affected cards based on deletion type
  let affectedCards = [];
  let cardsToPreserve = [];
  let pagesWithCards = [];

  if (deleteType === "binderPages") {
    // Calculate for binder page deletion
    const cardPageRangesToDelete = [];
    for (const binderPageNum of selectedPagesArray) {
      let cardPagesInBinder = [];
      if (binderPageNum === 1) {
        cardPagesInBinder = [1];
      } else {
        const firstCardPage = 2 + (binderPageNum - 2) * 2;
        cardPagesInBinder = [firstCardPage, firstCardPage + 1];
      }

      for (const cardPageIndex of cardPagesInBinder) {
        const startPosition = (cardPageIndex - 1) * cardsPerPage;
        const endPosition = startPosition + cardsPerPage - 1;
        cardPageRangesToDelete.push({ startPosition, endPosition });
      }
    }

    // Count cards that will be deleted vs preserved
    const allCards = Object.entries(binder.cards || {});
    for (const [positionStr, cardData] of allCards) {
      const position = parseInt(positionStr);
      const isInDeletedRange = cardPageRangesToDelete.some(
        (range) =>
          position >= range.startPosition && position <= range.endPosition
      );

      if (isInDeletedRange) {
        affectedCards.push(cardData);
      } else {
        cardsToPreserve.push(cardData);
      }
    }
  } else {
    // Regular card page deletion
    pagesWithCards = selectedPagesArray.filter((pageIndex) => {
      if (pageIndex === 0) return false; // Cover page
      const startPosition = (pageIndex - 1) * cardsPerPage;
      const endPosition = startPosition + cardsPerPage - 1;

      for (let pos = startPosition; pos <= endPosition; pos++) {
        if (binder.cards[pos.toString()]) {
          affectedCards.push(binder.cards[pos.toString()]);
          return true;
        }
      }
      return false;
    });
  }

  const isBinderPageDeletion = deleteType === "binderPages";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isBinderPageDeletion
                ? "Delete Binder Pages"
                : deleteType === "pages"
                ? "Delete Pages"
                : "Clear Cards"}
            </h3>
            <p className="text-sm text-slate-600">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-slate-700 mb-3">
            You are about to{" "}
            {isBinderPageDeletion
              ? "delete"
              : deleteType === "pages"
              ? "delete"
              : "clear cards from"}{" "}
            <span className="font-bold">{selectedPagesArray.length}</span>{" "}
            {isBinderPageDeletion ? "binder " : ""}page
            {selectedPagesArray.length > 1 ? "s" : ""}:
          </p>

          <div className="bg-slate-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
            {selectedPagesArray.map((pageIndex) => (
              <div key={pageIndex} className="text-sm text-slate-600 py-1">
                {isBinderPageDeletion
                  ? `Binder Page ${pageIndex}`
                  : `Page ${pageIndex}`}
              </div>
            ))}
          </div>

          {isBinderPageDeletion ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800">
                  Impact Summary
                </span>
              </div>
              <div className="text-sm text-orange-700 space-y-1">
                <p>
                  •{" "}
                  <span className="font-medium text-red-600">
                    {affectedCards.length} cards
                  </span>{" "}
                  will be deleted
                </p>
                <p>
                  •{" "}
                  <span className="font-medium text-green-600">
                    {cardsToPreserve.length} cards
                  </span>{" "}
                  will be reorganized
                </p>
                <p>• Remaining pages will be renumbered automatically</p>
              </div>
            </div>
          ) : (
            pagesWithCards.length > 0 && (
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
            )
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
              isBinderPageDeletion || deleteType === "pages"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {isBinderPageDeletion
              ? "Delete Binder Pages"
              : deleteType === "pages"
              ? "Delete"
              : "Clear"}{" "}
            {selectedPagesArray.length} Page
            {selectedPagesArray.length > 1 ? "s" : ""}
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
  const {
    reorderCardPages,
    removeCardFromBinder,
    updateBinder,
    updateBinderSettings,
    moveCard,
  } = useBinderContext();
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [cardSelectionActive, setCardSelectionActive] = useState(false);
  const [selectedPages, setSelectedPages] = useState(new Set()); // Card pages selected
  const [selectedBinderPages, setSelectedBinderPages] = useState(new Set()); // Binder pages selected
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState("pages"); // 'pages' or 'cards'
  const [selectionMode, setSelectionMode] = useState("cardPages"); // 'cardPages' or 'binderPages'
  const [activeId, setActiveId] = useState(null);
  const [activeDragData, setActiveDragData] = useState(null);
  const [currentHoverTarget, setCurrentHoverTarget] = useState(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [isDragging, setIsDragging] = useState(false);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  const [dragStartTime, setDragStartTime] = useState(null);

  // Update window width on resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll functionality during drag
  const handleAutoScroll = useCallback(
    (clientY, scrollContainer) => {
      if (!scrollContainer || !isDragging || !dragStartTime) return;

      // Add delay before auto-scroll starts (prevent immediate scrolling)
      const dragDuration = Date.now() - dragStartTime;
      const AUTO_SCROLL_DELAY = 800; // 800ms delay before auto-scroll can start

      if (dragDuration < AUTO_SCROLL_DELAY) {
        // Clear any existing interval if we're still in delay period
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          setAutoScrollInterval(null);
        }
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 60; // Slightly larger threshold for better UX
      const scrollSpeed = 8; // Slower, more controlled scrolling

      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      let shouldScroll = false;
      let scrollDirection = 0;

      if (distanceFromTop < scrollThreshold && scrollContainer.scrollTop > 0) {
        // Near top edge, scroll up
        scrollDirection = -scrollSpeed;
        shouldScroll = true;
      } else if (distanceFromBottom < scrollThreshold) {
        // Near bottom edge, scroll down
        const maxScroll =
          scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (scrollContainer.scrollTop < maxScroll) {
          scrollDirection = scrollSpeed;
          shouldScroll = true;
        }
      }

      if (shouldScroll && !autoScrollInterval) {
        const interval = setInterval(() => {
          scrollContainer.scrollTop += scrollDirection;
        }, 20); // Slightly slower refresh rate for smoother scrolling
        setAutoScrollInterval(interval);
      } else if (!shouldScroll && autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    },
    [isDragging, autoScrollInterval, dragStartTime]
  );

  // Clean up auto-scroll interval
  useEffect(() => {
    return () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [autoScrollInterval]);

  // Modified scroll prevention - allow auto-scroll but prevent accidental scrolling
  useEffect(() => {
    const scrollContainer = document.querySelector(
      ".page-overview-scroll-container"
    );
    if (!scrollContainer) return;

    if (isDragging) {
      // During drag, we manage scrolling manually via auto-scroll
      scrollContainer.style.touchAction = "none";
      scrollContainer.style.userSelect = "none";
      scrollContainer.style.webkitUserSelect = "none";
      scrollContainer.style.mozUserSelect = "none";
      scrollContainer.style.msUserSelect = "none";
      document.body.style.overflow = "hidden";
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";

      // Add mouse move listener for auto-scroll
      const handleMouseMove = (e) => {
        e.preventDefault(); // Prevent any default behavior during drag
        handleAutoScroll(e.clientY, scrollContainer);
      };

      // Also handle touch move for mobile
      const handleTouchMove = (e) => {
        if (e.touches.length === 1) {
          e.preventDefault(); // Prevent scrolling on mobile
          handleAutoScroll(e.touches[0].clientY, scrollContainer);
        }
      };

      document.addEventListener("mousemove", handleMouseMove, {
        passive: false,
      });
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          setAutoScrollInterval(null);
        }
      };
    } else {
      // Re-enable normal scrolling when not dragging
      scrollContainer.style.touchAction = "auto";
      scrollContainer.style.userSelect = "auto";
      scrollContainer.style.webkitUserSelect = "auto";
      scrollContainer.style.mozUserSelect = "auto";
      scrollContainer.style.msUserSelect = "auto";
      document.body.style.overflow = "";
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";

      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  }, [isDragging, handleAutoScroll, autoScrollInterval]);

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
      } else if (e.key === "Escape" && isDragging) {
        // Cancel drag operation on Escape
        handleDragCancel();
      }
    },
    [isCtrlPressed, isDragging]
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
      setSelectedBinderPages(new Set());
      setCardSelectionActive(false);
      setIsDragging(false);
      setDragStartTime(null);
      setActiveId(null);
      setActiveDragData(null);
      setCurrentHoverTarget(null);

      // Clean up auto-scroll
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  }, [isOpen, autoScrollInterval]);

  // Drag handlers for custom overlay
  const handleDragStart = (event) => {
    console.log("DndContext handleDragStart:", event);
    setActiveId(event.active.id);
    setActiveDragData(event.active.data.current);
    setCurrentHoverTarget(null);
    setIsDragging(true);
    setDragStartTime(Date.now());
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
    setIsDragging(false);
    setDragStartTime(null);

    // Clean up auto-scroll
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }

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

  const handleDragCancel = () => {
    console.log("DndContext handleDragCancel");
    setActiveId(null);
    setActiveDragData(null);
    setCurrentHoverTarget(null);
    setIsDragging(false);
    setDragStartTime(null);

    // Clean up auto-scroll
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
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

    // Check if we're dropping on the last page and would overflow
    const availableSpaceForward = nonCoverPages.length - hoverIndex;
    const highlightPages = [];

    if (availableSpaceForward >= numPages) {
      // Place pages forward from hover target (normal behavior)
      for (let i = 0; i < numPages; i++) {
        highlightPages.push(nonCoverPages[hoverIndex + i]);
      }
    } else {
      // Place pages backwards from hover target to prevent overflow
      const startIndex = Math.max(0, hoverIndex - numPages + 1);
      for (let i = 0; i < numPages; i++) {
        const pageIndex = startIndex + i;
        if (pageIndex < nonCoverPages.length) {
          highlightPages.push(nonCoverPages[pageIndex]);
        }
      }
    }

    console.log("Global highlights calculated:", {
      currentHoverTarget,
      pagesToMove,
      availableSpaceForward,
      placingBackwards: availableSpaceForward < numPages,
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
    setCardSelectionActive(false);
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

      // Find non-cover pages to calculate available space
      const nonCoverPages = allCardPages.filter((page) => page !== 0);
      const targetIndex = nonCoverPages.indexOf(targetPageIndex);
      const availableSpaceForward = nonCoverPages.length - targetIndex;
      const numPages = sortedSourcePages.length;

      // Determine if we need to place backwards
      const placeBackwards = availableSpaceForward < numPages;

      console.log("Move strategy:", {
        targetPageIndex,
        availableSpaceForward,
        numPages,
        placeBackwards,
      });

      if (placeBackwards) {
        // Place pages backwards from target to prevent creating new empty pages
        const startTargetIndex = Math.max(0, targetIndex - numPages + 1);

        for (let i = 0; i < sortedSourcePages.length; i++) {
          const sourcePage = sortedSourcePages[i];
          const destinationPageIndex = startTargetIndex + i;
          const destinationPage = nonCoverPages[destinationPageIndex];

          // Skip if source and destination are the same
          if (sourcePage === destinationPage) continue;

          console.log(
            `Moving page ${sourcePage} to position ${destinationPage} (backwards placement)`
          );

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
      } else {
        // Normal forward placement
        for (let i = 0; i < sortedSourcePages.length; i++) {
          const sourcePage = sortedSourcePages[i];
          const destinationPage = targetPageIndex + i;

          // Skip if source and destination are the same
          if (sourcePage === destinationPage) continue;

          console.log(
            `Moving page ${sourcePage} to position ${destinationPage} (forward placement)`
          );

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
      }

      setSelectedPages(new Set()); // Clear selection after move
      toast.success(
        `Successfully moved ${sortedSourcePages.length} page${
          sortedSourcePages.length > 1 ? "s" : ""
        }${placeBackwards ? " (placed backwards to fit)" : ""}`
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
        const selectedBinderPagesArray = Array.from(selectedBinderPages).sort(
          (a, b) => a - b
        );
        console.log("Deleting binder pages:", selectedBinderPagesArray);

        // Prevent deleting page 1 (cover page)
        if (selectedBinderPagesArray.includes(1)) {
          toast.error("Cannot delete the cover page (page 1)");
          return;
        }

        const cardsPerPage = gridConfig.total;
        const currentPageCount = currentBinder.settings?.pageCount || 1;

        // Step 1: Calculate which card page ranges will be deleted
        const cardPageRangesToDelete = [];
        for (const binderPageNum of selectedBinderPagesArray) {
          let cardPagesInBinder = [];
          if (binderPageNum === 1) {
            cardPagesInBinder = [1]; // First binder page has card page 1 (plus cover page 0)
          } else {
            // Subsequent binder pages have 2 card pages each
            // Formula: binder page N has card pages [2*N-2, 2*N-1]
            const firstCardPage = 2 + (binderPageNum - 2) * 2;
            cardPagesInBinder = [firstCardPage, firstCardPage + 1];
          }

          for (const cardPageIndex of cardPagesInBinder) {
            const startPosition = (cardPageIndex - 1) * cardsPerPage;
            const endPosition = startPosition + cardsPerPage - 1;
            cardPageRangesToDelete.push({
              startPosition,
              endPosition,
              cardPageIndex,
            });
          }
        }

        // Sort ranges by position to handle them in order
        cardPageRangesToDelete.sort(
          (a, b) => a.startPosition - b.startPosition
        );
        console.log("Card page ranges to delete:", cardPageRangesToDelete);

        // Step 2: Collect all cards that need to be preserved and their new positions
        const allCards = Object.entries(currentBinder.cards || {});
        const cardsToMove = [];
        const cardsToDelete = [];

        for (const [positionStr, cardData] of allCards) {
          const position = parseInt(positionStr);

          // Check if this card is in a range to be deleted
          const isInDeletedRange = cardPageRangesToDelete.some(
            (range) =>
              position >= range.startPosition && position <= range.endPosition
          );

          if (isInDeletedRange) {
            cardsToDelete.push({ position, cardData });
          } else {
            // Calculate how many positions this card needs to shift back
            let positionsToShiftBack = 0;
            for (const range of cardPageRangesToDelete) {
              if (position > range.endPosition) {
                positionsToShiftBack +=
                  range.endPosition - range.startPosition + 1;
              }
            }

            const newPosition = position - positionsToShiftBack;
            if (newPosition !== position) {
              cardsToMove.push({
                fromPosition: position,
                toPosition: newPosition,
                cardData,
              });
            }
          }
        }

        console.log("Cards to delete:", cardsToDelete.length);
        console.log("Cards to move:", cardsToMove.length);

        // Step 3: Remove cards from deleted ranges (optimized batch deletion)
        if (cardsToDelete.length > 0) {
          console.log(`Batch deleting ${cardsToDelete.length} cards...`);

          // Create a new cards object without the deleted cards
          const updatedCards = { ...currentBinder.cards };
          for (const { position } of cardsToDelete) {
            delete updatedCards[position.toString()];
          }

          // Update the binder with the new cards object in one operation
          await updateBinder(currentBinder.id, { cards: updatedCards });
        }

        // Step 4: Move remaining cards to their new positions
        // Sort by descending position to avoid conflicts
        cardsToMove.sort((a, b) => b.fromPosition - a.fromPosition);

        for (const { fromPosition, toPosition } of cardsToMove) {
          console.log(
            `Moving card from position ${fromPosition} to ${toPosition}`
          );
          await moveCard(currentBinder.id, fromPosition, toPosition);
          await new Promise((resolve) => setTimeout(resolve, 3));
        }

        // Step 5: Update binder page count
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
          `Successfully deleted ${selectedBinderPagesArray.length} binder page${
            selectedBinderPagesArray.length > 1 ? "s" : ""
          } and reorganized ${cardsToMove.length} cards`
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

      // Remove all cards from selected pages (optimized batch deletion)
      const updatedCards = { ...currentBinder.cards };

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
          const positionKey = position.toString();
          if (updatedCards[positionKey]) {
            delete updatedCards[positionKey];
            totalCardsRemoved++;
          }
        }
      }

      // Apply all deletions in one operation if any cards were removed
      if (totalCardsRemoved > 0) {
        console.log(
          `Batch deleting ${totalCardsRemoved} cards from selected pages...`
        );
        await updateBinder(currentBinder.id, { cards: updatedCards });
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

  const isSelectionActive =
    selectionMode === "cardPages" && (isCtrlPressed || cardSelectionActive);

  const isMobile = windowWidth < MOBILE_BREAKPOINT;

  // Calculate modal height for mobile to account for navigation bar
  const modalHeight = isMobile
    ? `calc(100vh - ${NAVBAR_HEIGHT}px - ${MOBILE_PADDING}px)`
    : "90vh";

  const modalTop = isMobile
    ? `${NAVBAR_HEIGHT + MOBILE_PADDING / 2}px`
    : "auto";

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        style={isMobile ? { paddingTop: modalTop } : { padding: "1rem" }}
      >
        <div
          className={`bg-white shadow-2xl w-full overflow-hidden flex flex-col ${
            isMobile ? "rounded-none h-full" : "rounded-3xl max-w-7xl"
          }`}
          style={
            isMobile
              ? {
                  height: modalHeight,
                  maxHeight: `calc(100vh - ${NAVBAR_HEIGHT}px - ${MOBILE_PADDING}px)`,
                }
              : { maxHeight: "90vh" }
          }
        >
          {/* Header */}
          <div
            className={`border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 ${
              isMobile ? "p-3" : "p-4 sm:p-6"
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-shrink-0">
                <h2
                  className={`font-bold text-slate-900 mb-1 ${
                    isMobile ? "text-lg" : "text-xl sm:text-2xl"
                  }`}
                >
                  📚 Page Overview
                </h2>
                <p
                  className={`text-slate-600 ${
                    isMobile ? "text-xs" : "text-xs sm:text-sm"
                  }`}
                >
                  {currentBinder.metadata?.name} • {totalCards} cards •{" "}
                  {gridConfig.name} grid
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Mode & Actions Row */}
                {/* Simple Mode Toggle */}
                <div className="bg-card-background rounded-lg border border-border p-1 shadow-sm">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectionMode("cardPages");
                        clearSelection();
                      }}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        selectionMode === "cardPages"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-secondary hover:bg-accent"
                      }`}
                    >
                      📋 Organize
                    </button>
                    <button
                      onClick={() => {
                        setSelectionMode("binderPages");
                        clearSelection();
                      }}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        selectionMode === "binderPages"
                          ? "bg-slate-700 text-white shadow-sm"
                          : "text-secondary hover:bg-accent"
                      }`}
                    >
                      ⚙️ Manage
                    </button>
                  </div>
                </div>

                {/* Help Text, Selection Toggle & Status */}
                <div className="flex items-center gap-2">
                  {selectionMode === "cardPages" && (
                    <button
                      onClick={() => setCardSelectionActive((prev) => !prev)}
                      className={`p-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                        cardSelectionActive
                          ? "bg-green-500 text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <CursorArrowRaysIcon className="w-4 h-4" />
                      <span>
                        {cardSelectionActive ? "Selecting..." : "Select"}
                      </span>
                    </button>
                  )}
                  <div className="text-xs text-slate-500 italic hidden md:block">
                    {selectionMode === "cardPages"
                      ? cardSelectionActive
                        ? "Click cards to select"
                        : "Use 'Select' or Ctrl+Click"
                      : "Click binder pages to select"}
                  </div>
                </div>

                {isSelectionActive && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Selection active</span>
                  </div>
                )}

                {((selectionMode === "cardPages" && selectedPages.size > 0) ||
                  (selectionMode === "binderPages" &&
                    selectedBinderPages.size > 0)) && (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2 sm:px-3 py-1.5 shadow-sm">
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
                  className={`hover:bg-slate-100 rounded-lg transition-colors ${
                    isMobile ? "p-2" : "p-3"
                  }`}
                  title="Close Overview"
                >
                  <XMarkIcon
                    className={`text-slate-600 hover:text-slate-800 ${
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card Pages Grid */}
          <div
            className={`flex-1 page-overview-scroll-container overflow-auto relative `}
            style={{
              touchAction: isDragging ? "none" : "auto",
              userSelect: isDragging ? "none" : "auto",
            }}
            onClick={handleBackgroundClick}
          >
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {/* Auto-scroll indicators - only show on mobile when auto-scroll is ready */}
              {isMobile &&
                isDragging &&
                dragStartTime &&
                Date.now() - dragStartTime >= 800 && (
                  <>
                    {/* Top scroll zone indicator */}
                    <div
                      className={`sticky top-0 h-12 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none z-50 flex items-center justify-center -mb-12 ${
                        isMobile ? "-mx-3" : "-mx-4 sm:-mx-8"
                      }`}
                    >
                      <div className="text-blue-600 text-xs font-medium animate-pulse">
                        ↑ Drag here to scroll up
                      </div>
                    </div>
                  </>
                )}

              <div className="flex flex-col lg:flex-row lg:flex-wrap gap-8">
                {Object.entries(pageGroups).map(([groupNum, groupPages]) => {
                  const binderPageNum = parseInt(groupNum);
                  const isBinderPageSelected =
                    selectedBinderPages.has(binderPageNum);
                  const isBinderSelectionMode = selectionMode === "binderPages";

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
                          {!isBinderPageSelected && (
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
                        className={`rounded-md p-4 gap-4 sm:gap-6 transition-all duration-200 w-full overflow-x-auto
                          flex flex-row
                          ${
                            selectionMode === "binderPages"
                              ? isBinderPageSelected
                                ? "border-2 border-blue-500 bg-blue-200/70 shadow-md"
                                : "border-2 border-dashed border-blue-400 bg-blue-100/50 hover:border-blue-500 hover:bg-blue-200/50 cursor-pointer"
                              : "border-2 border-dashed border-slate-200 bg-slate-50/30"
                          }
                        `}
                        onClick={(e) => {
                          if (selectionMode === "binderPages") {
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
                          }
                        }}
                      >
                        {groupPages.map((cardPageIndex) => (
                          <div
                            key={cardPageIndex}
                            className={`flex-shrink-0 ${
                              gridConfig.total === 36
                                ? "w-[180px] sm:w-[150px] md:w-[180px]"
                                : gridConfig.total === 25
                                ? "w-[150px] sm:w-[120px] md:w-[150px]"
                                : gridConfig.total === 16
                                ? "w-[120px] sm:w-[100px] md:w-[120px]"
                                : gridConfig.total === 12
                                ? "w-[120px] sm:w-[100px] md:w-[120px]"
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
                                  isSelectionMode={isSelectionActive}
                                  isSelected={selectedPages.has(cardPageIndex)}
                                  onToggleSelection={handleToggleSelection}
                                  selectedPages={selectedPagesArray}
                                  allCardPages={allCardPages}
                                  highlightedPages={highlightedPages}
                                  isBinderSelectionMode={isBinderSelectionMode}
                                  selectionMode={selectionMode}
                                  showHeader={false}
                                  currentHoverTarget={currentHoverTarget}
                                  activeDragData={activeDragData}
                                  isMobile={isMobile}
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

              {/* Bottom scroll zone indicator */}
              {isMobile &&
                isDragging &&
                dragStartTime &&
                Date.now() - dragStartTime >= 800 && (
                  <div
                    className={`sticky bottom-0 h-12 bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none z-50 flex items-center justify-center`}
                  >
                    <div className="text-blue-600 text-xs font-medium animate-pulse">
                      ↓ Drag here to scroll down
                    </div>
                  </div>
                )}

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
          <div
            className={`border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 ${
              isMobile ? "px-3 py-3" : "px-4 sm:px-8 py-4 sm:py-6"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4 sm:space-x-8 text-xs sm:text-sm">
                <div className="text-slate-600">
                  <span className="font-semibold">Total Pages:</span>{" "}
                  {displayPages + 1}
                </div>
                <div className="text-slate-600">
                  <span className="font-semibold">Cards/Page:</span>{" "}
                  {cardsPerPage}
                </div>
              </div>
              <div className="flex items-center space-x-3 sm:space-x-6 flex-wrap justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded"></div>
                  <span className="text-xs sm:text-sm text-slate-600">
                    Cover
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
                  <span className="text-xs sm:text-sm text-slate-600">
                    Has cards
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-400 rounded"></div>
                  <span className="text-xs sm:text-sm text-slate-600">
                    Empty
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
                  <span className="text-xs sm:text-sm text-slate-600">
                    Selected
                  </span>
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
