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

  // Key for saving selection to localStorage
  const LOCAL_STORAGE_KEY = "addCardModalSelection";
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isAddingToPage, setIsAddingToPage] = useState(false);
  const [addToPage, setAddToPage] = useState(false);
  const closeButtonRef = useRef(null);

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
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear saved selection after successful add
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
                  className={`add-card-modal-panel w-full overflow-hidden bg-card-background text-left align-middle shadow-xl transition-all flex flex-col relative ${
                    isCompact
                      ? "max-w-3xl h-[80vh] rounded-2xl"
                      : isMobileScreen
                      ? "w-screen h-screen"
                      : "max-w-6xl h-[95vh] sm:h-[90vh] rounded-2xl"
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

                  {/* Tabs */}
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
                        <div className={`h-full ${!isCompact ? "pb-40" : ""}`}>
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
                          <div className="h-full pb-40">
                            <SetTab
                              currentBinder={currentBinder}
                              onAddCards={handleAddCards}
                              onSetAdded={onClose}
                            />
                          </div>
                        </Tab.Panel>
                      )}
                      <Tab.Panel className="h-full">
                        <div className={`h-full ${!isCompact ? "pb-40" : ""}`}>
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

                  {/* Floating Footer - Hidden in compact for Single Cards */}
                  {!isCompact && (
                    <div className="absolute bottom-0 left-0 right-0 bg-transparent pointer-events-none z-30">
                      <div className="pointer-events-auto p-3">
                        {(activeTab === 0 || activeTab === 2) && (
                          <div className="space-y-3">
                            {/* Placement Toggle */}
                            <Switch.Group
                              as="div"
                              className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800 p-3"
                            >
                              <Switch.Label
                                as="span"
                                className="flex-grow flex flex-col mr-4"
                                passive
                              >
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  Add to Current Page
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Shifts existing cards to make space.
                                </span>
                              </Switch.Label>
                              <Switch
                                checked={addToPage}
                                onChange={setAddToPage}
                                className={`${
                                  addToPage
                                    ? "bg-blue-600"
                                    : "bg-gray-200 dark:bg-gray-600"
                                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
                              >
                                <span
                                  className={`${
                                    addToPage
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                              </Switch>
                            </Switch.Group>

                            {/* Primary Action Button */}
                            <button
                              onClick={handlePrimaryAddAction}
                              disabled={
                                selectedTotalCount === 0 ||
                                isAdding ||
                                isAddingToPage
                              }
                              className="w-full flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 px-3 py-3 text-base font-semibold shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                            >
                              {isAdding || isAddingToPage ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              ) : (
                                <PlusIcon className="w-5 h-5" />
                              )}
                              <span>
                                {isAdding || isAddingToPage
                                  ? "Adding..."
                                  : selectedTotalCount > 0
                                  ? `Add ${selectedTotalCount} Card${
                                      selectedTotalCount !== 1 ? "s" : ""
                                    }`
                                  : "Add Cards"}
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
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCardModal;
