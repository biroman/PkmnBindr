import { Switch, RadioGroup } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

const fetchSetCardStats = async (setId, lang = "en") => {
  try {
    const url = `${import.meta.env.BASE_URL || "/"}cards/${lang}/${setId}.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("not found");
    const cards = await resp.json();
    const reverseEligibleRarities = ["Common", "Uncommon", "Rare", "Rare Holo"];
    const reversibleCount = cards.filter((c) =>
      reverseEligibleRarities.includes(c.rarity)
    ).length;
    return { total: cards.length, reversible: reversibleCount };
  } catch {
    return null;
  }
};

// A rough estimation until we fetch the full card list with rarities.
const estimateReverseHoloCount = (set, copies = 1) => {
  if (!set) return 0;
  // Estimate that ~60% of non-secret rare cards can have a reverse holo.
  const baseReverseHolos = Math.floor(set.printedTotal * 0.6);
  return baseReverseHolos * copies;
};

const ConfigureStep = ({
  selectedSet,
  configuration,
  onConfigChange,
  onProceed,
  onBack,
}) => {
  const {
    includeReverseHolos,
    placement,
    binderPlacement,
    bufferPages = 0,
    reverseHoloCopies = 1,
  } = configuration;

  const [stats, setStats] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (selectedSet) {
      fetchSetCardStats(selectedSet.id).then((res) => {
        if (isMounted) setStats(res);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedSet]);

  const accurateRhCount = stats
    ? stats.reversible * (includeReverseHolos ? reverseHoloCopies : 0)
    : estimateReverseHoloCount(selectedSet, reverseHoloCopies);

  const totalCards = stats
    ? stats.total + (includeReverseHolos ? accurateRhCount : 0)
    : (selectedSet?.printedTotal || 0) +
      (includeReverseHolos ? accurateRhCount : 0);

  const placementOptions = [
    {
      name: "Interleaved",
      value: "interleaved",
      description: "Reverse holo after its regular version.",
    },
    {
      name: "All First",
      value: "first",
      description: "All reverse holos at the start of the set.",
    },
    {
      name: "All Last",
      value: "last",
      description: "All reverse holos at the end of the set.",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-blue-600 hover:underline mb-4 dark:text-blue-400"
          >
            &larr; Back to Set Selection
          </button>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden p-1">
              <img
                src={selectedSet.logo}
                alt={selectedSet.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary dark:text-slate-100">
                Step 2: Configure {selectedSet?.name}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {selectedSet?.series} &bull; Released {selectedSet?.releaseDate}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 items-start">
          {/* --- Left Column: Holo Configuration --- */}
          <div className="space-y-6 mb-6 lg:mb-0">
            {/* Reverse Holo Option */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80">
              <div className="p-4 flex items-center justify-between">
                <label
                  htmlFor="include-reverse-holos"
                  className="flex flex-col cursor-pointer flex-1 pr-4"
                >
                  <span className="text-base font-medium text-purple-800 dark:text-purple-300">
                    Include Reverse Holo Cards
                  </span>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    Adds {stats ? accurateRhCount : `~${accurateRhCount}`}{" "}
                    reverse holos ({reverseHoloCopies} cop
                    {reverseHoloCopies === 1 ? "y" : "ies"} each).
                  </span>
                </label>
                <Switch
                  id="include-reverse-holos"
                  checked={includeReverseHolos}
                  onChange={(checked) =>
                    onConfigChange({ includeReverseHolos: checked })
                  }
                  className={`${
                    includeReverseHolos
                      ? "bg-purple-600"
                      : "bg-gray-200 dark:bg-slate-700"
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
                >
                  <span
                    className={`${
                      includeReverseHolos ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              </div>

              {includeReverseHolos && (
                <div className="p-4 border-t border-border dark:border-slate-700/80 space-y-4">
                  {/* Number of Copies Selection */}
                  <RadioGroup
                    value={reverseHoloCopies}
                    onChange={(value) =>
                      onConfigChange({ reverseHoloCopies: value })
                    }
                  >
                    <RadioGroup.Label className="text-sm font-medium text-primary dark:text-slate-300">
                      Copies per Reverse Holo (Pokeball or Master Ball etc.)
                    </RadioGroup.Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((copies) => (
                        <RadioGroup.Option
                          key={copies}
                          value={copies}
                          className={({ active, checked }) =>
                            `${
                              checked
                                ? "border-purple-500 ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                : "border-border dark:border-slate-600 bg-card-background dark:bg-slate-800"
                            } relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all hover:border-purple-400`
                          }
                        >
                          {({ checked }) => (
                            <>
                              <div className="flex flex-1 flex-col text-center">
                                <RadioGroup.Label
                                  as="span"
                                  className={`block text-lg font-bold ${
                                    checked
                                      ? "text-purple-900 dark:text-purple-200"
                                      : "text-primary dark:text-slate-200"
                                  }`}
                                >
                                  {copies}
                                </RadioGroup.Label>
                                <RadioGroup.Description
                                  as="span"
                                  className={`mt-1 text-xs ${
                                    checked
                                      ? "text-purple-700 dark:text-purple-400"
                                      : "text-slate-500 dark:text-slate-400"
                                  }`}
                                >
                                  extra cop{copies === 1 ? "y" : "ies"}
                                </RadioGroup.Description>
                              </div>
                              {checked && (
                                <CheckCircleIcon
                                  className="h-4 w-4 text-purple-600 absolute top-1 right-1"
                                  aria-hidden="true"
                                />
                              )}
                            </>
                          )}
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>

                  {/* Placement Selection */}
                  <RadioGroup
                    value={placement}
                    onChange={(value) => onConfigChange({ placement: value })}
                  >
                    <RadioGroup.Label className="text-sm font-medium text-primary dark:text-slate-300">
                      Reverse Holo Placement
                    </RadioGroup.Label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {placementOptions.map((option) => (
                        <RadioGroup.Option
                          key={option.name}
                          value={option.value}
                          className={({ active, checked }) =>
                            `${
                              checked
                                ? "border-purple-500 ring-2 ring-purple-500"
                                : "border-border dark:border-slate-600"
                            } relative flex cursor-pointer rounded-lg border bg-card-background dark:bg-slate-800 p-3 shadow-sm focus:outline-none transition-all hover:border-purple-400`
                          }
                        >
                          {({ checked }) => (
                            <>
                              <div className="flex flex-1 flex-col">
                                <RadioGroup.Label
                                  as="span"
                                  className={`block text-sm font-medium ${
                                    checked
                                      ? "text-purple-900 dark:text-purple-200"
                                      : "text-primary dark:text-slate-200"
                                  }`}
                                >
                                  {option.name}
                                </RadioGroup.Label>
                                <RadioGroup.Description
                                  as="span"
                                  className={`mt-1 flex items-center text-xs ${
                                    checked
                                      ? "text-purple-700 dark:text-purple-400"
                                      : "text-slate-500 dark:text-slate-400"
                                  }`}
                                >
                                  {option.description}
                                </RadioGroup.Description>
                              </div>
                              {checked && (
                                <CheckCircleIcon
                                  className="h-5 w-5 text-purple-600"
                                  aria-hidden="true"
                                />
                              )}
                            </>
                          )}
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </div>

          {/* --- Right Column: Placement and Summary --- */}
          <div className="space-y-6">
            {/* Binder Placement Option */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80">
              <div className="p-4">
                <h3 className="text-base font-medium text-blue-800 dark:text-blue-300 mb-3">
                  Binder Placement
                </h3>
                <RadioGroup
                  value={binderPlacement}
                  onChange={(value) =>
                    onConfigChange({ binderPlacement: value })
                  }
                  className="space-y-3"
                >
                  <RadioGroup.Option
                    value="replace"
                    className={({ checked }) =>
                      `${
                        checked
                          ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border dark:border-slate-600 bg-card-background dark:bg-slate-800"
                      } relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all hover:border-blue-400`
                    }
                  >
                    {({ checked }) => (
                      <>
                        <div className="flex flex-1 flex-col">
                          <RadioGroup.Label
                            as="span"
                            className={`block text-sm font-medium ${
                              checked
                                ? "text-blue-900 dark:text-blue-200"
                                : "text-primary dark:text-slate-200"
                            }`}
                          >
                            Replace Whole Binder
                          </RadioGroup.Label>
                          <RadioGroup.Description
                            as="span"
                            className={`mt-1 text-xs ${
                              checked
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            Clear all existing cards and add the complete set.
                          </RadioGroup.Description>
                        </div>
                        {checked && (
                          <CheckCircleIcon
                            className="h-5 w-5 text-blue-600"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </RadioGroup.Option>

                  <RadioGroup.Option
                    value="start"
                    className={({ checked }) =>
                      `${
                        checked
                          ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border dark:border-slate-600 bg-card-background dark:bg-slate-800"
                      } relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all hover:border-blue-400`
                    }
                  >
                    {({ checked }) => (
                      <>
                        <div className="flex flex-1 flex-col">
                          <RadioGroup.Label
                            as="span"
                            className={`block text-sm font-medium ${
                              checked
                                ? "text-blue-900 dark:text-blue-200"
                                : "text-primary dark:text-slate-200"
                            }`}
                          >
                            Insert at Beginning
                          </RadioGroup.Label>
                          <RadioGroup.Description
                            as="span"
                            className={`mt-1 text-xs ${
                              checked
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            Add set to the start, pushing existing cards
                            forward.
                          </RadioGroup.Description>
                        </div>
                        {checked && (
                          <CheckCircleIcon
                            className="h-5 w-5 text-blue-600"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </RadioGroup.Option>

                  <RadioGroup.Option
                    value="end"
                    className={({ checked }) =>
                      `${
                        checked
                          ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border dark:border-slate-600 bg-card-background dark:bg-slate-800"
                      } relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all hover:border-blue-400`
                    }
                  >
                    {({ checked }) => (
                      <>
                        <div className="flex flex-1 flex-col">
                          <RadioGroup.Label
                            as="span"
                            className={`block text-sm font-medium ${
                              checked
                                ? "text-blue-900 dark:text-blue-200"
                                : "text-primary dark:text-slate-200"
                            }`}
                          >
                            Add to End
                          </RadioGroup.Label>
                          <RadioGroup.Description
                            as="span"
                            className={`mt-1 text-xs ${
                              checked
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            Add set after all existing cards in the binder.
                          </RadioGroup.Description>
                        </div>
                        {checked && (
                          <CheckCircleIcon
                            className="h-5 w-5 text-blue-600"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </RadioGroup.Option>
                </RadioGroup>
              </div>
            </div>

            {/* Buffer Pages (for start or end placement) */}
            {binderPlacement !== "replace" && (
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80">
                <div className="p-4 flex items-center justify-between gap-4">
                  <label
                    className="flex flex-col flex-1 pr-4"
                    htmlFor="buffer-pages-input"
                  >
                    <span className="text-base font-medium text-green-800 dark:text-green-300">
                      Buffer Pages
                    </span>
                    <span className="text-sm text-green-700 dark:text-green-400">
                      {binderPlacement === "end"
                        ? "Leave empty page(s) before this set."
                        : "Leave empty page(s) after this set."}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="buffer-pages-input"
                      type="number"
                      min={0}
                      max={10}
                      value={bufferPages}
                      onChange={(e) =>
                        onConfigChange({
                          bufferPages: Math.max(
                            0,
                            parseInt(e.target.value || "0", 10)
                          ),
                        })
                      }
                      className="w-20 text-center border border-border rounded-lg py-1.5 px-2 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-sm text-primary dark:text-slate-200">
                      pages
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border border-border dark:border-slate-700/80 flex items-center justify-between">
              <span className="text-base font-medium text-primary dark:text-slate-200">
                Total Cards to Add
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalCards}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-6 mt-6 border-t border-border dark:border-slate-700">
        <button
          onClick={onProceed}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          Review & Check Capacity &rarr;
        </button>
      </div>
    </div>
  );
};

export default ConfigureStep;
