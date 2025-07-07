import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import {
  XMarkIcon,
  PlusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Squares2X2Icon,
  RectangleGroupIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { getGridConfig } from "../../hooks/useBinderDimensions";
import { toast } from "react-hot-toast";
import SingleCardTab from "./SingleCardTab";
import SetTab from "./SetTab";
import SleevesTab from "./SleevesTab";
import { useAtom } from "jotai";
import { modalModeAtom } from "../../atoms/addCardModalAtoms";

const AddCardModal = ({
  isOpen,
  onClose,
  currentBinder,
  targetPosition = null,
}) => {
  const { batchAddCards, batchMoveCards } = useBinderContext();
  const [selectedCardsMap, setSelectedCardsMap] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isAddingToPage, setIsAddingToPage] = useState(false);
  const closeButtonRef = useRef(null);

  // Modal display mode handling (standard vs compact)
  const [modalMode, setModalMode] = useAtom(modalModeAtom);
  const isCompact = modalMode === "compact";
  const handleToggleMode = () => {
    if (isCompact) {
      setModalMode("standard");
    } else {
      setModalMode("compact");
      setActiveTab(0); // ensure valid tab
    }
  };

  // Refs and state for manual dragging in compact mode
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCardsMap({});
    }
  }, [isOpen]);

  // Reset position when leaving compact mode (but keep during close animation)
  useEffect(() => {
    if (!isCompact) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isCompact]);

  const handlePointerDown = (e) => {
    if (!isCompact) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    dragOffsetRef.current = { x: startX - position.x, y: startY - position.y };

    const handlePointerMove = (moveEvent) => {
      const newX = moveEvent.clientX - dragOffsetRef.current.x;
      const newY = moveEvent.clientY - dragOffsetRef.current.y;

      // Optional: simple clamping so the modal stays within viewport
      const panelEl = panelRef.current;
      if (panelEl) {
        const panelWidth = panelEl.offsetWidth;
        const panelHeight = panelEl.offsetHeight;
        const maxX = window.innerWidth - panelWidth;
        const maxY = window.innerHeight - panelHeight;
        setPosition({
          x: Math.min(Math.max(newX, 0), maxX),
          y: Math.min(Math.max(newY, 0), maxY),
        });
      } else {
        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      document.body.classList.remove("select-none");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    // Disable user text selection during drag
    document.body.classList.add("select-none");
  };

  const handleCardSelect = (card) => {
    setSelectedCardsMap((prev) => {
      const newMap = { ...prev };
      if (newMap[card.id]) {
        // Deselect card entirely
        delete newMap[card.id];
      } else {
        newMap[card.id] = { card, count: 1 };
      }
      return newMap;
    });
  };

  const handleIncrease = (card) => {
    setSelectedCardsMap((prev) => {
      const prevEntry = prev[card.id];
      const newCount = prevEntry ? prevEntry.count + 1 : 1;
      return {
        ...prev,
        [card.id]: { card, count: newCount },
      };
    });
  };

  const handleDecrease = (card) => {
    setSelectedCardsMap((prev) => {
      const prevEntry = prev[card.id];
      if (!prevEntry) return prev;

      if (prevEntry.count === 1) {
        const { [card.id]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [card.id]: { card, count: prevEntry.count - 1 },
      };
    });
  };

  const getSelectedCardsArray = () => {
    const arr = [];
    Object.values(selectedCardsMap).forEach(({ card, count }) => {
      for (let i = 0; i < count; i++) arr.push(card);
    });
    return arr;
  };

  const selectedTotalCount = Object.values(selectedCardsMap).reduce(
    (sum, obj) => sum + obj.count,
    0
  );

  const handleAddSelectedCards = async () => {
    const selectedArray = getSelectedCardsArray();
    if (!currentBinder || selectedArray.length === 0) return;

    try {
      setIsAdding(true);

      // Use batch add for much better performance
      await batchAddCards(currentBinder.id, selectedArray, targetPosition);

      const positionText =
        targetPosition !== null
          ? ` (starting at position ${targetPosition})`
          : "";

      toast.success(
        `Added ${selectedArray.length} card${
          selectedArray.length > 1 ? "s" : ""
        } to ${currentBinder.metadata.name}${positionText}`
      );
      setSelectedCardsMap({});
      onClose();
    } catch (error) {
      console.error("Failed to add cards:", error);
      toast.error(
        "Failed to add cards to binder, you might have reached your limit as a guest user."
      );
    } finally {
      setIsAdding(false);
    }
  };

  // Handle adding multiple cards (from sets) - now uses batch add
  const handleAddCards = async (cards, isReplacement = false) => {
    if (!currentBinder || !Array.isArray(cards) || cards.length === 0) return;

    try {
      // Use batch add for much better performance
      // Pass isReplacement for complete sets to bypass existing card count in limit check
      await batchAddCards(
        currentBinder.id,
        cards,
        targetPosition,
        {},
        isReplacement
      );
    } catch (error) {
      console.error("Failed to add cards:", error);
      throw error; // Re-throw to let the caller handle the error message
    }
  };

  const isCardSelected = (cardId) => {
    return !!selectedCardsMap[cardId];
  };

  // Add selected cards to the beginning of the current page (with shifting)
  const handleAddSelectedCardsToPage = async () => {
    const selectedArray = getSelectedCardsArray();
    if (!currentBinder || selectedArray.length === 0) return;

    const gridSize = currentBinder.settings?.gridSize || "3x3";
    const cardsPerPage = getGridConfig(gridSize)?.total || 9;

    // Calculate the first slot index of the current page
    let pageStartPosition = 0;
    if (targetPosition !== null) {
      pageStartPosition =
        Math.floor(targetPosition / cardsPerPage) * cardsPerPage;
    }

    try {
      setIsAddingToPage(true);

      // 1. Shift existing cards forward to make space
      const shiftCount = selectedArray.length;
      const occupiedPositions = Object.keys(currentBinder.cards || {})
        .map((p) => parseInt(p, 10))
        .filter((pos) => pos >= pageStartPosition)
        .sort((a, b) => b - a); // Descending

      const moveOperations = occupiedPositions.map((pos) => ({
        fromPosition: pos,
        toPosition: pos + shiftCount,
      }));

      if (moveOperations.length > 0) {
        await batchMoveCards(currentBinder.id, moveOperations);
      }

      // 2. Add the new cards starting from pageStartPosition
      await batchAddCards(currentBinder.id, selectedArray, pageStartPosition);

      toast.success(
        `Added ${selectedArray.length} card${
          selectedArray.length > 1 ? "s" : ""
        } to page starting at slot ${pageStartPosition}`
      );

      setSelectedCardsMap({});
      onClose();
    } catch (error) {
      console.error("Failed to add cards to page:", error);
      toast.error("Failed to add cards to current page");
    } finally {
      setIsAddingToPage(false);
    }
  };

  // Helper: prevent outside-click dismissal in compact mode
  const dialogOnClose = (value) => {
    if (isCompact) return; // ignore backdrop / outside clicks when compact
    onClose(value);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={dialogOnClose}
        initialFocus={closeButtonRef}
      >
        {/* Backdrop only in standard (fullscreen) mode */}
        {!isCompact && (
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>
        )}

        <div
          className={`fixed inset-0 ${
            isCompact ? "pointer-events-none" : "overflow-y-auto"
          }`}
        >
          <div
            className={`flex min-h-full p-2 sm:p-4 text-center ${
              isCompact
                ? "items-start justify-start"
                : "items-center justify-center"
            }`}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div
                style={{
                  transform: isCompact
                    ? `translate(${position.x}px, ${position.y}px)`
                    : "none",
                }}
                className="pointer-events-auto"
              >
                <Dialog.Panel
                  ref={panelRef}
                  className={`add-card-modal-panel w-full overflow-hidden rounded-2xl bg-card-background text-left align-middle shadow-xl transition-all flex flex-col ${
                    isCompact
                      ? "max-w-3xl h-[80vh]"
                      : "max-w-6xl h-[99vh] sm:h-[95vh]"
                  }`}
                >
                  {/* Header */}
                  <div
                    className={`flex items-center justify-between border-b border-border flex-shrink-0 add-card-modal-header ${
                      isCompact ? "p-2" : "p-3 sm:p-4"
                    }`}
                    style={{ cursor: isCompact ? "move" : "default" }}
                    onPointerDown={handlePointerDown}
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <Dialog.Title
                        as="h3"
                        className="text-sm sm:text-lg font-medium text-primary truncate"
                      >
                        Add Cards to {currentBinder?.metadata?.name}
                        {targetPosition !== null && (
                          <span className="text-blue-600 font-normal">
                            {" "}
                            - Slot {targetPosition}
                          </span>
                        )}
                      </Dialog.Title>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleMode}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                        aria-label={
                          isCompact
                            ? "Switch to fullscreen mode"
                            : "Switch to compact mode"
                        }
                      >
                        {isCompact ? (
                          <ArrowsPointingOutIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        ) : (
                          <ArrowsPointingInIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        )}
                      </button>
                      <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                        aria-label="Close modal"
                      >
                        <XMarkIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tab.Group
                    selectedIndex={activeTab}
                    onChange={setActiveTab}
                    as="div"
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <Tab.List
                      className={`flex flex-shrink-0 border-b border-border bg-secondary ${
                        isCompact ? "overflow-x-auto scrollbar-thin" : ""
                      }`}
                    >
                      <Tab as={Fragment}>
                        {({ selected }) => (
                          <button
                            className={`flex-1 whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                              selected
                                ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            } ${
                              isCompact
                                ? "px-2 py-2 text-xs flex flex-col items-center gap-0.5"
                                : "px-3 sm:px-4 py-2.5 text-sm font-medium"
                            }`}
                          >
                            <Squares2X2Icon
                              className={`h-5 w-5 ${isCompact ? "" : "hidden"}`}
                            />
                            {isCompact ? (
                              <span className="sr-only">Single</span>
                            ) : (
                              "Single Cards"
                            )}
                          </button>
                        )}
                      </Tab>
                      {/* Hide Complete Sets in compact mode */}
                      {!isCompact && (
                        <Tab as={Fragment}>
                          {({ selected }) => (
                            <button
                              className={`flex-1 whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                                selected
                                  ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              } ${
                                isCompact
                                  ? "px-2 py-2 text-xs flex flex-col items-center gap-0.5"
                                  : "px-3 sm:px-4 py-2.5 text-sm font-medium"
                              }`}
                            >
                              <RectangleGroupIcon className="h-5 w-5 hidden" />
                              Complete Sets
                            </button>
                          )}
                        </Tab>
                      )}
                      <Tab as={Fragment}>
                        {({ selected }) => (
                          <button
                            className={`flex-1 whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                              selected
                                ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            } ${
                              isCompact
                                ? "px-2 py-2 text-xs flex flex-col items-center gap-0.5"
                                : "px-3 sm:px-4 py-2.5 text-sm font-medium"
                            }`}
                          >
                            <CubeTransparentIcon
                              className={`h-5 w-5 ${isCompact ? "" : "hidden"}`}
                            />
                            {isCompact ? (
                              <span className="sr-only">Sleeves</span>
                            ) : (
                              "Sleeves (WIP)"
                            )}
                          </button>
                        )}
                      </Tab>
                    </Tab.List>

                    <Tab.Panels className="flex-1 min-h-0">
                      <Tab.Panel className="h-full">
                        <div className="h-full">
                          <SingleCardTab
                            selectedMap={selectedCardsMap}
                            onCardSelect={handleCardSelect}
                            isCardSelected={isCardSelected}
                            onIncrease={handleIncrease}
                            onDecrease={handleDecrease}
                            compact={isCompact}
                          />
                        </div>
                      </Tab.Panel>
                      {/* Complete Sets panel hidden in compact */}
                      {!isCompact && (
                        <Tab.Panel className="h-full">
                          <div className="h-full">
                            <SetTab
                              currentBinder={currentBinder}
                              onAddCards={handleAddCards}
                            />
                          </div>
                        </Tab.Panel>
                      )}
                      <Tab.Panel className="h-full">
                        <div className="h-full">
                          <SleevesTab
                            selectedMap={selectedCardsMap}
                            onCardSelect={handleCardSelect}
                            isCardSelected={isCardSelected}
                            onIncrease={handleIncrease}
                            onDecrease={handleDecrease}
                            compact={isCompact}
                          />
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>

                  {/* Sticky Footer - Hidden in compact for Single Cards */}
                  {!isCompact && (
                    <div
                      className={`flex-shrink-0 border-t border-border bg-secondary ${
                        isCompact ? "p-2" : ""
                      }`}
                    >
                      {(activeTab === 0 || activeTab === 2) && (
                        /* Footer for single cards tab */
                        <div className="flex items-center justify-between p-3 sm:p-4 gap-4">
                          {/* Selected cards info */}
                          <div className="flex items-center space-x-2 min-w-0">
                            {selectedTotalCount > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-400 flex-shrink-0 font-medium">
                                  {selectedTotalCount} selected
                                </span>
                                <div className="hidden sm:flex -space-x-2 overflow-hidden">
                                  {Object.values(selectedCardsMap)
                                    .slice(0, 3)
                                    .map(({ card }) => (
                                      <div
                                        key={card.id}
                                        className="w-8 h-10 bg-slate-200 dark:bg-slate-700 rounded border-2 border-white dark:border-slate-600 shadow-sm overflow-hidden flex-shrink-0"
                                      >
                                        {card.image && (
                                          <img
                                            src={card.image}
                                            alt={card.name}
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                    ))}
                                  {selectedTotalCount > 3 && (
                                    <div className="w-8 h-10 bg-slate-300 dark:bg-slate-600 rounded border-2 border-white dark:border-slate-600 shadow-sm flex items-center justify-center flex-shrink-0">
                                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                                        +{selectedTotalCount - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            {/* Cancel Button */}
                            <button
                              onClick={onClose}
                              className={`w-full sm:w-auto rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 ${
                                isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2"
                              }`}
                            >
                              Cancel
                            </button>

                            {/* Add to current page button */}
                            <button
                              onClick={handleAddSelectedCardsToPage}
                              disabled={
                                selectedTotalCount === 0 || isAddingToPage
                              }
                              className={`w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                                isCompact
                                  ? "px-3 py-1.5 text-xs"
                                  : "px-4 py-2 sm:min-w-[170px]"
                              }`}
                            >
                              {isAddingToPage ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <PlusIcon className="w-4 h-4" />
                              )}
                              <span>
                                {isAddingToPage
                                  ? "Adding..."
                                  : `Add to current page (${selectedTotalCount})`}
                              </span>
                            </button>

                            <button
                              onClick={handleAddSelectedCards}
                              disabled={selectedTotalCount === 0 || isAdding}
                              className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                                isCompact
                                  ? "px-3 py-1.5 text-xs"
                                  : "px-4 py-2 sm:min-w-[120px]"
                              }`}
                            >
                              {isAdding ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <PlusIcon className="w-4 h-4" />
                              )}
                              <span>
                                {isAdding
                                  ? "Adding..."
                                  : `Add ${selectedTotalCount || ""} Card${
                                      selectedTotalCount !== 1 ? "s" : ""
                                    }`}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {activeTab === 1 && (
                        /* Footer for sets tab */
                        <div className="p-3 sm:p-4">
                          <div className="flex justify-end">
                            <button
                              onClick={onClose}
                              className="w-full sm:w-auto px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Dialog.Panel>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCardModal;
