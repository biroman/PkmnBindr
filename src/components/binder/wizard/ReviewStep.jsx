import { useState, useEffect, useMemo } from "react";
import { useBinderContext } from "../../../contexts/BinderContext";
import useSetSearch from "../../../hooks/useSetSearch";
import { getGridConfig } from "../../../hooks/useBinderDimensions";
import { toast } from "react-hot-toast";
import { RadioGroup } from "@headlessui/react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxXMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// --- Helper Functions ---
const canHaveReverseHolo = (rarity) => {
  const reverseHoloRarities = ["Common", "Uncommon", "Rare", "Rare Holo"];
  return reverseHoloRarities.includes(rarity);
};

const createReverseHoloCard = (card) => ({
  ...card,
  id: `${card.id}-rh`,
  originalId: card.id,
  reverseHolo: true,
  addedAt: new Date().toISOString(),
});

const calculateBinderCapacity = (binder, getPageCount) => {
  if (!binder) return { totalSlots: 0, usedSlots: 0, availableSlots: 0 };
  const gridConfig = getGridConfig(binder.settings.gridSize);
  const currentPages = getPageCount(binder.id);
  const cardPages = currentPages === 1 ? 1 : 1 + (currentPages - 1) * 2;
  const totalSlots = cardPages * gridConfig.total;
  const usedSlots = Object.keys(binder.cards || {}).length;
  return {
    totalSlots,
    usedSlots,
    availableSlots: totalSlots - usedSlots,
    gridConfig,
    currentPages,
  };
};

const calculateExpansionOptions = (binder, neededSlots, getPageCount) => {
  const { gridConfig, currentPages, totalSlots } = calculateBinderCapacity(
    binder,
    getPageCount
  );
  const options = [];

  const slotsShortfall = neededSlots - totalSlots;
  if (slotsShortfall <= 0) return options;

  // Option 1: Increase grid size
  const gridSizes = [
    { name: "3x3", config: getGridConfig("3x3") },
    { name: "4x4", config: getGridConfig("4x4") },
  ];

  gridSizes.forEach(({ name, config }) => {
    if (config.total > gridConfig.total) {
      const cardPages = currentPages === 1 ? 1 : 1 + (currentPages - 1) * 2;
      const newTotalSlots = cardPages * config.total;
      if (newTotalSlots >= neededSlots) {
        options.push({
          type: "gridSize",
          value: name,
          label: `Change to ${name} grid`,
          description: `New capacity: ${newTotalSlots} slots`,
        });
      }
    }
  });

  // Option 2: Add pages
  const slotsPerNewPage = gridConfig.total * 2;
  const pagesNeeded = Math.ceil(slotsShortfall / slotsPerNewPage);
  const maxPages = binder.settings?.maxPages || 100;

  if (currentPages + pagesNeeded <= maxPages) {
    options.push({
      type: "addPages",
      value: pagesNeeded,
      label: `Add ${pagesNeeded} page${pagesNeeded > 1 ? "s" : ""}`,
      description: `New capacity: ${
        totalSlots + pagesNeeded * slotsPerNewPage
      } slots`,
    });
  }

  return options;
};

const CapacityBar = ({ currentSlots, totalSlots, newSlots }) => {
  const currentPercent = totalSlots > 0 ? (currentSlots / totalSlots) * 100 : 0;
  const newPercent = totalSlots > 0 ? (newSlots / totalSlots) * 100 : 0;

  const isOverflow = currentSlots + newSlots > totalSlots;

  return (
    <div className="space-y-2">
      <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-400 dark:bg-blue-500"
          style={{ width: `${currentPercent}%` }}
        />
        <div
          className={`absolute top-0 h-full ${
            isOverflow ? "bg-red-500" : "bg-green-500"
          } transition-all`}
          style={{ left: `${currentPercent}%`, width: `${newPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Current: {currentSlots} / {totalSlots}
        </span>
        <span
          className={`${
            isOverflow
              ? "text-red-500 dark:text-red-400 font-bold"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          Adding: {newSlots}
        </span>
      </div>
    </div>
  );
};

const ReviewStep = ({
  selectedSet,
  configuration,
  currentBinder,
  onBack,
  onConfirm,
  onAddCards,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedCards, setFetchedCards] = useState([]);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [progress, setProgress] = useState({ message: "", percentage: 0 });

  const [addMode, setAddMode] = useState("replace");
  const [selectedExpansion, setSelectedExpansion] = useState(null);

  const { getSetCards } = useSetSearch();
  const {
    clearBinderCards,
    updateBinderSettings,
    batchAddPages,
    getPageCount,
    batchMoveCards,
  } = useBinderContext();

  const fetchSetCardStats = async (setId, lang = "en") => {
    try {
      const url = `${
        import.meta.env.BASE_URL || "/"
      }cards/${lang}/${setId}.json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("not found");
      const cards = await resp.json();
      const reverseEligible = cards.filter((c) =>
        canHaveReverseHolo(c.rarity)
      ).length;
      return { total: cards.length, reversible: reverseEligible };
    } catch {
      return null;
    }
  };

  // --- Memoized Calculations ---
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchSetCardStats(selectedSet.id).then((s) => mounted && setStats(s));
    return () => {
      mounted = false;
    };
  }, [selectedSet]);

  const accurateReverseCount = stats
    ? stats.reversible *
      (configuration.includeReverseHolos
        ? configuration.reverseHoloCopies || 1
        : 0)
    : 0;

  const numCardsToAdd = stats
    ? stats.total + accurateReverseCount
    : selectedSet.printedTotal + accurateReverseCount;
  const hasExistingCards = Object.keys(currentBinder?.cards || {}).length > 0;
  const { binderPlacement, bufferPages = 0 } = configuration;

  const capacityInfo = useMemo(
    () => calculateBinderCapacity(currentBinder, getPageCount),
    [currentBinder, getPageCount]
  );
  const gridConfigCurrent = useMemo(
    () => getGridConfig(currentBinder.settings.gridSize),
    [currentBinder.settings.gridSize]
  );
  const cardsPerPage = gridConfigCurrent.total;

  // compute gap slots from partial last page when adding at end
  const existingPositionsArr = Object.keys(currentBinder?.cards || {}).map(
    (p) => parseInt(p, 10)
  );
  const highestOccupied =
    existingPositionsArr.length > 0 ? Math.max(...existingPositionsArr) : -1;
  // next free slot
  const firstFreeSlot = highestOccupied + 1;
  const offsetToNextPage =
    (cardsPerPage - (firstFreeSlot % cardsPerPage)) % cardsPerPage; // 0 if already at start of page
  const bufferSlots = bufferPages * cardsPerPage;
  const gapSlots =
    binderPlacement === "end" ? offsetToNextPage + bufferSlots : bufferSlots; // for replace/start ignore offset

  const totalCardsAfterAdd =
    binderPlacement === "replace"
      ? numCardsToAdd
      : capacityInfo.usedSlots + numCardsToAdd + gapSlots;

  const expansionOptions = useMemo(
    () =>
      calculateExpansionOptions(
        currentBinder,
        totalCardsAfterAdd,
        getPageCount
      ),
    [currentBinder, totalCardsAfterAdd, getPageCount]
  );

  // For non-replacement modes, we need to account for existing cards
  const doesItFit = totalCardsAfterAdd <= capacityInfo.totalSlots;
  const canExpand = expansionOptions.length > 0;

  // Decide the initial mode
  useEffect(() => {
    if (!doesItFit && canExpand) {
      setAddMode("expand");
      setSelectedExpansion(expansionOptions[0]);
    } else {
      setAddMode("replace");
    }
  }, [doesItFit, canExpand, expansionOptions]);

  // No initial heavy fetch – we'll fetch during confirmation only

  const handleFinalConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      setProgress({ message: "Preparing binder...", percentage: 10 });

      // Step 1: Expand capacity if needed and chosen
      if (addMode === "expand" && selectedExpansion) {
        setProgress({ message: "Expanding capacity...", percentage: 25 });
        if (selectedExpansion.type === "gridSize") {
          await updateBinderSettings(currentBinder.id, {
            gridSize: selectedExpansion.value,
          });
          toast.success(`Binder grid updated to ${selectedExpansion.value}.`);
        } else if (selectedExpansion.type === "addPages") {
          await batchAddPages(currentBinder.id, selectedExpansion.value);
          toast.success(`${selectedExpansion.value} page(s) added.`);
        }
      }

      // Step 2: Handle different placement modes
      if (binderPlacement === "replace" && hasExistingCards) {
        setProgress({ message: "Clearing existing cards...", percentage: 50 });
        await clearBinderCards(
          currentBinder.id,
          `complete_set_replacement_${selectedSet.id}`
        );
        toast.success("Binder cleared for new set.");
      }

      // Step 3: Fetch actual cards now
      setProgress({ message: "Fetching card data...", percentage: 60 });
      const apiCards = await getSetCards(selectedSet.id);

      const createReverseHoloCard = (card, copyIndex = 0) => ({
        ...card,
        id:
          copyIndex === 0 ? `${card.id}-rh` : `${card.id}-rh-${copyIndex + 1}`,
        originalId: card.id,
        reverseHolo: true,
        addedAt: new Date().toISOString(),
      });

      let cardsToAdd = [];
      if (configuration.includeReverseHolos) {
        const regular = [...apiCards];
        const reverseHoloCopies = configuration.reverseHoloCopies || 1;

        // Create all reverse holo copies
        const reverses = [];
        regular
          .filter((c) => canHaveReverseHolo(c.rarity))
          .forEach((card) => {
            for (let i = 0; i < reverseHoloCopies; i++) {
              reverses.push(createReverseHoloCard(card, i));
            }
          });

        if (configuration.placement === "first")
          cardsToAdd = [...reverses, ...regular];
        else if (configuration.placement === "last")
          cardsToAdd = [...regular, ...reverses];
        else {
          // Interleaved: regular card followed by all its reverse holo copies
          regular.forEach((card) => {
            cardsToAdd.push(card);
            if (canHaveReverseHolo(card.rarity)) {
              for (let i = 0; i < reverseHoloCopies; i++) {
                cardsToAdd.push(createReverseHoloCard(card, i));
              }
            }
          });
        }
      } else {
        cardsToAdd = apiCards;
      }

      // Step 4: Add cards based on placement mode
      setProgress({
        message: `Adding ${cardsToAdd.length} cards...`,
        percentage: 80,
      });

      if (binderPlacement === "replace") {
        // Replace mode: add from position 0 (binder was already cleared)
        await onAddCards(cardsToAdd, true);
      } else if (binderPlacement === "start") {
        // Insert at start with optional buffer pages after the set
        const shiftBy = cardsToAdd.length + bufferSlots;

        if (shiftBy > 0) {
          const occupiedPositions = Object.keys(currentBinder.cards || {})
            .map((p) => parseInt(p, 10))
            .sort((a, b) => b - a); // Descending

          const moveOperations = occupiedPositions.map((pos) => ({
            fromPosition: pos,
            toPosition: pos + shiftBy,
          }));

          if (moveOperations.length > 0) {
            await batchMoveCards(currentBinder.id, moveOperations);
          }
        }

        // Add the new set cards starting from position 0
        await onAddCards(cardsToAdd, false, 0);
      } else if (binderPlacement === "end") {
        const positionsEnd = Object.keys(currentBinder.cards || {}).map((p) =>
          parseInt(p, 10)
        );
        const highestOccupiedPos =
          positionsEnd.length > 0 ? Math.max(...positionsEnd) : -1;
        const nextFree = highestOccupiedPos + 1;
        const pageStart =
          nextFree % cardsPerPage === 0
            ? nextFree
            : (Math.floor(nextFree / cardsPerPage) + 1) * cardsPerPage;
        const addPosition = pageStart + bufferSlots; // bufferSlots already cardsPerPage * bufferPages
        await onAddCards(cardsToAdd, false, addPosition);
      }

      setProgress({ message: "Finalizing...", percentage: 100 });

      const placementText =
        binderPlacement === "start"
          ? " at the beginning"
          : binderPlacement === "end"
          ? " at the end"
          : "";

      toast.success(
        `Added ${cardsToAdd.length} cards from ${selectedSet.name}${placementText}!`,
        {
          duration: 4000,
        }
      );
      onConfirm();
    } catch (err) {
      console.error("Failed to execute add set operation:", err);
      setError("A critical error occurred. Please try again.");
      toast.error("Failed to add the set.");
    } finally {
      // No need to set isProcessing to false if we are calling onConfirm() which unmounts the component
    }
  };

  const MAX_BINDER_CARDS = 1000;

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-24 h-24 mb-6 flex items-center justify-center">
          <img
            src={selectedSet.symbol}
            alt={`${selectedSet.name} symbol`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-6"></div>
        <h3 className="text-xl font-bold text-primary mb-2">
          Adding {selectedSet.name}
        </h3>
        <p className="text-secondary mb-4">{progress.message}</p>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // removed loading state since no initial fetch

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  const { totalSlots, usedSlots } = capacityInfo;
  const willItFitAfterReplace = totalCardsAfterAdd <= totalSlots;
  const exceedsHardLimit = totalCardsAfterAdd > MAX_BINDER_CARDS;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-blue-600 hover:underline mb-4 dark:text-blue-400"
          >
            &larr; Back to Configuration
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-primary dark:text-slate-100">
            Step 3: Review & Add
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 items-start">
          {/* --- Left Column: Summary Information --- */}
          <div className="space-y-6 mb-6 lg:mb-0">
            {/* Summary & Capacity */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80 p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary dark:text-slate-200">
                  Cards to Add
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {numCardsToAdd}
                </span>
              </div>
              {binderPlacement !== "replace" && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary dark:text-slate-200">
                    Total After Adding
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totalCardsAfterAdd}
                  </span>
                </div>
              )}
              {binderPlacement === "end" && bufferPages > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary dark:text-slate-200">
                    Empty Pages Before Set
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {bufferPages}
                  </span>
                </div>
              )}
              {binderPlacement === "start" && bufferPages > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary dark:text-slate-200">
                    Empty Pages After Set
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {bufferPages}
                  </span>
                </div>
              )}
              <CapacityBar
                currentSlots={binderPlacement === "replace" ? 0 : usedSlots}
                totalSlots={totalSlots}
                newSlots={numCardsToAdd}
              />
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary dark:text-slate-200">
                  Buffer Pages
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {bufferPages}
                </span>
              </div>
            </div>

            {/* Placement Mode Information */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                📍 Placement:{" "}
                {binderPlacement === "replace"
                  ? "Replace Whole Binder"
                  : binderPlacement === "start"
                  ? "Insert at Beginning"
                  : "Add to End"}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {binderPlacement === "replace" &&
                  "All existing cards will be removed and the complete set will be added from the beginning."}
                {binderPlacement === "start" &&
                  `The set will be inserted at the beginning of the binder, pushing ${usedSlots} existing cards forward.`}
                {binderPlacement === "end" &&
                  `The set will be added after all existing cards in the binder.`}
              </p>
            </div>
          </div>

          {/* --- Right Column: Decision --- */}
          <div>
            {/* Decision */}
            <RadioGroup
              value={addMode}
              onChange={setAddMode}
              className="space-y-3"
            >
              <RadioGroup.Label className="font-medium text-primary dark:text-slate-200">
                Choose how to add this set:
              </RadioGroup.Label>

              {/* Standard Mode Option */}
              <RadioGroup.Option
                value="replace"
                disabled={!willItFitAfterReplace}
                className={({ active, checked }) =>
                  `${
                    checked
                      ? "border-blue-500 ring-2 ring-blue-500"
                      : "border-border dark:border-slate-600"
                  } ${
                    !willItFitAfterReplace
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  } relative flex rounded-lg border bg-card-background dark:bg-slate-800 p-4 shadow-sm focus:outline-none transition-all hover:border-blue-400`
                }
              >
                {({ checked }) => (
                  <>
                    <ArchiveBoxXMarkIcon className="h-8 w-8 text-blue-500 dark:text-blue-400/80 mr-4 flex-shrink-0" />
                    <div className="flex flex-1 flex-col">
                      <RadioGroup.Label
                        as="span"
                        className="block text-base font-semibold text-primary dark:text-slate-100"
                      >
                        {binderPlacement === "replace"
                          ? "Replace & Add"
                          : binderPlacement === "start"
                          ? "Insert at Start"
                          : "Add to End"}
                      </RadioGroup.Label>
                      <RadioGroup.Description
                        as="span"
                        className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                      >
                        {binderPlacement === "replace"
                          ? "Clear existing cards and add the complete set."
                          : `Add the set using current binder capacity.`}
                        {!willItFitAfterReplace && (
                          <span className="block text-red-500 dark:text-red-400 font-medium mt-1">
                            ⚠️ Not enough space (
                            {totalCardsAfterAdd - totalSlots} cards over limit)
                          </span>
                        )}
                      </RadioGroup.Description>
                    </div>
                    {checked && (
                      <CheckCircleIcon
                        className="h-6 w-6 text-blue-600 absolute top-3 right-3"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </RadioGroup.Option>

              {/* Expansion Option */}
              {canExpand && (
                <RadioGroup.Option
                  value="expand"
                  className={({ active, checked }) =>
                    `${
                      checked
                        ? "border-green-500 ring-2 ring-green-500"
                        : "border-border dark:border-slate-600"
                    } relative flex cursor-pointer rounded-lg border bg-card-background dark:bg-slate-800 p-4 shadow-sm focus:outline-none transition-all hover:border-green-400`
                  }
                >
                  {({ checked }) => (
                    <>
                      <SparklesIcon className="h-8 w-8 text-green-500 dark:text-green-400/80 mr-4 flex-shrink-0" />
                      <div className="flex flex-1 flex-col">
                        <RadioGroup.Label
                          as="span"
                          className="block text-base font-semibold text-primary dark:text-slate-100"
                        >
                          Expand & Add
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                        >
                          Increases binder capacity to fit the new set.
                        </RadioGroup.Description>
                        <div className="mt-4 space-y-2">
                          {/* Expansion options will be styled here */}
                        </div>
                      </div>
                      {checked && (
                        <CheckCircleIcon
                          className="h-6 w-6 text-green-600 absolute top-3 right-3"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </RadioGroup.Option>
              )}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-6 mt-6 border-t border-border dark:border-slate-700">
        <button
          onClick={handleFinalConfirm}
          disabled={
            isProcessing ||
            exceedsHardLimit ||
            (addMode === "replace" && !willItFitAfterReplace) ||
            (addMode === "expand" && !selectedExpansion)
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-150 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold shadow-lg"
        >
          {isProcessing ? "Applying..." : `Confirm & Add to Binder`}
        </button>
        {exceedsHardLimit && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2 text-center">
            Cannot add: Binder limit of {MAX_BINDER_CARDS} cards would be
            exceeded.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewStep;
