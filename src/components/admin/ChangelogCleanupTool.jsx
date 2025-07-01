import { useState } from "react";
import { useBinderContext } from "../../contexts/BinderContext";
import { Button } from "../ui/Button";
import { toast } from "react-hot-toast";
import AdminBinderAnalysisService from "../../services/admin/AdminBinderAnalysisService";

const ChangelogCleanupTool = () => {
  const { binders, cleanupAllBinderChangelogs } = useBinderContext();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedBinders, setSelectedBinders] = useState(new Set());
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const analyzeChangelogs = async () => {
    setIsAnalyzing(true);

    try {
      console.log("🔍 Starting admin changelog analysis...");
      const analysisResult =
        await AdminBinderAnalysisService.analyzeAllChangelogs();

      if (analysisResult.success) {
        const results = analysisResult.results;

        // Add user information to the results
        const enhancedResults = {
          ...results,
          userBreakdown: Array.from(results.userBreakdown.entries())
            .map(([userId, stats]) => ({
              userId,
              ...stats,
            }))
            .sort((a, b) => b.totalEntries - a.totalEntries),
        };

        setAnalysisResults(enhancedResults);
        setSelectedBinders(new Set()); // Clear selection when new analysis is done
        console.log("✅ Analysis complete:", enhancedResults);
      } else {
        throw new Error(analysisResult.error);
      }
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      toast.error(`Failed to analyze changelogs: ${error.message}`);
      setAnalysisResults(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCleanupSelected = async () => {
    if (!analysisResults || selectedBinders.size === 0) {
      toast.error("No binders selected for cleanup");
      return;
    }

    setIsCleaningUp(true);

    try {
      // Get document IDs of selected binders
      const selectedBinderData = analysisResults.bloatedBinders.filter((b) =>
        selectedBinders.has(b.docId)
      );
      const binderDocIds = selectedBinderData.map((b) => b.docId);

      console.log(
        `🧹 Starting cleanup for ${binderDocIds.length} selected binders...`
      );
      toast.loading("Cleaning up selected changelogs...", { duration: 3000 });

      const cleanupResult = await AdminBinderAnalysisService.cleanupBinders(
        binderDocIds
      );

      if (cleanupResult.success) {
        const { cleaned, failed, errors } = cleanupResult.results;

        if (cleaned > 0) {
          toast.success(
            `Successfully cleaned ${cleaned} selected binder${
              cleaned > 1 ? "s" : ""
            }`
          );
        }

        if (failed > 0) {
          console.warn("Some cleanup operations failed:", errors);
          toast.error(
            `${failed} selected binder${failed > 1 ? "s" : ""} failed to clean`
          );
        }

        // Clear selection and re-analyze after cleanup
        setSelectedBinders(new Set());
        setTimeout(() => {
          analyzeChangelogs();
        }, 1000);
      } else {
        throw new Error(cleanupResult.error);
      }
    } catch (error) {
      console.error("❌ Failed to cleanup changelogs:", error);
      toast.error(`Failed to cleanup changelogs: ${error.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCleanupAll = async () => {
    if (!analysisResults || analysisResults.bloatedBinders.length === 0) {
      toast.error("No bloated binders to clean up");
      return;
    }

    // Select all bloated binders
    const allBloatedIds = new Set(
      analysisResults.bloatedBinders.map((b) => b.docId)
    );
    setSelectedBinders(allBloatedIds);

    // Then clean them up
    setTimeout(() => handleCleanupSelected(), 100);
  };

  const toggleBinderSelection = (binderId) => {
    setSelectedBinders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(binderId)) {
        newSet.delete(binderId);
      } else {
        newSet.add(binderId);
      }
      return newSet;
    });
  };

  const selectAllBinders = () => {
    if (!analysisResults) return;

    const allBloatedIds = new Set(
      analysisResults.bloatedBinders.map((b) => b.docId)
    );
    setSelectedBinders(allBloatedIds);
  };

  const deselectAllBinders = () => {
    setSelectedBinders(new Set());
  };

  return (
    <div className="bg-card-background rounded-lg shadow-sm border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Changelog Cleanup Tool
        </h3>
        <p className="text-gray-600 text-sm">
          Analyze and clean up bloated changelogs that can cause Firebase
          storage limit issues. Note: Card movements no longer create changelog
          entries as of the latest update.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={analyzeChangelogs}
            disabled={isAnalyzing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Changelogs"}
          </Button>

          {analysisResults && analysisResults.bloatedBinders.length > 0 && (
            <>
              <Button
                onClick={selectAllBinders}
                disabled={isCleaningUp}
                className="bg-gray-600 text-white hover:bg-gray-700"
              >
                Select All ({analysisResults.bloatedBinders.length})
              </Button>

              <Button
                onClick={deselectAllBinders}
                disabled={isCleaningUp}
                className="bg-gray-400 text-white hover:bg-gray-500"
              >
                Deselect All
              </Button>

              <Button
                onClick={handleCleanupSelected}
                disabled={selectedBinders.size === 0 || isCleaningUp}
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                {isCleaningUp
                  ? "Cleaning..."
                  : `Clean Selected (${selectedBinders.size})`}
              </Button>

              <Button
                onClick={handleCleanupAll}
                disabled={isCleaningUp}
                className="bg-red-800 text-white hover:bg-red-900"
              >
                Clean All Bloated
              </Button>
            </>
          )}
        </div>

        {analysisResults && (
          <div className="mt-6 space-y-4">
            <div className="bg-background rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Analysis Results
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {analysisResults.totalBinders}
                  </div>
                  <div className="text-sm text-gray-600">Total Binders</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResults.bloatedBinders.length}
                  </div>
                  <div className="text-sm text-gray-600">Bloated Binders</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysisResults.optimisticEntries}
                  </div>
                  <div className="text-sm text-gray-600">
                    Optimistic Entries
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.estimatedStorageKB} KB
                  </div>
                  <div className="text-sm text-gray-600">Est. Storage Used</div>
                </div>
              </div>

              {analysisResults.bloatedBinders.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-gray-900">
                      Bloated Binders ({">"}100 changelog entries):
                    </h5>
                    {selectedBinders.size > 0 && (
                      <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {selectedBinders.size} selected
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {analysisResults.bloatedBinders.map((binder) => (
                      <div
                        key={binder.id}
                        className={`flex items-center gap-3 p-3 bg-card-background rounded border transition-colors ${
                          selectedBinders.has(binder.docId)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBinders.has(binder.docId)}
                          onChange={() => toggleBinderSelection(binder.docId)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />

                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {binder.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {binder.changelogLength} entries (
                            {binder.optimisticCount} optimistic)
                          </div>
                          <div className="text-xs text-blue-600">
                            User: {binder.ownerId?.substring(0, 8)}...
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium text-red-600">
                            {binder.estimatedKB} KB
                          </div>
                          <div className="text-xs text-gray-500">
                            Impact:{" "}
                            {Math.round((binder.changelogLength / 100) * 10)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResults.bloatedBinders.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-green-600 font-medium">
                    ✅ No bloated changelogs found!
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    All binders have reasonable changelog sizes.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangelogCleanupTool;
