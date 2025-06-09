import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { toast } from "react-hot-toast";
import SingleCardTab from "./SingleCardTab";
import SetTab from "./SetTab";

const AddCardModal = ({
  isOpen,
  onClose,
  currentBinder,
  targetPosition = null,
}) => {
  const { addCardToBinder, batchAddCards } = useBinderContext();
  const [selectedCards, setSelectedCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCards([]);
    }
  }, [isOpen]);

  const handleCardSelect = (card) => {
    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => c.id === card.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handleAddSelectedCards = async () => {
    if (!currentBinder || selectedCards.length === 0) return;

    try {
      setIsAdding(true);

      // Use batch add for much better performance
      await batchAddCards(currentBinder.id, selectedCards, targetPosition);

      const positionText =
        targetPosition !== null
          ? ` (starting at position ${targetPosition})`
          : "";

      toast.success(
        `Added ${selectedCards.length} card${
          selectedCards.length > 1 ? "s" : ""
        } to ${currentBinder.metadata.name}${positionText}`
      );
      setSelectedCards([]);
      onClose();
    } catch (error) {
      console.error("Failed to add cards:", error);
      toast.error("Failed to add cards to binder");
    } finally {
      setIsAdding(false);
    }
  };

  // Handle adding multiple cards (from sets) - now uses batch add
  const handleAddCards = async (cards) => {
    if (!currentBinder || !Array.isArray(cards) || cards.length === 0) return;

    try {
      // Use batch add for much better performance
      await batchAddCards(currentBinder.id, cards, targetPosition);
    } catch (error) {
      console.error("Failed to add cards:", error);
      throw error; // Re-throw to let the caller handle the error message
    }
  };

  const isCardSelected = (cardId) => {
    return selectedCards.some((card) => card.id === cardId);
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
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium text-slate-900"
                    >
                      Add Cards to {currentBinder?.metadata?.name}
                      {targetPosition !== null && (
                        <span className="text-blue-600 font-normal">
                          {" "}
                          - Slot {targetPosition}
                        </span>
                      )}
                    </Dialog.Title>
                    <p className="text-sm text-slate-500 mt-1">
                      {targetPosition !== null
                        ? `First card will be placed at position ${targetPosition}. Additional cards will fill empty slots.`
                        : "Search for individual cards or add entire sets to your binder"}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group>
                  <Tab.List className="flex border-b border-slate-200 bg-slate-50">
                    <Tab as={Fragment}>
                      {({ selected }) => (
                        <button
                          className={`px-6 py-3 text-sm font-medium transition-colors ${
                            selected
                              ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                              : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          Single Cards
                        </button>
                      )}
                    </Tab>
                    <Tab as={Fragment}>
                      {({ selected }) => (
                        <button
                          className={`px-6 py-3 text-sm font-medium transition-colors ${
                            selected
                              ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                              : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          Complete Sets
                        </button>
                      )}
                    </Tab>
                  </Tab.List>

                  <Tab.Panels className="flex-1 overflow-hidden">
                    <Tab.Panel className="h-full">
                      <SingleCardTab
                        selectedCards={selectedCards}
                        onCardSelect={handleCardSelect}
                        isCardSelected={isCardSelected}
                      />
                    </Tab.Panel>
                    <Tab.Panel className="h-full">
                      <SetTab
                        currentBinder={currentBinder}
                        onAddCards={handleAddCards}
                      />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Footer - only show for single cards tab */}
                <Tab.Group>
                  <Tab.Panels>
                    <Tab.Panel>
                      <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center space-x-2">
                          {selectedCards.length > 0 && (
                            <>
                              <span className="text-sm text-slate-600">
                                {selectedCards.length} card
                                {selectedCards.length > 1 ? "s" : ""} selected
                              </span>
                              <div className="flex -space-x-2">
                                {selectedCards.slice(0, 3).map((card) => (
                                  <div
                                    key={card.id}
                                    className="w-8 h-10 bg-slate-200 rounded border-2 border-white shadow-sm overflow-hidden"
                                  >
                                    {card.image && (
                                      <img
                                        src={card.image}
                                        alt={card.name}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                ))}
                                {selectedCards.length > 3 && (
                                  <div className="w-8 h-10 bg-slate-300 rounded border-2 border-white shadow-sm flex items-center justify-center">
                                    <span className="text-slate-600 text-xs">
                                      +{selectedCards.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddSelectedCards}
                            disabled={selectedCards.length === 0 || isAdding}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors flex items-center space-x-2 min-w-[120px]"
                          >
                            {isAdding ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <PlusIcon className="w-4 h-4" />
                            )}
                            <span>
                              {isAdding
                                ? "Adding..."
                                : `Add ${selectedCards.length || ""} Card${
                                    selectedCards.length !== 1 ? "s" : ""
                                  }`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </Tab.Panel>
                    <Tab.Panel>
                      {/* No footer for sets tab since each set has its own add button */}
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCardModal;
