import { Fragment } from "react";
import { Switch } from "@headlessui/react";
import {
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";

const SelectedCardsSidebar = ({
  selectedMap,
  onIncrease,
  onDecrease,
  onClearCard,
  onClearAll,
  handlePrimaryAddAction,
  addToPage,
  setAddToPage,
  selectedTotalCount,
  isAdding,
  isAddingToPage,
  activeTab,
  exceedsLimit = false,
  cardRemaining = null,
}) => {
  const selectedItems = Object.values(selectedMap);

  const footerVisible = activeTab === 0 || activeTab === 2; // For Single Cards and Sleeves tabs

  return (
    <div className="flex flex-col w-full md:w-80 lg:w-96 bg-slate-50 dark:bg-slate-800/50 border-l border-border flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h3 className="text-base sm:text-lg font-semibold text-primary">
          Selected Items ({selectedTotalCount})
        </h3>
        {selectedTotalCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Selected Items List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
        {selectedItems.length === 0 ? (
          <div className="text-center py-16 px-4 h-full flex flex-col items-center justify-center">
            <CubeTransparentIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="mt-4 text-base font-medium text-primary">
              Your selected items will appear here.
            </h4>
            <p className="mt-1 text-sm text-secondary">
              Click on a card to add it to the list.
            </p>
          </div>
        ) : (
          selectedItems.map(({ card, count }) => (
            <div
              key={card.id}
              className="flex items-center gap-3 bg-card-background p-2 rounded-lg shadow-sm border border-transparent"
            >
              <img
                src={card.imageSmall || card.image}
                alt={card.name}
                className="w-10 h-14 object-contain rounded-md bg-slate-200 dark:bg-slate-700 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {card.name}
                </p>
                <p className="text-xs text-secondary truncate">
                  {card.set.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onDecrease(card)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm w-4 text-center">
                  {count}
                </span>
                <button
                  onClick={() => onIncrease(card)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => onClearCard(card)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Remove item"
              >
                <XMarkIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      {footerVisible && (
        <div className="p-4 border-t border-border bg-card-background/80 backdrop-blur-sm">
          <div className="space-y-3">
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
                  Add to current page
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Add to current page and push others.
                </span>
              </Switch.Label>
              <Switch
                checked={addToPage}
                onChange={setAddToPage}
                className={`${
                  addToPage ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900`}
              >
                <span
                  className={`${
                    addToPage ? "translate-x-6" : "translate-x-1"
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
                isAddingToPage ||
                exceedsLimit
              }
              className="w-full flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 px-3 py-3 text-base font-semibold shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              {isAdding || isAddingToPage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PlusIcon className="w-5 h-5" />
              )}
              <span>
                {isAdding || isAddingToPage
                  ? "Adding..."
                  : exceedsLimit
                  ? "Limit Exceeded"
                  : selectedTotalCount > 0
                  ? `Add ${selectedTotalCount} Card${
                      selectedTotalCount !== 1 ? "s" : ""
                    }`
                  : "Add Cards"}
              </span>
            </button>
            {exceedsLimit && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
                Adding these cards would exceed the binder limit.
                {cardRemaining !== null &&
                  ` You have ${cardRemaining} slot${
                    cardRemaining === 1 ? "" : "s"
                  } remaining.`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedCardsSidebar;
