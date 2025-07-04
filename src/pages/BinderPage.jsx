import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import BinderContainer from "../components/binder/BinderContainer";
import { useRules } from "../contexts/RulesContext";
import useBinderDimensions from "../hooks/useBinderDimensions";

/**
 * BinderPage - Slim orchestrator component for binder editing
 * Handles: URL routing, security checks, data fetching, error handling
 * Delegates: All binder display logic to BinderContainer
 */
const BinderPage = () => {
  const navigate = useNavigate();
  const { id: binderId } = useParams();
  const { currentBinder, binders, selectBinder, canAccessBinder, moveCard } =
    useBinderContext();

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const binderDimensions = useBinderDimensions(
    currentBinder?.settings?.gridSize
  );

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

  // Clear selection when binder changes
  useEffect(() => {
    setSelectedCards(new Set());
    setIsSelectionMode(false);
    setCurrentPageIndex(0);
  }, [currentBinder?.id]);

  // Selection handlers
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedCards(new Set());
    }
  };

  const handleCardSelect = (card, position) => {
    if (!isSelectionMode) return;

    const selectionKey = `${position.pageIndex}-${position.slotIndex}`;
    const newSelection = new Set(selectedCards);

    if (newSelection.has(selectionKey)) {
      newSelection.delete(selectionKey);
    } else {
      newSelection.add(selectionKey);
    }

    setSelectedCards(newSelection);
  };

  const handleSelectAll = () => {
    if (!currentBinder?.cards || !binderDimensions) return;

    const newSelection = new Set();
    const slotsPerPage = binderDimensions.total;

    Object.entries(currentBinder.cards).forEach(([positionKey, card]) => {
      if (card) {
        const globalIndex = Number(positionKey);
        const pageOfCard = Math.floor(globalIndex / slotsPerPage);

        if (pageOfCard === currentPageIndex) {
          const slotIndex = globalIndex % slotsPerPage;
          // The key must be in the format `pageIndex-slotIndex` for bulk operations
          const selectionKey = `${currentPageIndex}-${slotIndex}`;
          newSelection.add(selectionKey);
        }
      }
    });

    setSelectedCards(newSelection);
  };

  const handleDeselectAll = () => {
    setSelectedCards(new Set());
  };

  const handleBulkMove = async (targetPosition) => {
    if (selectedCards.size === 0 || !currentBinder || !binderDimensions) return;

    try {
      const slotsPerPage = binderDimensions.total;
      // Convert selection keys to actual positions and get cards
      const selectedPositions = Array.from(selectedCards)
        .map((selectionKey) => {
          const [pageIndex, slotIndex] = selectionKey.split("-").map(Number);
          // Calculate global position from page and slot
          return pageIndex * slotsPerPage + slotIndex;
        })
        .sort((a, b) => a - b); // Sort to maintain order

      // Move cards starting from target position
      for (let i = 0; i < selectedPositions.length; i++) {
        const fromPosition = selectedPositions[i];
        const toPosition = targetPosition + i;

        // Avoid moving to the same position
        if (fromPosition !== toPosition) {
          await moveCard(currentBinder.id, fromPosition, toPosition);
        }
      }

      // Clear selection after successful move
      setSelectedCards(new Set());
      toast.success(`Moved ${selectedPositions.length} cards`);
    } catch (error) {
      console.error("Failed to move selected cards:", error);
      toast.error("Failed to move selected cards");
    }
  };

  const handleBulkDelete = () => {
    if (selectedCards.size === 0) return;

    console.log("Deleting selected cards:", Array.from(selectedCards));
    // This will be handled by the BinderContainer's bulk delete logic

    // Clear selection after delete
    setSelectedCards(new Set());
  };

  // Error handler for binder operations
  const handleError = (error) => {
    console.error("Binder operation failed:", error);
    toast.error(error.message || "An error occurred");
  };

  // Navigation handlers
  const handleCardClick = (card, slotIndex) => {
    if (isSelectionMode) {
      // In selection mode, clicking selects/deselects the card
      handleCardSelect(card, { pageIndex: currentPageIndex, slotIndex });
    } else {
      console.log("Card clicked:", card, "at slot:", slotIndex);
      // TODO: Future enhancement - card details modal
    }
  };

  const handleCardDelete = (card, position) => {
    console.log("Card deleted:", card, "at position:", position);
    // Handled by BinderContainer
  };

  const handlePageChange = (pageIndex) => {
    console.log("Page changed to:", pageIndex);
    // Clear selection when changing pages to avoid confusion
    setCurrentPageIndex(pageIndex);
    setSelectedCards(new Set());
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
    <BinderContainer
      binder={currentBinder}
      mode="edit"
      onCardClick={handleCardClick}
      onCardDelete={handleCardDelete}
      onPageChange={handlePageChange}
      onError={handleError}
      // Selection mode props
      isSelectionMode={isSelectionMode}
      selectedCards={selectedCards}
      onToggleSelectionMode={handleToggleSelectionMode}
      onCardSelect={handleCardSelect}
      onSelectAll={handleSelectAll}
      onDeselectAll={handleDeselectAll}
      onBulkMove={handleBulkMove}
      onBulkDelete={handleBulkDelete}
    />
  );
};

export default BinderPage;
