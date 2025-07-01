import { useState } from "react";
import { Button } from "../ui/Button";
import { CardRepairService } from "../../utils/cardRepairService";
import PokemonCard from "../PokemonCard";
import { toast } from "react-hot-toast";
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  EyeIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

const CardRepairTool = ({ userId, binderId, source, onRepairComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [incompleteCards, setIncompleteCards] = useState([]);
  const [previewResults, setPreviewResults] = useState(null);
  const [commitResults, setCommitResults] = useState(null);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState("scan"); // 'scan', 'preview', 'commit', 'complete'

  const scanForIncompleteCards = async () => {
    try {
      setIsScanning(true);
      setPreviewResults(null);
      setCommitResults(null);
      setCurrentStep("scan");

      let cards;
      if (binderId) {
        // Scan specific binder
        cards = await CardRepairService.findIncompleteCardsInBinder(
          binderId,
          userId,
          source
        );
      } else {
        // Scan all binders for user
        cards = await CardRepairService.findAllIncompleteCardsForUser(userId);
      }

      setIncompleteCards(cards);
      setScanCompleted(true);

      if (cards.length === 0) {
        toast.success("No incomplete cards found!");
        setCurrentStep("complete");
      } else {
        toast(`⚠️ Found ${cards.length} incomplete cards that need repair`, {
          icon: "⚠️",
          style: {
            borderLeft: "4px solid #f59e0b",
            backgroundColor: "#fef3c7",
          },
        });
        setCurrentStep("preview");
      }
    } catch (error) {
      console.error("Error scanning for incomplete cards:", error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const previewRepairs = async () => {
    try {
      setIsPreviewing(true);

      const results = await CardRepairService.previewCardRepairs(
        incompleteCards
      );
      setPreviewResults(results);

      if (results.successful > 0) {
        toast.success(
          `Preview completed! ${results.successful} cards ready for review`
        );
        setCurrentStep("commit");
      }

      if (results.failed > 0) {
        toast.error(`Failed to preview ${results.failed} cards`);
      }
    } catch (error) {
      console.error("Error previewing repairs:", error);
      toast.error(`Preview failed: ${error.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const commitRepairs = async () => {
    try {
      setIsCommitting(true);

      // Only commit successful previews
      const successfulPreviews = previewResults.previews.filter(
        (p) => p.success
      );
      const results = await CardRepairService.commitRepairs(successfulPreviews);

      setCommitResults(results);

      if (results.committed > 0) {
        toast.success(
          `Successfully committed ${results.committed} repairs to Firebase!`
        );
        setCurrentStep("complete");

        if (onRepairComplete) {
          onRepairComplete({
            repaired: results.committed,
            failed: results.failed,
            results: results.results,
          });
        }
      }

      if (results.failed > 0) {
        toast.error(`Failed to commit ${results.failed} repairs`);
      }
    } catch (error) {
      console.error("Error committing repairs:", error);
      toast.error(`Commit failed: ${error.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const resetTool = () => {
    setIncompleteCards([]);
    setPreviewResults(null);
    setCommitResults(null);
    setScanCompleted(false);
    setCurrentStep("scan");
  };

  return (
    <div className="bg-card-background rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Card Repair Tool
          </h3>
          <p className="text-sm text-gray-600">
            2-Step Process: Preview → Commit to Firebase
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <div
            className={`flex items-center gap-2 ${
              currentStep === "scan"
                ? "text-blue-600 font-medium"
                : currentStep === "preview" ||
                  currentStep === "commit" ||
                  currentStep === "complete"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "scan"
                  ? "bg-blue-100 text-blue-600"
                  : currentStep === "preview" ||
                    currentStep === "commit" ||
                    currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              1
            </div>
            <span>Scan</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              currentStep === "preview"
                ? "text-blue-600 font-medium"
                : currentStep === "commit" || currentStep === "complete"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "preview"
                  ? "bg-blue-100 text-blue-600"
                  : currentStep === "commit" || currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              2
            </div>
            <span>Preview</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              currentStep === "commit"
                ? "text-blue-600 font-medium"
                : currentStep === "complete"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "commit"
                  ? "bg-blue-100 text-blue-600"
                  : currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              3
            </div>
            <span>Commit</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium mb-1">
              Safe 2-Step Repair Process
            </p>
            <p className="text-blue-700">
              <strong>Step 1:</strong> Scan for incomplete cards
              <br />
              <strong>Step 2:</strong> Preview fetched data locally (images
              load, no Firebase changes)
              <br />
              <strong>Step 3:</strong> Commit approved repairs to Firebase
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Scan Section */}
      {currentStep === "scan" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Step 1:{" "}
              {binderId
                ? `Scan Binder ${binderId}`
                : `Scan All Binders for User`}
            </h4>
            <Button
              onClick={scanForIncompleteCards}
              disabled={isScanning}
              variant="outline"
              size="sm"
            >
              {isScanning ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                  Scan for Issues
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanCompleted && currentStep !== "scan" && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            {incompleteCards.length === 0 ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            )}
            <span className="font-medium text-gray-900">
              Scan Results:{" "}
              {incompleteCards.length === 0
                ? "No incomplete cards found"
                : `Found ${incompleteCards.length} incomplete cards`}
            </span>
          </div>
        </div>
      )}

      {/* Step 2: Preview Section */}
      {currentStep === "preview" && incompleteCards.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Step 2: Preview Repairs ({incompleteCards.length} cards)
            </h4>
            <Button
              onClick={previewRepairs}
              disabled={isPreviewing}
              variant="primary"
              size="sm"
            >
              {isPreviewing ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  Fetching from API...
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Preview Repairs
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            This will fetch card data from Pokemon TCG API for preview only - no
            Firebase changes yet.
          </p>
        </div>
      )}

      {/* Preview Results */}
      {previewResults && (
        <div className="mb-6">
          <div className="bg-background rounded-lg p-4 mb-6">
            <h4 className="font-medium text-text-primary mb-3">Preview Results</h4>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {previewResults.totalCards}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {previewResults.successful}
                </div>
                <div className="text-sm text-gray-600">Fetched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {previewResults.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </div>

          {/* Card Previews */}
          {previewResults.successful > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">
                Card Previews (Review Before Committing)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-h-96 overflow-y-auto bg-background p-4 rounded-lg">
                {previewResults.previews
                  .filter((p) => p.success)
                  .map((preview, index) => (
                    <div key={index} className="relative">
                      <PokemonCard
                        card={preview.fetchedCardData}
                        size="small"
                        isReadOnly={true}
                        className="transform hover:scale-105 transition-transform"
                      />
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Pos {preview.position}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Commit Section */}
      {currentStep === "commit" && previewResults?.successful > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Step 3: Commit Repairs to Firebase
            </h4>
            <Button
              onClick={commitRepairs}
              disabled={isCommitting}
              variant="primary"
              size="sm"
            >
              {isCommitting ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  Committing...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                  Commit {previewResults.successful} Repairs
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            This will save the previewed card data to Firebase. This action
            cannot be undone.
          </p>
        </div>
      )}

      {/* Commit Results */}
      {commitResults && (
        <div className="bg-background rounded-lg p-4 mb-6">
          <h4 className="font-medium text-text-primary mb-3">Final Results</h4>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {commitResults.totalAttempted}
              </div>
              <div className="text-sm text-gray-600">Attempted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {commitResults.committed}
              </div>
              <div className="text-sm text-gray-600">Committed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {commitResults.failed}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {currentStep === "complete" && (
        <div className="text-center">
          <Button onClick={resetTool} variant="outline" size="sm">
            Start New Repair Session
          </Button>
        </div>
      )}
    </div>
  );
};

export default CardRepairTool;
