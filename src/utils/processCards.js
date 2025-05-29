/**
 * Process raw card data into displayable format
 * Extracted from useCards hook to be reusable in React Query
 */
export const processCards = (rawCards, options = {}) => {
  const { showReverseHolos = false, sortDirection = "asc" } = options;

  if (!rawCards || !Array.isArray(rawCards)) {
    return [];
  }

  let processedCards = [...rawCards];

  // Add reverse holo versions for common and uncommon cards if enabled
  if (showReverseHolos) {
    const reverseHoloCards = rawCards
      .filter((card) =>
        ["Common", "Uncommon", "Rare", "Rare Holo"].includes(card.rarity)
      )
      .map((card) => ({
        ...card,
        id: `${card.id}_reverse`,
        isReverseHolo: true,
      }));
    processedCards = [...processedCards, ...reverseHoloCards];
  }

  // Sort cards based on number and reverse holo status
  processedCards.sort((a, b) => {
    // Extract base number and any letter suffix
    const [, aBase, aLetter] = a.number.match(/(\d+)([a-zA-Z])?/) || [];
    const [, bBase, bLetter] = b.number.match(/(\d+)([a-zA-Z])?/) || [];

    const aNum = parseInt(aBase);
    const bNum = parseInt(bBase);

    if (aNum === bNum) {
      // First sort by letter suffix (no letter comes before letters)
      if ((!aLetter && bLetter) || (aLetter && !bLetter)) {
        return !aLetter ? -1 : 1;
      }
      if (aLetter !== bLetter) {
        return (aLetter || "").localeCompare(bLetter || "");
      }
      // If numbers and letters are the same, reverse holos come after regular cards
      return (a.isReverseHolo ? 1 : 0) - (b.isReverseHolo ? 1 : 0);
    }

    return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
  });

  return processedCards;
};
