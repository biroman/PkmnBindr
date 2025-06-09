import { useState } from "react";
import {
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  CloudArrowUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";

const LocalBinderWarning = () => {
  const { getLocalOnlyBinders, claimLocalBinder, clearLocalOnlyBinders } =
    useBinderContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const localOnlyBinders = getLocalOnlyBinders();

  if (localOnlyBinders.length === 0) {
    return null;
  }

  const handleClaimAll = async () => {
    setIsProcessing(true);
    try {
      for (const binder of localOnlyBinders) {
        await claimLocalBinder(binder.id);
      }
    } catch (error) {
      console.error("Failed to claim binders:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        `Are you sure you want to remove ${
          localOnlyBinders.length
        } local binder${
          localOnlyBinders.length > 1 ? "s" : ""
        } from a previous user? This cannot be undone.`
      )
    ) {
      setIsProcessing(true);
      try {
        clearLocalOnlyBinders();
      } catch (error) {
        console.error("Failed to clear binders:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            Local Binders from Previous User Detected
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>
              Found {localOnlyBinders.length} binder{" "}
              {localOnlyBinders.length > 1 ? "s" : ""}
              from a previous user stored locally on this device.
              {!showDetails && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="underline hover:no-underline ml-1"
                >
                  View details
                </button>
              )}
            </p>

            {showDetails && (
              <div className="mt-3 space-y-1">
                {localOnlyBinders.map((binder) => (
                  <div
                    key={binder.id}
                    className="flex items-center text-xs bg-orange-100 p-2 rounded"
                  >
                    <ComputerDesktopIcon className="h-4 w-4 mr-2 text-orange-600" />
                    <span className="font-medium">
                      {binder.metadata?.name || "Unnamed Binder"}
                    </span>
                    <span className="ml-2 text-orange-600">
                      ({Object.keys(binder.cards || {}).length} cards)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleClaimAll}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-1.5" />
              {isProcessing ? "Claiming..." : "Claim All Binders"}
            </button>

            <button
              onClick={handleClearAll}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-1.5" />
              Clear All
            </button>

            {showDetails && (
              <button
                onClick={() => setShowDetails(false)}
                className="inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md text-orange-700 hover:text-orange-900"
              >
                Hide Details
              </button>
            )}
          </div>

          <div className="mt-2 text-xs text-orange-600">
            <p>
              <strong>Claim:</strong> Transfer ownership to your account and
              save to cloud.
              <strong className="ml-2">Clear:</strong> Remove from this device
              (cannot be recovered).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalBinderWarning;
