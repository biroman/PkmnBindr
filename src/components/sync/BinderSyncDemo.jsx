import { useState } from "react";
import { useBinderContext } from "../../contexts/BinderContext";
import SyncStatus from "./SyncStatus";

/**
 * Demo component showing how to integrate sync functionality
 * into existing binder views
 */
const BinderSyncDemo = () => {
  const { currentBinder, syncBinderToCloud } = useBinderContext();
  const [selectedBinder, setSelectedBinder] = useState(currentBinder);

  const handleSyncComplete = (updatedBinder) => {
    // Update local state with synced binder
    setSelectedBinder(updatedBinder);
    console.log("Binder synced successfully:", updatedBinder);
  };

  const handleSyncError = (error) => {
    console.error("Sync error:", error);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Binder Sync Integration Demo
      </h1>

      {selectedBinder ? (
        <div className="space-y-6">
          {/* Binder Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedBinder.metadata?.name || "Untitled Binder"}
            </h2>
            <p className="text-gray-600 text-sm mb-2">
              {selectedBinder.metadata?.description || "No description"}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                {Object.keys(selectedBinder.cards || {}).length} cards
              </span>
              <span>Version {selectedBinder.version || 1}</span>
              <span>
                Last modified:{" "}
                {new Date(selectedBinder.lastModified).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Compact Sync Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Compact Sync Status
            </h3>
            <SyncStatus
              binder={selectedBinder}
              onSyncComplete={handleSyncComplete}
              onSyncError={handleSyncError}
              compact={true}
            />
          </div>

          {/* Full Sync Panel */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Full Sync Panel
            </h3>
            <SyncStatus
              binder={selectedBinder}
              onSyncComplete={handleSyncComplete}
              onSyncError={handleSyncError}
              compact={false}
            />
          </div>

          {/* Integration Examples */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Integration Examples
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-800">In Binder Header:</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {"<SyncStatus binder={binder} compact={true} />"}
                </code>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">
                  In Settings Panel:
                </h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {"<SyncStatus binder={binder} showControls={true} />"}
                </code>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Status Only:</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {"<SyncStatus binder={binder} showControls={false} />"}
                </code>
              </div>
            </div>
          </div>

          {/* Manual Sync Example */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Manual Sync Controls
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => syncBinderToCloud(selectedBinder.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Manual Sync
              </button>
              <button
                onClick={() =>
                  syncBinderToCloud(selectedBinder.id, { forceOverwrite: true })
                }
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
              >
                Force Overwrite
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No binder selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Create or select a binder to see sync functionality
          </p>
        </div>
      )}
    </div>
  );
};

export default BinderSyncDemo;
