import { useState } from "react";
import { Button } from "../ui/Button";
import { toast } from "react-hot-toast";
import PokemonCard from "../PokemonCard";
import {
  PhotoIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query as firestoreQuery,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

const ImageUpdateTool = ({ userId, binderId, source, onUpdateComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cardsWithStandardImages, setCardsWithStandardImages] = useState([]);
  const [updateResults, setUpdateResults] = useState(null);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState("scan");

  const scanForStandardImages = async () => {
    try {
      setIsScanning(true);
      setUpdateResults(null);
      setCurrentStep("scan");

      console.log(
        `[ImageUpdate] Scanning binder ${binderId} for standard images...`
      );

      let binderDoc;

      if (source === "user_binders") {
        const binderQuery = firestoreQuery(
          collection(db, "user_binders"),
          where("id", "==", binderId),
          where("ownerId", "==", userId)
        );
        const snapshot = await getDocs(binderQuery);
        if (!snapshot.empty) {
          binderDoc = snapshot.docs[0];
        }
      } else if (source === "binders") {
        binderDoc = await getDoc(doc(db, "binders", binderId));
      }

      if (!binderDoc || !binderDoc.exists()) {
        throw new Error(`Binder ${binderId} not found`);
      }

      const binderData = binderDoc.data();
      const standardCards = [];

      if (binderData.cards && typeof binderData.cards === "object") {
        Object.entries(binderData.cards).forEach(([position, cardData]) => {
          // Debug logging to understand card data structure
          console.log(`[ImageUpdate] Card at position ${position}:`, {
            cardData,
            hasCardData: !!cardData?.cardData,
            hasImage: !!cardData?.cardData?.image,
            imageUrl: cardData?.cardData?.image,
            isStandard: !cardData?.cardData?.image?.includes("_hires"),
          });

          if (cardData && cardData.cardData && cardData.cardData.image) {
            // Look for cards that DON'T have _hires in their URL
            if (!cardData.cardData.image.includes("_hires")) {
              // Create the high-res URL by adding _hires before the file extension
              const imageUrl = cardData.cardData.image;
              const lastDotIndex = imageUrl.lastIndexOf(".");
              const newImageUrl =
                lastDotIndex !== -1
                  ? `${imageUrl.substring(
                      0,
                      lastDotIndex
                    )}_hires${imageUrl.substring(lastDotIndex)}`
                  : `${imageUrl}_hires`;

              standardCards.push({
                position,
                cardId: cardData.cardId,
                currentImageUrl: cardData.cardData.image,
                newImageUrl: newImageUrl,
                cardData: cardData,
                binderDocId: binderDoc.id,
                binderSource: source,
              });
            }
          }
        });
      }

      setCardsWithStandardImages(standardCards);
      setScanCompleted(true);

      if (standardCards.length === 0) {
        toast.success(
          "No standard images found! All cards are already using high-resolution versions."
        );
        setCurrentStep("complete");
      } else {
        toast(
          `📸 Found ${standardCards.length} cards with standard images that can be upgraded to high-resolution`,
          {
            icon: "📸",
            style: {
              borderLeft: "4px solid #3b82f6",
              backgroundColor: "#dbeafe",
            },
          }
        );
        setCurrentStep("update");
      }
    } catch (error) {
      console.error("Error scanning for standard images:", error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const updateImages = async () => {
    try {
      setIsUpdating(true);

      console.log(
        `[ImageUpdate] Updating ${cardsWithStandardImages.length} images to high-resolution...`
      );

      let successCount = 0;
      let failureCount = 0;
      const results = [];

      let binderDocRef;
      if (source === "user_binders") {
        const binderQuery = firestoreQuery(
          collection(db, "user_binders"),
          where("id", "==", binderId),
          where("ownerId", "==", userId)
        );
        const snapshot = await getDocs(binderQuery);
        if (!snapshot.empty) {
          binderDocRef = snapshot.docs[0].ref;
        }
      } else if (source === "binders") {
        binderDocRef = doc(db, "binders", binderId);
      }

      if (!binderDocRef) {
        throw new Error("Could not find binder document");
      }

      const currentBinderDoc = await getDoc(binderDocRef);
      if (!currentBinderDoc.exists()) {
        throw new Error("Binder document no longer exists");
      }

      const currentBinderData = currentBinderDoc.data();
      const updatedCards = { ...currentBinderData.cards };

      for (const cardInfo of cardsWithStandardImages) {
        try {
          console.log(
            `[ImageUpdate] Updating position ${cardInfo.position}: ${cardInfo.currentImageUrl} → ${cardInfo.newImageUrl}`
          );

          if (
            updatedCards[cardInfo.position] &&
            updatedCards[cardInfo.position].cardData
          ) {
            updatedCards[cardInfo.position].cardData.image =
              cardInfo.newImageUrl;
          }

          results.push({
            success: true,
            position: cardInfo.position,
            cardId: cardInfo.cardId,
            oldUrl: cardInfo.currentImageUrl,
            newUrl: cardInfo.newImageUrl,
          });

          successCount++;
        } catch (error) {
          console.error(
            `[ImageUpdate] Failed to update position ${cardInfo.position}:`,
            error
          );

          results.push({
            success: false,
            position: cardInfo.position,
            cardId: cardInfo.cardId,
            error: error.message,
          });

          failureCount++;
        }
      }

      await updateDoc(binderDocRef, {
        cards: updatedCards,
        "metadata.lastModified": new Date().toISOString(),
      });

      setUpdateResults({
        successful: successCount,
        failed: failureCount,
        results,
      });

      if (successCount > 0) {
        toast.success(
          `Successfully updated ${successCount} card images to high-resolution!`
        );
        setCurrentStep("complete");

        if (onUpdateComplete) {
          onUpdateComplete({
            updated: successCount,
            failed: failureCount,
            results,
          });
        }
      }

      if (failureCount > 0) {
        toast.error(`Failed to update ${failureCount} card images`);
      }
    } catch (error) {
      console.error("Error updating images:", error);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const resetTool = () => {
    setCardsWithStandardImages([]);
    setUpdateResults(null);
    setScanCompleted(false);
    setCurrentStep("scan");
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <PhotoIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Image Update Tool
          </h3>
          <p className="text-sm text-gray-600">
            Upgrade standard images to high-resolution versions
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
                : currentStep === "update" || currentStep === "complete"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "scan"
                  ? "bg-blue-100 text-blue-600"
                  : currentStep === "update" || currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              1
            </div>
            <span>Scan for standard</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              currentStep === "update"
                ? "text-blue-600 font-medium"
                : currentStep === "complete"
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "update"
                  ? "bg-blue-100 text-blue-600"
                  : currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              2
            </div>
            <span>Upgrade Images</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              currentStep === "complete"
                ? "text-green-600 font-medium"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === "complete"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              ✓
            </div>
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Step 1: Scan */}
      {currentStep === "scan" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Image Resolution Upgrade
                </h4>
                <p className="text-sm text-blue-800">
                  This tool will scan the binder for cards using standard
                  resolution images and upgrade them to high-resolution versions
                  by adding "_hires" to the filename.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={scanForStandardImages}
            disabled={isScanning}
            className="w-full"
          >
            {isScanning ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Scanning for standard images...
              </>
            ) : (
              <>
                <PhotoIcon className="w-4 h-4 mr-2" />
                Scan for Standard Resolution Images
              </>
            )}
          </Button>

          {scanCompleted && cardsWithStandardImages.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">
                  All images are already high-resolution!
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview Cards to Update */}
      {currentStep === "update" && cardsWithStandardImages.length > 0 && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">
                  Ready to Upgrade {cardsWithStandardImages.length} Cards
                </h4>
                <p className="text-sm text-yellow-800">
                  The following cards will have their image URLs updated to use
                  high-resolution versions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
            {cardsWithStandardImages.slice(0, 24).map((cardInfo) => (
              <div key={cardInfo.position} className="relative">
                <div className="aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden">
                  <PokemonCard
                    card={{
                      ...(cardInfo.cardData.cardData || cardInfo.cardData),
                      // Ensure we have an image to display
                      image: cardInfo.currentImageUrl,
                    }}
                    isClickable={false}
                    showCondition={false}
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                  standard
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  Position {cardInfo.position}
                </div>
              </div>
            ))}
          </div>

          {cardsWithStandardImages.length > 24 && (
            <p className="text-sm text-gray-600 text-center">
              Showing first 24 cards. {cardsWithStandardImages.length - 24} more
              will be upgraded.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={updateImages}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                  Upgrading {cardsWithStandardImages.length} images...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                  Upgrade to High-Resolution
                </>
              )}
            </Button>
            <Button onClick={resetTool} variant="outline" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === "complete" && updateResults && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">Upgrade Complete!</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700">Successfully upgraded:</span>
                <span className="font-semibold ml-2">
                  {updateResults.successful} cards
                </span>
              </div>
              {updateResults.failed > 0 && (
                <div>
                  <span className="text-red-700">Failed:</span>
                  <span className="font-semibold ml-2">
                    {updateResults.failed} cards
                  </span>
                </div>
              )}
            </div>
          </div>

          {updateResults.results && updateResults.results.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-2">
                Upgrade Details:
              </h4>
              <div className="space-y-1 text-sm">
                {updateResults.results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 ${
                      result.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <XCircleIcon className="w-4 h-4" />
                    )}
                    <span>
                      Position {result.position}:{" "}
                      {result.success ? "Upgraded" : result.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={resetTool} variant="outline" className="w-full">
            Run Another Upgrade
          </Button>
        </div>
      )}

      {/* Complete state for no standard images */}
      {currentStep === "complete" && !updateResults && (
        <div className="text-center py-4">
          <Button onClick={resetTool} variant="outline">
            Scan Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUpdateTool;
