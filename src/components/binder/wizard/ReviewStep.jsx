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
      <div className="flex justify-between text-xs text-secondary dark:text-slate-400">
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
  } = useBinderContext();

  // --- Memoized Calculations ---
  const estimatedReverseCount = useMemo(() => {
    if (!configuration.includeReverseHolos) return 0;
    // Rough 60% estimate as before
    return Math.floor(selectedSet.printedTotal * 0.6);
  }, [configuration.includeReverseHolos, selectedSet.printedTotal]);

  const numCardsToAdd = selectedSet.printedTotal + estimatedReverseCount;
  const hasExistingCards = Object.keys(currentBinder?.cards || {}).length > 0;

  const capacityInfo = useMemo(
    () => calculateBinderCapacity(currentBinder, getPageCount),
    [currentBinder, getPageCount]
  );
  const expansionOptions = useMemo(
    () => calculateExpansionOptions(currentBinder, numCardsToAdd, getPageCount),
    [currentBinder, numCardsToAdd, getPageCount]
  );

  const doesItFit = numCardsToAdd <= capacityInfo.totalSlots;
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

      // Step 2: Clear the binder if it has cards
      if (hasExistingCards) {
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

      const createReverseHoloCard = (card) => ({
        ...card,
        id: `${card.id}-rh`,
        originalId: card.id,
        reverseHolo: true,
        addedAt: new Date().toISOString(),
      });

      let cardsToAdd = [];
      if (configuration.includeReverseHolos) {
        const regular = [...apiCards];
        const reverses = regular
          .filter((c) => canHaveReverseHolo(c.rarity))
          .map(createReverseHoloCard);

        if (configuration.placement === "first")
          cardsToAdd = [...reverses, ...regular];
        else if (configuration.placement === "last")
          cardsToAdd = [...regular, ...reverses];
        else {
          regular.forEach((card) => {
            cardsToAdd.push(card);
            if (canHaveReverseHolo(card.rarity))
              cardsToAdd.push(createReverseHoloCard(card));
          });
        }
      } else {
        cardsToAdd = apiCards;
      }

      setProgress({
        message: `Adding ${cardsToAdd.length} cards...`,
        percentage: 80,
      });
      await onAddCards(cardsToAdd, true);

      setProgress({ message: "Finalizing...", percentage: 100 });
      toast.success(
        `Added ${cardsToAdd.length} cards from ${selectedSet.name}!`,
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
  const willItFitAfterReplace = numCardsToAdd <= totalSlots;

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

        {/* Summary & Capacity */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-primary dark:text-slate-200">
              Total Cards to Add
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {numCardsToAdd}
            </span>
          </div>
          <CapacityBar
            currentSlots={usedSlots}
            totalSlots={totalSlots}
            newSlots={numCardsToAdd}
          />
        </div>

        {/* Decision */}
        <RadioGroup value={addMode} onChange={setAddMode} className="space-y-3">
          <RadioGroup.Label className="font-medium text-primary dark:text-slate-200">
            Choose how to add this set:
          </RadioGroup.Label>

          <RadioGroup.Option
            value="replace"
            disabled={!willItFitAfterReplace}
            className={({ checked, disabled }) =>
              `relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-colors ${
                checked
                  ? "border-blue-500 bg-blue-50 dark:bg-slate-800 ring-2 ring-blue-500"
                  : "border-border dark:border-slate-700"
              } ${
                disabled
                  ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                  : "bg-card-background dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`
            }
          >
            {({ checked }) => (
              <>
                <ArchiveBoxXMarkIcon className="h-8 w-8 text-red-500 dark:text-red-400/80 mr-4 flex-shrink-0" />
                <div className="flex flex-1 flex-col">
                  <RadioGroup.Label
                    as="span"
                    className="block text-base font-semibold text-primary dark:text-slate-100"
                  >
                    Replace Existing Binder
                  </RadioGroup.Label>
                  <RadioGroup.Description
                    as="span"
                    className="mt-1 text-sm text-secondary dark:text-slate-400"
                  >
                    Clears all {usedSlots} cards and adds the new set.
                  </RadioGroup.Description>
                  {!willItFitAfterReplace && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      Not enough total space in binder.
                    </p>
                  )}
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

          {canExpand && (
            <RadioGroup.Option
              value="expand"
              className={({ checked }) =>
                `relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-colors ${
                  checked
                    ? "border-green-500 bg-green-50 dark:bg-slate-800 ring-2 ring-green-500"
                    : "border-border dark:border-slate-700"
                } bg-card-background dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800`
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
                      className="mt-1 text-sm text-secondary dark:text-slate-400"
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

      {/* Footer Actions */}
      <div className="pt-6 mt-6 border-t border-border dark:border-slate-700">
        <button
          onClick={handleFinalConfirm}
          disabled={
            isProcessing ||
            (addMode === "replace" && !willItFitAfterReplace) ||
            (addMode === "expand" && !selectedExpansion)
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-150 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold shadow-lg"
        >
          {isProcessing ? "Applying..." : `Confirm & Add to Binder`}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
