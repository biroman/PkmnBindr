import { useState, Fragment } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import useSetSearch from "../../hooks/useSetSearch";
import { getGridConfig } from "../../hooks/useBinderDimensions";
import { useBinderContext } from "../../contexts/BinderContext";
import { useCardCache } from "../../contexts/CardCacheContext";
import { toast } from "react-hot-toast";

const SetTab = ({ currentBinder, onAddCards }) => {
  const { addCardsToCache } = useCardCache();
  const {
    sets,
    isLoading,
    error,
    searchQuery,
    updateSearchQuery,
    getSetCards,
    filteredCount,
    totalSets,
  } = useSetSearch();

  const {
    updateBinderSettings,
    addPage,
    batchAddPages,
    getPageCount,
    removeCardFromBinder,
    clearBinderCards,
  } = useBinderContext();

  const [addingSetId, setAddingSetId] = useState(null);
  const [includeReverseHolos, setIncludeReverseHolos] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showClearWarningModal, setShowClearWarningModal] = useState(false);
  const [pendingSet, setPendingSet] = useState(null);

  // Helper function to determine if a card can have a reverse holo version
  const canHaveReverseHolo = (rarity) => {
    const reverseHoloRarities = ["Common", "Uncommon", "Rare", "Rare Holo"];
    return reverseHoloRarities.includes(rarity);
  };

  // Helper function to create reverse holo version of a card
  const createReverseHoloCard = (card) => {
    return {
      ...card,
      id: `${card.id}-rh`, // Unique ID for cache purposes
      originalId: card.id, // Keep original ID for reference
      reverseHolo: true,
      addedAt: new Date().toISOString(),
    };
  };

  // Helper function to calculate total cards including reverse holos
  const calculateTotalCards = (set) => {
    if (!includeReverseHolos) return set.cardCount;

    // For now, estimate that about 60% of cards can have reverse holos (Commons, Uncommons, Rares)
    // This is an approximation since we don't have the actual rarity breakdown
    const estimatedReverseHoloCards = Math.floor(set.cardCount * 0.6);
    return set.cardCount + estimatedReverseHoloCards;
  };

  // Helper function to calculate binder capacity (considering clearing)
  const calculateBinderCapacity = (willClear = false) => {
    if (!currentBinder)
      return { totalSlots: 0, usedSlots: 0, availableSlots: 0 };

    const gridConfig = getGridConfig(currentBinder.settings.gridSize);
    const currentPages = getPageCount(currentBinder.id);

    // Page 1 has cover + one card page, subsequent pages are pairs of card pages
    // Cover page doesn't count for capacity
    const cardPages = currentPages === 1 ? 1 : 1 + (currentPages - 1) * 2;
    const totalSlots = cardPages * gridConfig.total;

    const usedSlots = willClear
      ? 0
      : Object.keys(currentBinder.cards || {}).length;
    const availableSlots = totalSlots - usedSlots;

    return { totalSlots, usedSlots, availableSlots, gridConfig, currentPages };
  };

  // Helper function to calculate options for expanding capacity
  const calculateExpansionOptions = (neededSlots, willClear = false) => {
    const { gridConfig, currentPages } = calculateBinderCapacity(willClear);
    const options = [];

    // Option 1: Increase grid size
    const gridSizes = [
      { name: "2x2", config: getGridConfig("2x2") },
      { name: "3x3", config: getGridConfig("3x3") },
      { name: "4x3", config: getGridConfig("4x3") },
      { name: "4x4", config: getGridConfig("4x4") },
    ];

    gridSizes.forEach(({ name, config }) => {
      if (config.total > gridConfig.total) {
        const cardPages = currentPages === 1 ? 1 : 1 + (currentPages - 1) * 2;
        const newTotalSlots = cardPages * config.total;
        const { usedSlots } = calculateBinderCapacity(willClear);
        const newAvailableSlots = newTotalSlots - usedSlots;

        if (newAvailableSlots >= neededSlots) {
          options.push({
            type: "gridSize",
            value: name,
            label: `Change to ${name} grid (${config.total} cards per page)`,
            newCapacity: newTotalSlots,
            additionalSlots:
              newTotalSlots - calculateBinderCapacity(willClear).totalSlots,
          });
        }
      }
    });

    // Option 2: Add pages
    // Calculate how many binder pages we need to add
    // Current capacity calculation: Page 1 = 1 card page, subsequent pages = 2 card pages each
    const currentCardPages =
      currentPages === 1 ? 1 : 1 + (currentPages - 1) * 2;
    const currentCapacity = currentCardPages * gridConfig.total;
    const { usedSlots } = calculateBinderCapacity(willClear);
    const currentAvailableSlots = currentCapacity - usedSlots;

    // When willClear=true, neededSlots is the total cards needed, not a shortfall
    const slotsShortfall = willClear
      ? neededSlots - currentCapacity // Total cards needed vs total capacity
      : neededSlots - currentAvailableSlots; // Cards needed vs available slots

    if (slotsShortfall > 0) {
      // Calculate how many binder pages we need to add to get enough slots
      const slotsPerNewPage = gridConfig.total * 2; // Each new page adds 2 card pages
      const pagesNeeded = Math.ceil(slotsShortfall / slotsPerNewPage);
      const maxPages = currentBinder.settings?.maxPages || 100;

      if (currentPages + pagesNeeded <= maxPages) {
        options.push({
          type: "addPages",
          value: pagesNeeded,
          label: `Add ${pagesNeeded} page${pagesNeeded > 1 ? "s" : ""} (${
            pagesNeeded * slotsPerNewPage
          } additional slots)`,
          newCapacity: currentCapacity + pagesNeeded * slotsPerNewPage,
          additionalSlots: pagesNeeded * slotsPerNewPage,
        });
      }
    }

    return options;
  };

  const checkCapacityAndAdd = async (set) => {
    const cardsToAdd = calculateTotalCards(set);
    const hasExistingCards = Object.keys(currentBinder.cards || {}).length > 0;

    // Always check capacity as if binder will be cleared (since sets replace all cards)
    const capacityInfo = calculateBinderCapacity(true);
    const { totalSlots, availableSlots } = capacityInfo;

    if (cardsToAdd > availableSlots) {
      // Not enough space even after clearing - show capacity modal
      setPendingSet({ set, cardsToAdd });
      setShowCapacityModal(true);
      return;
    }

    if (hasExistingCards) {
      // Enough space after clearing, but show warning that binder will be cleared
      setPendingSet({ set, cardsToAdd });
      setShowClearWarningModal(true);
      return;
    }

    // No existing cards and enough space - proceed with adding
    await executeAddSet(set);
  };

  const handleClearAndAdd = async () => {
    if (!pendingSet) return;

    const cardsToAdd = pendingSet.cardsToAdd;
    const { availableSlots } = calculateBinderCapacity(true); // Check capacity as if cleared

    if (cardsToAdd > availableSlots) {
      // Still not enough space even after clearing - show capacity modal
      setShowClearWarningModal(false);
      setShowCapacityModal(true);
      return;
    }

    try {
      // Use the new efficient batch clear operation
      const result = await clearBinderCards(
        currentBinder.id,
        `complete_set_replacement_${pendingSet.set.id}`
      );

      console.log(`Successfully cleared ${result.count} cards from binder`);

      // Close modal and add the set immediately
      // No need for delays since clearBinderCards is atomic
      setShowClearWarningModal(false);
      await executeAddSet(pendingSet.set);
      setPendingSet(null);

      toast.success(
        `Replaced ${result.count} cards with ${pendingSet.set.name} collection`
      );
    } catch (error) {
      console.error("Failed to clear binder:", error);
      toast.error("Failed to clear binder for replacement");
    }
  };

  const executeAddSet = async (set) => {
    try {
      setAddingSetId(set.id);

      const cards = await getSetCards(set.id);
      let cardsToAdd = [];
      let reverseHoloCount = 0;

      if (includeReverseHolos) {
        // Interleave regular cards with their reverse holo versions
        cards.forEach((card) => {
          cardsToAdd.push(card); // Add regular card first

          if (canHaveReverseHolo(card.rarity)) {
            const reverseHoloCard = createReverseHoloCard(card);
            cardsToAdd.push(reverseHoloCard); // Add reverse holo right after
            reverseHoloCount++;
          }
        });

        toast.success(
          `Added ${cards.length} regular cards and ${reverseHoloCount} reverse holo cards from ${set.name} to ${currentBinder.metadata.name}`
        );
      } else {
        cardsToAdd = [...cards];
        toast.success(
          `Added ${cards.length} cards from ${set.name} to ${currentBinder.metadata.name}`
        );
      }

      // Cache all cards (including reverse holos) before adding to binder
      addCardsToCache(cardsToAdd);

      // Pass isReplacement=true for complete sets to bypass existing card count in limit check
      await onAddCards(cardsToAdd, true);
    } catch (error) {
      console.error("Failed to add set:", error);
      toast.error(`Failed to add cards from ${set.name}`);
    } finally {
      setAddingSetId(null);
    }
  };

  const handleExpandCapacity = async (option) => {
    try {
      if (option.type === "gridSize") {
        await updateBinderSettings(currentBinder.id, {
          gridSize: option.value,
        });
        toast.success(
          `Changed to ${option.value} grid (${option.additionalSlots} additional slots)`
        );
      } else if (option.type === "addPages") {
        await batchAddPages(currentBinder.id, option.value);
      }

      // Close modal and add the set
      setShowCapacityModal(false);

      // Check if we need to clear first
      const hasExistingCards =
        Object.keys(currentBinder.cards || {}).length > 0;
      if (hasExistingCards && pendingSet) {
        // Show clear warning since we still have existing cards
        setShowClearWarningModal(true);
      } else if (pendingSet) {
        // No existing cards, proceed with adding
        await executeAddSet(pendingSet.set);
        setPendingSet(null);
      }
    } catch (error) {
      console.error("Failed to expand capacity:", error);
      toast.error("Failed to expand capacity");
    }
  };

  const handleCancelCapacity = () => {
    setShowCapacityModal(false);
    setPendingSet(null);
  };

  const handleCancelClearWarning = () => {
    setShowClearWarningModal(false);
    setPendingSet(null);
  };

  const handleAddSet = (set) => {
    checkCapacityAndAdd(set);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="text-red-800 font-medium">Error Loading Sets</div>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const { totalSlots, usedSlots, availableSlots } = calculateBinderCapacity();

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
              placeholder="Search sets by name or series..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Binder Capacity Info */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                <span className="font-medium">Binder Capacity:</span>{" "}
                {usedSlots} / {totalSlots} slots used
              </div>
              <div className="text-xs text-slate-500">
                {availableSlots} available
              </div>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(usedSlots / totalSlots) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Reverse Holo Option - More prominent design */}
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReverseHolos}
                onChange={(e) => setIncludeReverseHolos(e.target.checked)}
                className="w-5 h-5 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-semibold text-purple-800">
                    ✨ Include Reverse Holo Cards
                  </div>
                  {includeReverseHolos && (
                    <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{filteredCount}</span> of{" "}
              <span className="font-medium">{totalSets}</span> sets
            </div>
            {searchQuery && (
              <button
                onClick={() => updateSearchQuery("")}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Sets Grid */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 420px)" }}
        >
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-slate-600 font-medium">
                  Loading sets...
                </div>
                <div className="text-slate-500 text-sm mt-1">
                  This might take a moment
                </div>
              </div>
            ) : sets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">
                  {searchQuery ? "No matching sets found" : "No sets available"}
                </div>
                <div className="text-slate-500 text-sm">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Check your connection and try again"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sets.map((set) => {
                  const totalCards = calculateTotalCards(set);
                  const hasReverseHoloBonus =
                    includeReverseHolos && totalCards > set.cardCount;
                  // For complete sets, check against total capacity (after clearing)
                  const canFit = totalCards <= totalSlots;

                  return (
                    <div
                      key={set.id}
                      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 overflow-hidden group hover:border-blue-300 bg-white hover:shadow-md ${
                        addingSetId === set.id
                          ? "opacity-50 cursor-not-allowed border-blue-500"
                          : canFit
                          ? "border-slate-200"
                          : "border-red-200 bg-red-25"
                      }`}
                      style={{
                        backgroundImage: set.logo ? `url(${set.logo})` : "none",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "top right",
                        backgroundSize: "30%",
                      }}
                    >
                      {/* Subtle background overlay for better text readability */}
                      {set.logo && (
                        <div className="absolute inset-0 bg-white/80 rounded-xl pointer-events-none"></div>
                      )}

                      {/* Capacity Warning */}
                      {!canFit && (
                        <div className="absolute top-3 left-3 z-20">
                          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center space-x-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            <span>Need space</span>
                          </div>
                        </div>
                      )}

                      {/* Reverse Holo Indicator */}
                      {hasReverseHoloBonus && (
                        <div className="absolute top-3 right-3 z-20">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center space-x-1">
                            <span>✨</span>
                            <span>+{totalCards - set.cardCount}</span>
                          </div>
                        </div>
                      )}

                      {/* Loading indicator */}
                      {addingSetId === set.id && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-30">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                            <div className="text-sm font-medium text-slate-700 mb-1">
                              Adding {totalCards} cards...
                            </div>
                            <div className="text-xs text-slate-500">
                              Using optimized batch processing
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-start space-x-4 mb-4">
                          {/* Set Symbol/Logo */}
                          <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
                            {set.symbol ? (
                              <img
                                src={set.symbol}
                                alt={`${set.name} symbol`}
                                className="w-10 h-10 object-contain"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "block";
                                }}
                              />
                            ) : null}
                            <div
                              className="text-slate-500 text-xs text-center leading-tight font-bold"
                              style={{ display: set.symbol ? "none" : "block" }}
                            >
                              {set.name
                                .split(" ")
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 3)}
                            </div>
                          </div>

                          {/* Set Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate text-base leading-tight">
                              {set.name}
                            </h3>
                            <div className="text-sm text-slate-600 mt-1">
                              <div className="truncate font-medium">
                                {set.series}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center space-x-2">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                                    {set.cardCount} cards
                                  </span>
                                  {hasReverseHoloBonus && (
                                    <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-2 py-1 rounded-md text-xs font-medium border border-purple-200">
                                      {totalCards} total
                                    </span>
                                  )}
                                </div>
                                {set.releaseDate && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    {new Date(set.releaseDate).getFullYear()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Add button */}
                        <button
                          onClick={() => handleAddSet(set)}
                          disabled={addingSetId !== null}
                          className={`relative z-10 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                            addingSetId === set.id
                              ? "bg-blue-500 text-white cursor-not-allowed"
                              : canFit
                              ? "bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-700 group-hover:bg-blue-50"
                              : "bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300"
                          }`}
                        >
                          <PlusIcon className="w-4 h-4" />
                          <span>
                            {addingSetId === set.id
                              ? "Adding..."
                              : canFit
                              ? `Add ${totalCards} Card${
                                  totalCards !== 1 ? "s" : ""
                                }`
                              : "Expand Capacity"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Modal */}
      <Transition appear show={showCapacityModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={handleCancelCapacity}
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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Not Enough Space
                      </Dialog.Title>
                    </div>
                  </div>

                  {pendingSet &&
                    (() => {
                      // Calculate capacity as if binder will be cleared for sets
                      const clearedCapacity = calculateBinderCapacity(true);
                      return (
                        <div className="mb-6">
                          <p className="text-sm text-gray-500 mb-4">
                            "{pendingSet.set.name}" requires{" "}
                            <strong>{pendingSet.cardsToAdd} slots</strong>, but
                            your binder only has{" "}
                            <strong>
                              {clearedCapacity.totalSlots} total slots
                            </strong>
                            .
                          </p>

                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                              <div className="text-xs font-medium text-amber-800">
                                Complete Set Addition
                              </div>
                            </div>
                            <div className="text-xs text-amber-700">
                              Adding a complete set will clear all existing
                              cards first and use your total binder capacity of{" "}
                              <strong>
                                {clearedCapacity.totalSlots} slots
                              </strong>
                              .
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="text-sm font-medium text-gray-700">
                              Choose an option to expand capacity:
                            </div>
                            {calculateExpansionOptions(
                              pendingSet.cardsToAdd,
                              true // Pass willClear=true for sets
                            ).map((option, index) => (
                              <button
                                key={index}
                                onClick={() => handleExpandCapacity(option)}
                                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                              >
                                <div className="font-medium text-sm text-gray-900">
                                  {option.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  New capacity: {option.newCapacity} slots (+
                                  {option.additionalSlots})
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={handleCancelCapacity}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Clear Binder Warning Modal */}
      <Dialog
        open={showClearWarningModal}
        as="div"
        className="relative z-50"
        onClose={handleCancelClearWarning}
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-gray-900"
                    >
                      Clear Binder Warning
                    </Dialog.Title>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          All cards will be removed
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            Adding a complete set will{" "}
                            <strong>
                              permanently remove all{" "}
                              {Object.keys(currentBinder.cards || {}).length}{" "}
                              cards
                            </strong>{" "}
                            currently in your binder.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        Current cards:
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        {Object.keys(currentBinder.cards || {}).length} cards
                        (will be removed)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        New cards to add:
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {pendingSet?.cardsToAdd || 0} cards from{" "}
                        {pendingSet?.set?.name}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> This feature is perfect for
                      dedicating a binder to a specific set. Consider creating a
                      new binder if you want to keep your current cards.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={handleCancelClearWarning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={handleClearAndAdd}
                  >
                    Clear & Add Set
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default SetTab;
