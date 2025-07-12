import { Switch, RadioGroup } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";

// A rough estimation until we fetch the full card list with rarities.
const estimateReverseHoloCount = (set) => {
  if (!set) return 0;
  // Estimate that ~60% of non-secret rare cards can have a reverse holo.
  return Math.floor(set.printedTotal * 0.6);
};

const ConfigureStep = ({
  selectedSet,
  configuration,
  onConfigChange,
  onProceed,
  onBack,
}) => {
  const { includeReverseHolos, placement } = configuration;

  const estimatedRhCount = estimateReverseHoloCount(selectedSet);
  const totalCards =
    (selectedSet?.printedTotal || 0) +
    (includeReverseHolos ? estimatedRhCount : 0);

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
              <p className="text-secondary dark:text-slate-400">
                {selectedSet?.series} &bull; Released {selectedSet?.releaseDate}
              </p>
            </div>
          </div>
        </div>

        {/* Reverse Holo Option */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-700/80">
          <div className="p-4 flex items-center justify-between">
            <label
              htmlFor="include-reverse-holos"
              className="flex flex-col cursor-pointer flex-1 pr-4"
            >
              <span className="text-base font-medium text-purple-800 dark:text-purple-300">
                ✨ Include Reverse Holo Cards
              </span>
              <span className="text-sm text-purple-600 dark:text-purple-400">
                Adds an estimated {estimatedRhCount} reverse holos.
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
            <div className="p-4 border-t border-border dark:border-slate-700/80">
              <RadioGroup
                value={placement}
                onChange={(value) => onConfigChange({ placement: value })}
                className="mt-2"
              >
                <RadioGroup.Label className="text-sm font-medium text-primary dark:text-slate-300">
                  Placement
                </RadioGroup.Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                  : "text-secondary dark:text-slate-400"
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
