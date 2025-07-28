import React from "react";
import { X } from "lucide-react";

/**
 * CardModal - Reusable card preview modal component
 *
 * Used across multiple pages for displaying Pokemon card details in a modal overlay
 */
const CardModal = ({
  selectedCard,
  onClose,
  showArtist = true,
  showTypes = true,
  showNotes = true,
  showCloseHint = false,
  className = "",
}) => {
  if (!selectedCard) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Card Image */}
      <div className="mb-4">
        {(selectedCard.image || selectedCard.imageSmall) && (
          <img
            src={selectedCard.image || selectedCard.imageSmall}
            alt={selectedCard.name}
            className="cursor-pointer shadow-2xl rounded-lg"
            onClick={onClose}
            style={{ maxHeight: "60vh" }}
          />
        )}
      </div>

      {/* Info Panel */}
      <div
        className={`bg-card-background rounded-2xl max-w-lg w-full shadow-2xl transform transition-all duration-300 ease-out cursor-pointer ${className}`}
        onClick={onClose}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {selectedCard.name}
          </h3>
          <button
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Card Details */}
        <div className="p-6">
          <div className="space-y-3">
            {/* Set */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Set
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedCard.set?.name || "Unknown"}
              </span>
            </div>

            {/* Number */}
            {selectedCard.number && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Number
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCard.number}
                </span>
              </div>
            )}

            {/* Rarity */}
            {selectedCard.rarity && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Rarity
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCard.rarity}
                </span>
              </div>
            )}

            {/* Artist */}
            {showArtist && selectedCard.artist && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Artist
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCard.artist}
                </span>
              </div>
            )}

            {/* Types */}
            {showTypes &&
              selectedCard.types &&
              selectedCard.types.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {selectedCard.types.length === 1 ? "Type" : "Types"}
                  </span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {selectedCard.types.map((type, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Notes */}
            {showNotes && selectedCard.binderMetadata?.notes && (
              <div className="pt-3 border-t border-gray-200">
                <div className="pt-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1">
                    Notes
                  </span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    {selectedCard.binderMetadata.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Close hint */}
          {showCloseHint && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Click the card or outside to close
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardModal;
