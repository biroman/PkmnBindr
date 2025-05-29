import { useState, useEffect, useCallback } from "react";
import { parseCardList } from "../utils/parseCardList";
import {
  getMissingCards,
  saveMissingCards,
  saveBinder,
} from "../utils/storageUtils";

const useMissingCards = () => {
  const [missingCards, setMissingCards] = useState("");
  const [parsedMissingCards, setParsedMissingCards] = useState(new Set());

  // Load missing cards when set/binder changes
  const loadMissingCards = useCallback((set, currentBinder) => {
    if (set) {
      const savedMissingCards = getMissingCards(set.id);
      setParsedMissingCards(savedMissingCards);
      const missingCardsText = Array.from(savedMissingCards)
        .map((number) => `#${number}`)
        .join("\n");
      setMissingCards(missingCardsText);
    } else if (currentBinder?.binderType === "custom") {
      // Load missing cards for custom binder
      const savedMissingCards = new Set(currentBinder.missingCards || []);
      setParsedMissingCards(savedMissingCards);
    } else {
      setMissingCards("");
      setParsedMissingCards(new Set());
    }
  }, []); // Empty dependency array since it only uses stable setState functions

  const handleMissingCardsChange = (
    e,
    set,
    rawCards,
    currentBinder,
    updateBinderState
  ) => {
    const text = e.target.value;
    setMissingCards(text);

    // Only parse if we have a set loaded
    if (set && rawCards.length > 0) {
      const parsed = parseCardList(text, rawCards);
      setParsedMissingCards(parsed);

      // Automatically save missing cards to storage
      saveMissingCards(set.id, parsed);

      // Update the current binder's missing cards data
      if (currentBinder) {
        const updatedBinder = {
          ...currentBinder,
          missingCards: {
            ...currentBinder.missingCards,
            [set.id]: Array.from(parsed),
          },
          updatedAt: new Date().toISOString(),
        };

        // Save the updated binder
        updateBinderState(updatedBinder);
      }
    } else {
      // If no set is loaded, just parse without card reference
      const parsed = parseCardList(text, []);
      setParsedMissingCards(parsed);
    }
  };

  const handleToggleCardStatus = (
    e,
    card,
    currentBinder,
    set,
    updateBinderState
  ) => {
    e.stopPropagation(); // Prevent opening the card modal

    // Generate the appropriate card ID based on binder type and whether it's a reverse holo
    const cardId =
      currentBinder?.binderType === "custom"
        ? card.isReverseHolo
          ? `${card.positionId || card.id}_reverse`
          : card.positionId || card.id
        : card.isReverseHolo
        ? `${card.number}_reverse`
        : card.number;

    const newMissingCards = new Set(parsedMissingCards);

    if (newMissingCards.has(cardId)) {
      // Remove card from missing cards (mark as collected)
      newMissingCards.delete(cardId);
    } else {
      // Add card to missing cards (mark as missing)
      newMissingCards.add(cardId);
    }

    setParsedMissingCards(newMissingCards);

    // Update the text representation for set-based binders
    if (currentBinder?.binderType !== "custom") {
      const missingCardsText = Array.from(newMissingCards)
        .map((number) => `#${number}`)
        .join("\n");
      setMissingCards(missingCardsText);
    }

    // Save to storage
    if (currentBinder?.binderType === "custom") {
      // For custom binders, save missing cards to the binder data
      const updatedBinder = {
        ...currentBinder,
        missingCards: Array.from(newMissingCards),
        updatedAt: new Date().toISOString(),
      };

      updateBinderState(updatedBinder);
    } else if (set) {
      // For set-based binders, save to set-specific storage
      saveMissingCards(set.id, newMissingCards);

      // Update the current binder's missing cards data
      if (currentBinder) {
        const updatedBinder = {
          ...currentBinder,
          missingCards: {
            ...currentBinder.missingCards,
            [set.id]: Array.from(newMissingCards),
          },
          updatedAt: new Date().toISOString(),
        };

        updateBinderState(updatedBinder);
      }
    }

    return {
      success: true,
      newMissingCards,
    };
  };

  const calculateProgress = (cards, currentBinder) => {
    const totalCards = cards.length;
    const missingCount = parsedMissingCards.size;

    // For custom binders, show actual card count and missing cards
    const isCustomBinder = currentBinder?.binderType === "custom";
    const actualCardsInBinder = isCustomBinder
      ? cards.filter((card) => card !== null).length
      : totalCards;

    const collectedCount = isCustomBinder
      ? actualCardsInBinder - missingCount // Subtract missing cards from actual cards
      : totalCards - missingCount; // Traditional missing cards calculation for sets

    const progressPercentage = isCustomBinder
      ? actualCardsInBinder > 0
        ? (collectedCount / actualCardsInBinder) * 100
        : 100 // Show 100% if no cards added yet
      : totalCards > 0
      ? (collectedCount / totalCards) * 100
      : 0;

    return {
      totalCards,
      missingCount,
      collectedCount,
      progressPercentage,
      isCustomBinder,
      actualCardsInBinder,
    };
  };

  const resetMissingCards = () => {
    setMissingCards("");
    setParsedMissingCards(new Set());
  };

  return {
    // State
    missingCards,
    parsedMissingCards,

    // Actions
    loadMissingCards,
    handleMissingCardsChange,
    handleToggleCardStatus,
    calculateProgress,
    resetMissingCards,

    // Setters
    setMissingCards,
    setParsedMissingCards,
  };
};

export default useMissingCards;
