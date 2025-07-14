import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const MissingCardsModal = ({ isOpen, onClose, binder, onMarkAsCollected }) => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  if (!isOpen || !binder) return null;

  const allCardInstanceIds = Object.values(binder?.cards || {})
    .map((cardEntry) => cardEntry?.instanceId)
    .filter(Boolean);

  const missingInstanceIds = binder?.metadata?.missingInstances || [];
  const missingCards = allCardInstanceIds.filter((instanceId) =>
    missingInstanceIds.includes(instanceId)
  );

  const missingCardDetails = missingCards
    .map((instanceId) => {
      const cardEntry = Object.values(binder.cards).find(
        (entry) => entry?.instanceId === instanceId
      );
      return cardEntry;
    })
    .filter(Boolean);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCardHover = (cardData, event) => {
    if (cardData.image || cardData.imageSmall) {
      setHoveredCard(cardData);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  const handleMarkAsCollected = (instanceId) => {
    if (onMarkAsCollected) {
      onMarkAsCollected(instanceId);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl h-[80vh] transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Missing Cards
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {missingCards.length} of {allCardInstanceIds.length}{" "}
                        cards marked as missing
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                  {missingCards.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No Missing Cards
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        All cards in this binder are marked as collected!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {missingCardDetails.map((cardEntry, index) => {
                          // Get the actual card data from the cardData property
                          const cardData = cardEntry.cardData || cardEntry;

                          return (
                            <div
                              key={cardEntry.instanceId}
                              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {cardData.image || cardData.imageSmall ? (
                                    <div
                                      className="w-16 h-22 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer"
                                      onMouseEnter={(e) =>
                                        handleCardHover(cardData, e)
                                      }
                                      onMouseLeave={handleCardLeave}
                                    >
                                      <img
                                        src={
                                          cardData.image || cardData.imageSmall
                                        }
                                        alt={cardData.name || "Pokemon card"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // Fallback to number display if image fails to load
                                          e.target.style.display = "none";
                                          e.target.nextSibling.style.display =
                                            "flex";
                                        }}
                                      />
                                      <div
                                        className="w-full h-full bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center"
                                        style={{ display: "none" }}
                                      >
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                          {cardData.number || "?"}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-22 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {cardData.number || "?"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {cardData.name || "Unknown Card"}
                                  </h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {cardData.set?.name || "Unknown Set"}
                                  </p>
                                  <div className="mt-2">
                                    <button
                                      onClick={() =>
                                        handleMarkAsCollected(
                                          cardEntry.instanceId
                                        )
                                      }
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm hover:shadow-md"
                                      title="Mark as collected"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      Mark Collected
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Collection progress:{" "}
                    {allCardInstanceIds.length - missingCards.length} /{" "}
                    {allCardInstanceIds.length} (
                    {(
                      ((allCardInstanceIds.length - missingCards.length) /
                        allCardInstanceIds.length) *
                      100
                    ).toFixed(1)}
                    %)
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {/* Hover Card Preview */}
      {hoveredCard && (hoveredCard.image || hoveredCard.imageSmall) && (
        <div
          className="fixed z-[60] pointer-events-none transition-opacity duration-200"
          style={{
            left: hoverPosition.x + 20,
            top: hoverPosition.y - 100,
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 p-2">
            <img
              src={hoveredCard.image || hoveredCard.imageSmall}
              alt={hoveredCard.name || "Pokemon card"}
              className="w-96 h-128 object-contain rounded"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {hoveredCard.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {hoveredCard.set?.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </Transition>
  );
};

export default MissingCardsModal;
