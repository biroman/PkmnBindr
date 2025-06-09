import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import CardSearch from "../components/CardSearch";
import { useBinderContext } from "../contexts/BinderContext";

const CardBrowserPage = () => {
  const navigate = useNavigate();
  const { currentBinder, batchAddCards } = useBinderContext();
  const [selectedCards, setSelectedCards] = useState([]);
  const [showAddToBinder, setShowAddToBinder] = useState(false);

  const handleCardSelect = (card) => {
    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => c.id === card.id);
      if (isSelected) {
        // Remove from selection
        return prev.filter((c) => c.id !== card.id);
      } else {
        // Add to selection
        return [...prev, card];
      }
    });
  };

  const handleAddToBinder = async () => {
    if (!currentBinder) {
      toast.error("Please select a binder first");
      return;
    }

    if (selectedCards.length === 0) {
      toast.error("Please select cards to add");
      return;
    }

    try {
      // Use batch add for much better performance
      await batchAddCards(currentBinder.id, selectedCards);

      toast.success(
        `Added ${selectedCards.length} card${
          selectedCards.length > 1 ? "s" : ""
        } to ${currentBinder.metadata.name}`
      );
      setSelectedCards([]);
      setShowAddToBinder(false);

      // Optionally navigate to the binder
      // navigate('/binder');
    } catch (error) {
      console.error("Failed to add cards to binder:", error);
      toast.error("Failed to add cards to binder");
    }
  };

  const handleGoToBinder = () => {
    if (!currentBinder) {
      toast.error("Please select a binder first");
      return;
    }
    navigate(`/binder/${currentBinder.id}`);
  };

  const handleClearSelection = () => {
    setSelectedCards([]);
    setShowAddToBinder(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Card Browser
              </h1>
              <p className="text-slate-300">
                Search and browse Pokemon cards to add to your collection
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {currentBinder && (
                <div className="text-right">
                  <div className="text-white font-medium">
                    {currentBinder.metadata.name}
                  </div>
                  <div className="text-slate-300 text-sm">Current Binder</div>
                </div>
              )}

              <button
                onClick={handleGoToBinder}
                disabled={!currentBinder}
                className={`
                  px-4 py-2 rounded-lg transition-colors
                  ${
                    currentBinder
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-600 text-slate-400 cursor-not-allowed"
                  }
                `}
              >
                View Binder
              </button>
            </div>
          </div>

          {/* Selection toolbar */}
          {selectedCards.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-slate-800 font-medium">
                    {selectedCards.length} card
                    {selectedCards.length > 1 ? "s" : ""} selected
                  </div>

                  <div className="flex -space-x-2">
                    {selectedCards.slice(0, 5).map((card, index) => (
                      <div
                        key={card.id}
                        className="w-8 h-10 bg-slate-200 rounded border-2 border-white shadow-sm overflow-hidden"
                        title={card.name}
                      >
                        {card.imageSmall && (
                          <img
                            src={card.imageSmall}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                    {selectedCards.length > 5 && (
                      <div className="w-8 h-10 bg-slate-300 rounded border-2 border-white shadow-sm flex items-center justify-center">
                        <span className="text-slate-600 text-xs font-medium">
                          +{selectedCards.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleClearSelection}
                    className="px-3 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleAddToBinder}
                    disabled={!currentBinder}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors
                      ${
                        currentBinder
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }
                    `}
                  >
                    Add to{" "}
                    {currentBinder ? currentBinder.metadata.name : "Binder"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current binder info */}
          {!currentBinder && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div>
                  <div className="text-yellow-800 font-medium">
                    No Binder Selected
                  </div>
                  <div className="text-yellow-700 text-sm">
                    Create or select a binder to start adding cards to your
                    collection.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Search Component */}
        <CardSearch
          onCardSelect={handleCardSelect}
          selectedCards={selectedCards}
        />
      </div>
    </div>
  );
};

export default CardBrowserPage;
