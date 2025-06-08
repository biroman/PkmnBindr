/**
 * POSITION TRACKING IN BINDER SCHEMA
 *
 * The optimized schema tracks card positions in a robust way that supports:
 * - Exact slot positioning for binder pages
 * - Efficient updates and moves
 * - Grid size changes without data loss
 * - Sparse storage (no empty slots stored)
 */

// CURRENT APPROACH - Position tracking with sparse objects
const currentApproach = {
  cards: {
    // Key = slot identifier, Value = card data with position
    slot_0: {
      cardId: "base1-4",
      position: 0, // Redundant but useful for validation
      addedAt: "2024-01-15T10:35:22.789Z",
      notes: "",
      condition: "mint",
    },
    slot_1: {
      cardId: "xy12-12",
      position: 1,
      addedAt: "2024-01-15T11:15:33.456Z",
      notes: "First Edition",
      condition: "near_mint",
    },
    slot_4: {
      cardId: "sm35-1",
      position: 4, // Position 4 = page 1, slot 4 (in 3x3 grid)
      addedAt: "2024-01-15T14:22:15.456Z",
      notes: "",
      condition: "mint",
    },
    // Positions 2, 3, 5, 6, 7, 8 are empty - no storage needed!
  },
};

// EVEN BETTER APPROACH - Remove redundant position field
const optimizedApproach = {
  cards: {
    // Position is encoded in the key - no redundant data
    0: {
      // Position 0
      cardId: "base1-4",
      addedAt: "2024-01-15T10:35:22.789Z",
      notes: "",
      condition: "mint",
    },
    1: {
      // Position 1
      cardId: "xy12-12",
      addedAt: "2024-01-15T11:15:33.456Z",
      notes: "First Edition",
      condition: "near_mint",
    },
    4: {
      // Position 4
      cardId: "sm35-1",
      addedAt: "2024-01-15T14:22:15.456Z",
      notes: "",
      condition: "mint",
    },
  },
};

/**
 * POSITION CALCULATION UTILITIES
 */

// Convert position to page and slot within page
const getPageAndSlot = (position, gridSize = "3x3") => {
  const gridConfig = getGridConfig(gridSize);
  const cardsPerPage = gridConfig.total;

  const pageIndex = Math.floor(position / cardsPerPage);
  const slotInPage = position % cardsPerPage;
  const row = Math.floor(slotInPage / gridConfig.cols);
  const col = slotInPage % gridConfig.cols;

  return {
    pageIndex, // Which page (0-based)
    slotInPage, // Slot within the page (0-based)
    row, // Row within the page (0-based)
    col, // Column within the page (0-based)
    globalPosition: position,
  };
};

// Convert page and slot back to global position
const getGlobalPosition = (pageIndex, slotInPage, gridSize = "3x3") => {
  const gridConfig = getGridConfig(gridSize);
  const cardsPerPage = gridConfig.total;

  return pageIndex * cardsPerPage + slotInPage;
};

// Get all cards for a specific page
const getCardsForPage = (binder, pageIndex, gridSize = "3x3") => {
  const gridConfig = getGridConfig(gridSize);
  const cardsPerPage = gridConfig.total;
  const startPosition = pageIndex * cardsPerPage;
  const endPosition = startPosition + cardsPerPage;

  const pageCards = [];

  // Create array with nulls for empty slots
  for (let i = 0; i < cardsPerPage; i++) {
    const globalPosition = startPosition + i;
    const cardData = binder.cards[globalPosition.toString()];

    if (cardData) {
      // Get full card details from cache
      const fullCard = getCardFromCache(cardData.cardId);
      pageCards[i] = {
        ...fullCard,
        // Add binder-specific metadata
        binderMetadata: cardData,
      };
    } else {
      pageCards[i] = null; // Empty slot
    }
  }

  return pageCards;
};

/**
 * POSITION OPERATIONS
 */

// Move card from one position to another
const moveCard = (binder, fromPosition, toPosition) => {
  const fromKey = fromPosition.toString();
  const toKey = toPosition.toString();

  const cardData = binder.cards[fromKey];
  if (!cardData) return binder; // No card to move

  const updatedBinder = {
    ...binder,
    cards: {
      ...binder.cards,
      [toKey]: cardData,
      [fromKey]: undefined, // Remove from old position
    },
    version: binder.version + 1,
    lastModified: new Date().toISOString(),
  };

  // Clean up undefined values
  delete updatedBinder.cards[fromKey];

  return updatedBinder;
};

// Add card to specific position
const addCardToPosition = (binder, cardId, position, metadata = {}) => {
  const positionKey = position.toString();

  const cardEntry = {
    cardId,
    addedAt: new Date().toISOString(),
    addedBy: binder.ownerId,
    notes: metadata.notes || "",
    condition: metadata.condition || "mint",
    quantity: metadata.quantity || 1,
    isProtected: metadata.isProtected || false,
  };

  return {
    ...binder,
    cards: {
      ...binder.cards,
      [positionKey]: cardEntry,
    },
    version: binder.version + 1,
    lastModified: new Date().toISOString(),
  };
};

// Remove card from position
const removeCardFromPosition = (binder, position) => {
  const positionKey = position.toString();
  const updatedCards = { ...binder.cards };
  delete updatedCards[positionKey];

  return {
    ...binder,
    cards: updatedCards,
    version: binder.version + 1,
    lastModified: new Date().toISOString(),
  };
};

// Find next empty position
const findNextEmptyPosition = (binder, startFrom = 0) => {
  let position = startFrom;
  while (binder.cards[position.toString()]) {
    position++;
  }
  return position;
};

// Get all occupied positions
const getOccupiedPositions = (binder) => {
  return Object.keys(binder.cards)
    .map((pos) => parseInt(pos))
    .sort((a, b) => a - b);
};

/**
 * GRID SIZE CHANGE HANDLING
 */

// When user changes grid size, positions may need adjustment
const handleGridSizeChange = (binder, newGridSize) => {
  const oldGridConfig = getGridConfig(binder.settings.gridSize);
  const newGridConfig = getGridConfig(newGridSize);

  // If new grid has fewer cards per page, some cards might overflow
  if (newGridConfig.total < oldGridConfig.total) {
    // Strategy 1: Compact cards (move overflow to next pages)
    return compactCards(binder, newGridSize);
  }

  // If new grid has more cards per page, cards stay in same positions
  return {
    ...binder,
    settings: {
      ...binder.settings,
      gridSize: newGridSize,
    },
    version: binder.version + 1,
    lastModified: new Date().toISOString(),
  };
};

// Compact cards when grid size decreases
const compactCards = (binder, newGridSize) => {
  const newGridConfig = getGridConfig(newGridSize);
  const positions = getOccupiedPositions(binder);
  const newCards = {};

  positions.forEach((oldPosition, index) => {
    const cardData = binder.cards[oldPosition.toString()];
    newCards[index.toString()] = cardData;
  });

  return {
    ...binder,
    cards: newCards,
    settings: {
      ...binder.settings,
      gridSize: newGridSize,
    },
    version: binder.version + 1,
    lastModified: new Date().toISOString(),
  };
};

/**
 * EXAMPLE USAGE
 */

const exampleUsage = {
  // Position 4 in a 3x3 grid = Page 0, Row 1, Col 1
  position4In3x3: getPageAndSlot(4, "3x3"),
  // Result: { pageIndex: 0, slotInPage: 4, row: 1, col: 1, globalPosition: 4 }

  // Position 10 in a 3x3 grid = Page 1, Row 0, Col 1
  position10In3x3: getPageAndSlot(10, "3x3"),
  // Result: { pageIndex: 1, slotInPage: 1, row: 0, col: 1, globalPosition: 10 }

  // Position 15 in a 4x4 grid = Page 0, Row 3, Col 3
  position15In4x4: getPageAndSlot(15, "4x4"),
  // Result: { pageIndex: 0, slotInPage: 15, row: 3, col: 3, globalPosition: 15 }
};

/**
 * BENEFITS OF THIS POSITION SYSTEM:
 *
 * 1. EXACT POSITIONING: Every card knows its exact slot
 * 2. SPARSE STORAGE: Empty slots don't take up space
 * 3. EFFICIENT MOVES: O(1) position changes
 * 4. PAGE CALCULATION: Easy conversion to binder pages
 * 5. GRID FLEXIBILITY: Handles grid size changes gracefully
 * 6. FIREBASE FRIENDLY: Efficient partial updates
 * 7. CONFLICT RESOLUTION: Position conflicts are easily detected
 */

export {
  getPageAndSlot,
  getGlobalPosition,
  getCardsForPage,
  moveCard,
  addCardToPosition,
  removeCardFromPosition,
  findNextEmptyPosition,
  getOccupiedPositions,
  handleGridSizeChange,
  exampleUsage,
};
