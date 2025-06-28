import { useState, useRef, useEffect, useCallback } from "react";
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

const ITEM_TYPE = "PAGE";

// Mobile breakpoint and constants
const MOBILE_BREAKPOINT = 768;
const NAVBAR_HEIGHT = 65;
const MOBILE_PADDING = 16;
const DESKTOP_PADDING = 24;

// Draggable Page Component
const DraggablePage = ({
  pageIndex,
  logicalIndex,
  binder,
  gridConfig,
  onPageClick,
  onMovePages,
  isMobile,
  onDragStart,
  onDragEnd,
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
    begin: (monitor) => {
      if (onDragStart) onDragStart();
    },
    end: (item, monitor) => {
      if (onDragEnd) onDragEnd();
    },
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
        ${isMobile ? "p-2" : "p-4"} aspect-[3/4]
      `}
      >
        {/* Page Header */}
        <div
          className={`flex items-center justify-between ${
            isMobile ? "mb-2" : "mb-3"
          }`}
        >
          <div className="flex items-center space-x-2">
            <div
              className={`${
                isMobile ? "text-xs" : "text-sm"
              } font-bold text-slate-700`}
            >
              Page {logicalIndex + 1}
            </div>
            {pageIndex === 0 && (
              <div
                className={`bg-purple-100 text-purple-700 ${
                  isMobile ? "text-xs px-1 py-0.5" : "text-xs px-2 py-1"
                } rounded-full font-medium`}
              >
                {isMobile ? "Cover" : "Cover • Fixed"}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <div
              className={`${isMobile ? "text-xs" : "text-xs"} text-slate-500`}
            >
              {cardCount}/{gridConfig.total}
            </div>
            {!isCoverPage && (
              <ArrowsRightLeftIcon
                className={`${isMobile ? "w-2 h-2" : "w-3 h-3"} text-slate-400`}
              />
            )}
            {isCoverPage && (
              <div
                className={`${
                  isMobile ? "w-2 h-2" : "w-3 h-3"
                } text-purple-400`}
                title="Cover page cannot be moved"
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
              <DocumentDuplicateIcon
                className={`${
                  isMobile ? "w-6 h-6" : "w-8 h-8"
                } text-slate-300 mx-auto mb-2`}
              />
              <div
                className={`${isMobile ? "text-xs" : "text-xs"} text-slate-400`}
              >
                Empty Page
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`grid ${isMobile ? "gap-0.5" : "gap-1"} h-full`}
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
            <div
              className={`bg-blue-600 text-white ${
                isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm"
              } rounded-full font-medium`}
            >
              Moving Page {logicalIndex + 1}
            </div>
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
            <div
              className={`bg-blue-600 text-white ${
                isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm"
              } rounded-full font-medium`}
            >
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
      const scrollSpeed = 6; // Slower for simpler interface

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
      ".page-overview-simple-scroll"
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

  // Reset drag state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      setDragStartTime(null);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  }, [isOpen, autoScrollInterval]);

  if (!isOpen || !currentBinder) return null;

  const isMobile = windowWidth < MOBILE_BREAKPOINT;
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

  // Calculate modal height for mobile to account for navigation bar
  const modalHeight = isMobile
    ? `calc(100vh - ${NAVBAR_HEIGHT}px - ${MOBILE_PADDING}px)`
    : "90vh";

  const modalTop = isMobile
    ? `${NAVBAR_HEIGHT + MOBILE_PADDING / 2}px`
    : "auto";

  // Grid columns based on screen size
  const getGridColumns = () => {
    if (isMobile) {
      return windowWidth < 480 ? "grid-cols-2" : "grid-cols-3";
    }
    return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col ${
          isMobile ? `mx-2 rounded-lg` : "max-w-7xl max-h-[90vh] m-4"
        }`}
        style={{
          height: modalHeight,
          ...(isMobile && {
            marginTop: modalTop,
            maxHeight: `calc(100vh - ${NAVBAR_HEIGHT}px - ${MOBILE_PADDING}px)`,
          }),
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-slate-200 ${
            isMobile ? "p-3" : "p-6"
          }`}
        >
          <div>
            <h2
              className={`${
                isMobile ? "text-lg" : "text-2xl"
              } font-bold text-slate-900`}
            >
              Page Overview
            </h2>
            <p className={`text-slate-600 mt-1 ${isMobile ? "text-sm" : ""}`}>
              {currentBinder.metadata?.name} • {pageCount} pages
              {!isMobile && " • Drag to reorder (cover page fixed)"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isMobile && (
              <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                <EyeIcon className="w-4 h-4" />
                <span>Click to view • Drag to reorder</span>
              </div>
            )}
            <button
              onClick={onClose}
              className={`${
                isMobile ? "p-1" : "p-2"
              } hover:bg-slate-100 rounded-lg transition-colors`}
            >
              <XMarkIcon
                className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} text-slate-400`}
              />
            </button>
          </div>
        </div>

        {/* Page Grid */}
        <div
          className={`flex-1 page-overview-simple-scroll overflow-auto ${
            isMobile ? "p-3" : "p-6"
          }`}
          style={{
            touchAction: isDragging ? "none" : "auto",
            userSelect: isDragging ? "none" : "auto",
          }}
        >
          <DndProvider backend={HTML5Backend}>
            <div
              className={`grid ${getGridColumns()} ${
                isMobile ? "gap-3" : "gap-6"
              }`}
            >
              {pageOrder.map((pageIndex, logicalIndex) => (
                <DraggablePage
                  key={`${pageIndex}-${logicalIndex}`}
                  pageIndex={pageIndex}
                  logicalIndex={logicalIndex}
                  binder={currentBinder}
                  gridConfig={gridConfig}
                  onPageClick={handlePageClick}
                  onMovePages={handleMovePages}
                  isMobile={isMobile}
                  onDragStart={() => {
                    setIsDragging(true);
                    setDragStartTime(Date.now());
                  }}
                  onDragEnd={() => {
                    setIsDragging(false);
                    setDragStartTime(null);
                    if (autoScrollInterval) {
                      clearInterval(autoScrollInterval);
                      setAutoScrollInterval(null);
                    }
                  }}
                />
              ))}
            </div>
          </DndProvider>
        </div>

        {/* Footer */}
        <div
          className={`border-t border-slate-200 bg-slate-50 ${
            isMobile ? "px-3 py-2" : "px-6 py-4"
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              isMobile ? "text-xs" : "text-sm"
            } text-slate-600`}
          >
            <div>
              Total cards: {Object.keys(currentBinder.cards || {}).length} •
              Grid: {gridConfig.name} ({gridConfig.total} cards per page)
            </div>
            {!isMobile && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageOverview;
