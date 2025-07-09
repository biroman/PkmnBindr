import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import { X } from "lucide-react";
import BinderContainer from "../components/binder/BinderContainer";
import { useRules } from "../contexts/RulesContext";
import { SelectionProvider } from "../contexts/selection";

/**
 * BinderPage - Slim orchestrator component for binder editing
 * Handles: URL routing, security checks, data fetching, error handling
 * Delegates: All binder display logic to BinderContainer
 */
const BinderPage = () => {
  const navigate = useNavigate();
  const { id: binderId } = useParams();
  const { currentBinder, binders, selectBinder, canAccessBinder } =
    useBinderContext();

  // Auto-select binder based on URL parameter with security check
  useEffect(() => {
    if (binderId && binders.length > 0) {
      const targetBinder = binders.find((binder) => binder.id === binderId);
      if (targetBinder) {
        // Security check: Verify user can access this binder
        if (!canAccessBinder(binderId)) {
          console.warn(`Access denied: User cannot access binder ${binderId}`);
          toast.error("Access denied: This binder belongs to another user");
          navigate("/binders", { replace: true });
          return;
        }

        // Only select if it's not already the current binder
        if (!currentBinder || currentBinder.id !== binderId) {
          selectBinder(targetBinder);
        }
      } else {
        // Binder not found, redirect to binders page
        navigate("/binders", { replace: true });
      }
    }
  }, [
    binderId,
    binders,
    currentBinder,
    selectBinder,
    navigate,
    canAccessBinder,
  ]);

  // Error handler for binder operations
  const handleError = (error) => {
    console.error("Binder operation failed:", error);
    toast.error(error.message || "An error occurred");
  };

  // Selected card state for modal view
  const [selectedCard, setSelectedCard] = useState(null);

  // Navigation handlers
  const handleCardClick = (card) => {
    // Toggle modal
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleCardDelete = (card, position) => {
    console.log("Card deleted:", card, "at position:", position);
    // Handled by BinderContainer
  };

  const handlePageChange = (pageIndex) => {
    console.log("Page changed to:", pageIndex);
    // Optional: Update URL with page parameter in the future
  };

  // Don't render if no binder selected
  if (!currentBinder) {
    return (
      <div className="h-[calc(100vh-65px)] bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100 text-center">
          <h2 className="text-2xl font-bold mb-4">No Binder Selected</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create or select a binder to start organizing your Pokemon cards
          </p>
          <div className="space-x-4">
            <Button
              onClick={() => navigate("/binders")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Manage Binders
            </Button>
            <Button
              onClick={() => navigate("/browse")}
              className="bg-green-600 hover:bg-green-700"
            >
              Browse Cards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SelectionProvider>
      <BinderContainer
        binder={currentBinder}
        mode="edit"
        onCardClick={handleCardClick}
        onCardDelete={handleCardDelete}
        onPageChange={handlePageChange}
        onError={handleError}
      />

      {/* Card Preview Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCard(null);
            }
          }}
        >
          <div className="mb-4">
            {(selectedCard.image || selectedCard.imageSmall) && (
              <img
                src={selectedCard.image || selectedCard.imageSmall}
                alt={selectedCard.name}
                className="cursor-pointer shadow-2xl rounded-lg"
                onClick={() => setSelectedCard(null)}
                style={{ maxHeight: "60vh" }}
              />
            )}
          </div>

          <div
            className="bg-card-background rounded-2xl max-w-lg w-full shadow-2xl cursor-pointer"
            onClick={() => setSelectedCard(null)}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {selectedCard.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCard(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Set</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedCard.set?.name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Number</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedCard.number || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rarity</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedCard.rarity || "Unknown"}
                </span>
              </div>
              {selectedCard.artist && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Artist
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedCard.artist}
                  </span>
                </div>
              )}
              {selectedCard.types && selectedCard.types.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Types
                  </span>
                  <div className="flex gap-1">
                    {selectedCard.types.map((type, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 pb-4">
              Click outside or the X to close
            </div>
          </div>
        </div>
      )}
    </SelectionProvider>
  );
};

export default BinderPage;
