import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { getGridConfig } from "../../hooks/useBinderDimensions";
import { toast } from "react-hot-toast";
import SingleCardTab from "./SingleCardTab";
import SetTab from "./SetTab";
import SleevesTab from "./SleevesTab";

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

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCardsMap({});
    }
  }, [isOpen]);

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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
        initialFocus={closeButtonRef}
      >
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

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-card-background text-left align-middle shadow-xl transition-all flex flex-col h-[99vh] sm:h-[95vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border flex-shrink-0">
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
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group
                  selectedIndex={activeTab}
                  onChange={setActiveTab}
                  as="div"
                  className="flex flex-col flex-1 min-h-0"
                >
                  <Tab.List className="flex border-b border-border bg-secondary flex-shrink-0">
                    <Tab as={Fragment}>
                      {({ selected }) => (
                        <button
                          className={`flex-1 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                            selected
                              ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          Single Cards
                        </button>
                      )}
                    </Tab>
                    <Tab as={Fragment}>
                      {({ selected }) => (
                        <button
                          className={`flex-1 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                            selected
                              ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          Complete Sets
                        </button>
                      )}
                    </Tab>
                    <Tab as={Fragment}>
                      {({ selected }) => (
                        <button
                          className={`flex-1 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                            selected
                              ? "border-b-2 border-blue-500 text-blue-600 bg-card-background"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          Sleeves (Work in Progress)
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
                        />
                      </div>
                    </Tab.Panel>
                    <Tab.Panel className="h-full">
                      <div className="h-full">
                        <SetTab
                          currentBinder={currentBinder}
                          onAddCards={handleAddCards}
                        />
                      </div>
                    </Tab.Panel>
                    <Tab.Panel className="h-full">
                      <div className="h-full">
                        <SleevesTab
                          selectedMap={selectedCardsMap}
                          onCardSelect={handleCardSelect}
                          isCardSelected={isCardSelected}
                          onIncrease={handleIncrease}
                          onDecrease={handleDecrease}
                        />
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Sticky Footer - Always visible */}
                <div className="flex-shrink-0 border-t border-border bg-secondary">
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
                          className="w-full sm:w-auto px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                        >
                          Cancel
                        </button>

                        {/* Add to current page button */}
                        <button
                          onClick={handleAddSelectedCardsToPage}
                          disabled={selectedTotalCount === 0 || isAddingToPage}
                          className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 sm:min-w-[170px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
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
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 sm:min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCardModal;
