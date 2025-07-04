import PropTypes from "prop-types";
import { TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "../ui/Button";

const SelectionActionBar = ({
  selectedCount,
  onDeselectAll,
  onSelectAll,
  onBulkDelete,
  onDone,
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-2xl z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 px-4 py-3">
        <div className="flex-shrink-0">
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
            {selectedCount}
          </span>
          <span className="text-gray-600 dark:text-gray-400 ml-2">
            Selected
          </span>
        </div>

        <div className="flex-grow h-8 border-l border-gray-200 dark:border-gray-600 mx-2"></div>

        <div className="flex items-center gap-2">
          {onDeselectAll && (
            <Button
              variant="ghost"
              onClick={onDeselectAll}
              aria-label="Deselect All"
              disabled={selectedCount === 0}
            >
              Deselect All
            </Button>
          )}
        </div>

        <div className="flex-shrink-0 ml-4">
          <Button onClick={onDone} size="lg">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

SelectionActionBar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  onDeselectAll: PropTypes.func,
  onSelectAll: PropTypes.func,
  onBulkDelete: PropTypes.func,
  onDone: PropTypes.func.isRequired,
};

export default SelectionActionBar;
