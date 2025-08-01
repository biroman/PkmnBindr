import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition, Tab, Switch } from "@headlessui/react";
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
import SelectedCardsSidebar from "./SelectedCardsSidebar";
import { useAtom } from "jotai";
import { modalModeAtom } from "../../atoms/addCardModalAtoms";
import useCardSearch from "../../hooks/useCardSearch";
import useBinderLimits from "../../hooks/useBinderLimits";

const AddCardModal = ({
  isOpen,
  onClose,
  currentBinder,
  targetPosition = null,
}) => {
  const { batchAddCards, batchMoveCards } = useBinderContext();
  const [selectedCardsMap, setSelectedCardsMap] = useState({});

  // Key for saving selection to localStorage
  const LOCAL_STORAGE_KEY = "addCardModalSelection";
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isAddingToPage, setIsAddingToPage] = useState(false);
  const [addToPage, setAddToPage] = useState(false);
  const closeButtonRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false);

  const cardSearch = useCardSearch();
  const { fetchAllCards, totalCount } = cardSearch;
  const MAX_SELECT_ALL = 250;

  // Binder limits
  const { limits } = useBinderLimits(currentBinder);

  // Determine remaining card slots robustly
  const currentCardCount =
    limits?.cards?.current ?? Object.keys(currentBinder?.cards || {}).length;
  const binderCardLimit = limits?.cards?.limit ?? 1000; // fallback 1000
  const cardRemaining = Math.max(0, binderCardLimit - currentCardCount);

  // Reset search focus when modal closes / opens
  useEffect(() => {
    if (!isOpen) {
      setSearchFocused(false);
    }
  }, [isOpen]);

  const handleClearCard = (card) => {
    setSelectedCardsMap((prev) => {
      const newMap = { ...prev };
      delete newMap[card.id];
      return newMap;
    });
  };

  const handleClearAll = () => {
    setSelectedCardsMap({});
    // Note: We don't clear localStorage here, to allow recovery if it was a mistake.
    // It will be cleared on successful add.
  };

  const handleSelectAll = async () => {
    if (totalCount === 0 || totalCount > MAX_SELECT_ALL) return;

    setIsSelectAllLoading(true);
    try {
      const allCards = await fetchAllCards(MAX_SELECT_ALL);
      const newSelectedCardsMap = allCards.reduce((acc, card) => {
        acc[card.id] = { card, count: 1 };
        return acc;
      }, {});
      setSelectedCardsMap(newSelectedCardsMap);
    } catch (error) {
      console.error("Failed to select all cards:", error);
      toast.error("An error occurred while selecting all cards.");
    } finally {
      setIsSelectAllLoading(false);
    }
  };

  // Detect mobile screen (matches Tailwind sm breakpoint <640px)
  const isMobileScreen = window.matchMedia("(max-width: 639px)").matches;

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

  // Ensure compact mode is disabled on mobile
  useEffect(() => {
    if (isMobileScreen && modalMode === "compact") {
      setModalMode("standard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileScreen]);

  // Refs and state for manual dragging in compact mode
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load saved selection when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Basic validation that parsed is an object
          if (parsed && typeof parsed === "object") {
            setSelectedCardsMap(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to parse saved card selection:", err);
      }
    }
  }, [isOpen]);

  // Persist selection every time it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedCardsMap));
    } catch (err) {
      console.error("Failed to save card selection:", err);
    }
  }, [selectedCardsMap]);

  // Reset position when leaving compact mode (but keep during close animation)
  useEffect(() => {
    if (!isCompact) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isCompact]);

  const handlePrimaryAddAction = () => {
    if (exceedsLimit) return; // Safety
    if (addToPage) {
      handleAddSelectedCardsToPage();
    } else {
      handleAddSelectedCards();
    }
  };

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

  const exceedsLimit = selectedTotalCount > cardRemaining;

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
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear saved selection after successful add
      onClose();
    } catch (error) {
      console.error("Failed to add cards:", error);
      const errorMessage =
        error?.message?.includes("limit") ||
        error?.message?.includes("Cannot add")
          ? error.message
          : "Adding these cards would exceed the maximum card limit for this binder.";

      toast.error(errorMessage, {
        position: isMobileScreen ? "bottom-center" : "bottom-right",
        id: "add-cards-error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Handle adding multiple cards (from sets) - now uses batch add
  const handleAddCards = async (
    cards,
    isReplacement = false,
    startPosition = null,
    shouldShift = false
  ) => {
    if (!currentBinder || !Array.isArray(cards) || cards.length === 0) return;

    try {
      // Determine the position to start adding cards
      let addPosition = startPosition;
      if (addPosition === null) {
        // If no position specified, use targetPosition or default behavior
        addPosition = isReplacement ? 0 : targetPosition;
      }

      // Handle shifting existing cards if needed (for "start" placement)
      if (shouldShift && addPosition !== null) {
        const shiftCount = cards.length;
        const occupiedPositions = Object.keys(currentBinder.cards || {})
          .map((p) => parseInt(p, 10))
          .filter((pos) => pos >= addPosition)
          .sort((a, b) => b - a); // Descending

        const moveOperations = occupiedPositions.map((pos) => ({
          fromPosition: pos,
          toPosition: pos + shiftCount,
        }));

        if (moveOperations.length > 0) {
          await batchMoveCards(currentBinder.id, moveOperations);
        }
      }

      // Use batch add for much better performance
      // When replacing (adding complete sets), always start from position 0
      // Pass isReplacement for complete sets to bypass existing card count in limit check
      await batchAddCards(
        currentBinder.id,
        cards,
        addPosition,
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
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear saved selection after successful add
      onClose();
    } catch (error) {
      console.error("Failed to add cards to page:", error);
      const errorMessage =
        error?.message?.includes("limit") ||
        error?.message?.includes("Cannot add")
          ? error.message
          : "Adding these cards would exceed the maximum card limit for this binder.";

      toast.error(errorMessage, {
        position: isMobileScreen ? "bottom-center" : "bottom-right",
        id: "add-cards-page-error",
      });
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
            className={`flex min-h-full text-center ${
              isCompact
                ? "items-start justify-start p-2 sm:p-4"
                : isMobileScreen
                ? "items-center justify-center"
                : "items-center justify-center p-4"
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
              <Dialog.Panel
                ref={panelRef}
                style={{
                  transform: isCompact
                    ? `translate(${position.x}px, ${position.y}px)`
                    : "none",
                }}
                className={`add-card-modal-panel pointer-events-auto w-full overflow-hidden bg-card-background text-left align-middle shadow-xl transition-all flex flex-col relative ${
                  isCompact
                    ? "max-w-3xl h-[80vh] rounded-2xl"
                    : isMobileScreen
                    ? "w-screen h-screen"
                    : "max-w-7xl h-[95vh] sm:h-[90vh] rounded-2xl"
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
                    {/* Compact toggle only on screens >= sm */}
                    {!isMobileScreen && (
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
                    )}
                    <button
                      ref={closeButtonRef}
                      onClick={onClose}
                      className="p-2 sm:p-1.5 bg-slate-100 sm:bg-transparent dark:bg-slate-800 sm:dark:bg-transparent rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 sm:hover:bg-slate-100 sm:dark:hover:bg-slate-700"
                      aria-label="Close modal"
                    >
                      <XMarkIcon className="w-6 h-6 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 min-h-0">
                  <Tab.Group
                    selectedIndex={activeTab}
                    onChange={setActiveTab}
                    as="div"
                    className="flex flex-col flex-1 min-h-0 relative"
                  >
                    <div className="px-3 pt-3">
                      <Tab.List
                        className={`flex w-full space-x-1 rounded-xl bg-slate-200 dark:bg-slate-700 p-1 ${
                          isCompact ? "overflow-x-auto scrollbar-thin" : ""
                        }`}
                      >
                        <Tab as={Fragment}>
                          {({ selected }) => (
                            <button
                              className={`w-full rounded-lg py-2 text-sm font-medium leading-5 transition-all duration-200 ease-in-out focus:outline-none ring-white/60 focus:ring-2
                                ${
                                  selected
                                    ? "bg-white dark:bg-slate-800 shadow text-blue-700 dark:text-blue-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-white/[0.5] dark:hover:bg-slate-800/[0.5]"
                                }
                              `}
                            >
                              Single Cards
                            </button>
                          )}
                        </Tab>
                        {/* Hide Complete Sets in compact mode */}
                        {!isCompact && (
                          <Tab as={Fragment}>
                            {({ selected }) => (
                              <button
                                className={`w-full rounded-lg py-2 text-sm font-medium leading-5 transition-all duration-200 ease-in-out focus:outline-none ring-white/60 focus:ring-2
                                 ${
                                   selected
                                     ? "bg-white dark:bg-slate-800 shadow text-blue-700 dark:text-blue-400"
                                     : "text-slate-600 dark:text-slate-400 hover:bg-white/[0.5] dark:hover:bg-slate-800/[0.5]"
                                 }
                               `}
                              >
                                Sets
                              </button>
                            )}
                          </Tab>
                        )}
                        <Tab as={Fragment}>
                          {({ selected }) => (
                            <button
                              className={`w-full rounded-lg py-2 text-sm font-medium leading-5 transition-all duration-200 ease-in-out focus:outline-none ring-white/60 focus:ring-2
                                ${
                                  selected
                                    ? "bg-white dark:bg-slate-800 shadow text-blue-700 dark:text-blue-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-white/[0.5] dark:hover:bg-slate-800/[0.5]"
                                }
                              `}
                            >
                              Sleeves
                            </button>
                          )}
                        </Tab>
                      </Tab.List>
                    </div>
                    <Tab.Panels className="flex-1 min-h-0 pt-2">
                      <Tab.Panel className="h-full">
                        <div
                          className={`h-full ${
                            !isCompact && isMobileScreen ? "pb-0" : ""
                          }`}
                        >
                          <SingleCardTab
                            {...cardSearch}
                            selectedMap={selectedCardsMap}
                            onCardSelect={handleCardSelect}
                            isCardSelected={isCardSelected}
                            onIncrease={handleIncrease}
                            onDecrease={handleDecrease}
                            compact={isCompact}
                            onSearchFocusChange={setSearchFocused}
                            onFiltersVisibilityChange={setFiltersOpen}
                            onSelectAll={handleSelectAll}
                            onClearSelection={handleClearAll}
                            isSelectAllLoading={isSelectAllLoading}
                          />
                        </div>
                      </Tab.Panel>
                      {/* Complete Sets panel hidden in compact */}
                      {!isCompact && (
                        <Tab.Panel className="h-full">
                          <div
                            className={`h-full ${isMobileScreen ? "pb-0" : ""}`}
                          >
                            <SetTab
                              currentBinder={currentBinder}
                              onAddCards={handleAddCards}
                              onSetAdded={onClose}
                            />
                          </div>
                        </Tab.Panel>
                      )}
                      <Tab.Panel className="h-full">
                        <div
                          className={`h-full ${
                            !isCompact && isMobileScreen ? "pb-0" : ""
                          }`}
                        >
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

                  {/* Selected Items Sidebar - for desktop only */}
                  {!isCompact && !isMobileScreen && activeTab !== 1 && (
                    <SelectedCardsSidebar
                      selectedMap={selectedCardsMap}
                      onIncrease={handleIncrease}
                      onDecrease={handleDecrease}
                      onClearCard={handleClearCard}
                      onClearAll={handleClearAll}
                      handlePrimaryAddAction={handlePrimaryAddAction}
                      addToPage={addToPage}
                      setAddToPage={setAddToPage}
                      exceedsLimit={exceedsLimit}
                      cardRemaining={cardRemaining}
                      selectedTotalCount={selectedTotalCount}
                      isAdding={isAdding}
                      isAddingToPage={isAddingToPage}
                      activeTab={activeTab}
                    />
                  )}
                </div>

                {/* Floating Footer for Mobile - Hidden in compact mode */}
                {!isCompact &&
                  isMobileScreen &&
                  selectedTotalCount > 0 &&
                  !searchFocused &&
                  !filtersOpen && (
                    <div className="absolute bottom-0 left-0 right-0 bg-transparent pointer-events-none z-30">
                      <div className="pointer-events-auto p-3 bg-card-background/80 dark:bg-card-background/90">
                        {(activeTab === 0 || activeTab === 2) && (
                          <div className="flex items-center gap-3">
                            {/* Add to Current Page */}
                            <button
                              onClick={handleAddSelectedCardsToPage}
                              disabled={
                                selectedTotalCount === 0 ||
                                isAddingToPage ||
                                isAdding ||
                                exceedsLimit
                              }
                              className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-all duration-150 px-3 py-3 text-xs font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                            >
                              {isAddingToPage
                                ? "Shifting..."
                                : exceedsLimit
                                ? "Limit Exceeded"
                                : `Add to Current Page (${selectedTotalCount})`}
                            </button>

                            {/* Add to Last Page */}
                            <button
                              onClick={handleAddSelectedCards}
                              disabled={
                                selectedTotalCount === 0 ||
                                isAdding ||
                                isAddingToPage ||
                                exceedsLimit
                              }
                              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-150 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                            >
                              {isAdding ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              ) : (
                                <PlusIcon className="w-5 h-5" />
                              )}
                              <span>
                                {isAdding
                                  ? "Adding..."
                                  : exceedsLimit
                                  ? "Limit Exceeded"
                                  : `Add cards (${selectedTotalCount})`}
                              </span>
                            </button>
                          </div>
                        )}

                        {activeTab === 1 && (
                          /* Footer for sets tab */
                          <div className="p-3">
                            <div className="flex justify-center">
                              <button
                                onClick={onClose}
                                className="w-full px-4 py-3 text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCardModal;
