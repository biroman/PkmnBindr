/**
 * Binder Sorting Utilities
 * Provides robust sorting functionality for card collections in binders
 */

// Rarity hierarchy for consistent sorting
const RARITY_HIERARCHY = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  "Rare Holo": 4,
  "Rare Holo EX": 5,
  "Rare Holo GX": 6,
  "Rare Holo V": 7,
  "Rare Holo VMAX": 8,
  "Rare Holo VSTAR": 9,
  "Rare Ultra": 10,
  "Rare Secret": 11,
  "Rare Rainbow": 12,
  Promo: 13,
  "Amazing Rare": 14,
  "Rare Radiant": 15,
  "Special Illustration Rare": 16,
  "Hyper Rare": 17,
  "Illustration Rare": 18,
  "Ultra Rare": 19,
};

// Default type hierarchy for consistent sorting (based on traditional color wheel + logical grouping)
const DEFAULT_TYPE_HIERARCHY = {
  Fire: 1,
  Water: 2,
  Grass: 3,
  Lightning: 4,
  Psychic: 5,
  Fighting: 6,
  Darkness: 7,
  Metal: 8,
  Fairy: 9,
  Dragon: 10,
  Colorless: 11,
};

// Store for custom type order (can be persisted in localStorage)
let customTypeOrder = null;

/**
 * Get the current type hierarchy (custom or default)
 */
const getTypeHierarchy = () => {
  if (customTypeOrder) {
    return customTypeOrder;
  }

  // Try to load from localStorage
  try {
    const stored = localStorage.getItem("pokemon_type_order");
    if (stored) {
      customTypeOrder = JSON.parse(stored);
      return customTypeOrder;
    }
  } catch (error) {
    console.warn("Failed to load custom type order from localStorage:", error);
  }

  return DEFAULT_TYPE_HIERARCHY;
};

/**
 * Set custom type order
 */
export const setCustomTypeOrder = (typeOrder) => {
  customTypeOrder = typeOrder;

  // Save to localStorage
  try {
    localStorage.setItem("pokemon_type_order", JSON.stringify(typeOrder));
  } catch (error) {
    console.warn("Failed to save custom type order to localStorage:", error);
  }
};

/**
 * Reset to default type order
 */
export const resetTypeOrder = () => {
  customTypeOrder = null;
  try {
    localStorage.removeItem("pokemon_type_order");
  } catch (error) {
    console.warn(
      "Failed to remove custom type order from localStorage:",
      error
    );
  }
};

/**
 * Get all known Pokemon types in current order
 */
export const getAllTypes = () => {
  const hierarchy = getTypeHierarchy();
  return Object.keys(hierarchy).sort((a, b) => hierarchy[a] - hierarchy[b]);
};

/**
 * Get type display info with colors and icon path
 */
export const getTypeDisplayInfo = (typeName) => {
  const typeColors = {
    Fire: { bg: "#FF6B6B", text: "#FFFFFF" },
    Water: { bg: "#4ECDC4", text: "#FFFFFF" },
    Grass: { bg: "#95E1D3", text: "#2C3E50" },
    Lightning: { bg: "#F7DC6F", text: "#2C3E50" },
    Psychic: { bg: "#BB8FCE", text: "#FFFFFF" },
    Fighting: { bg: "#E67E22", text: "#FFFFFF" },
    Darkness: { bg: "#34495E", text: "#FFFFFF" },
    Metal: { bg: "#85929E", text: "#FFFFFF" },
    Fairy: { bg: "#F8BBD9", text: "#2C3E50" },
    Dragon: { bg: "#8E44AD", text: "#FFFFFF" },
    Colorless: { bg: "#BDC3C7", text: "#2C3E50" },
  };

  // Firebase Storage URLs for type icons
  const firebaseIcons = {
    Fire: "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Ffire.png?alt=media&token=119c7ac9-4d47-45d1-bad8-3b3a47f820a1",
    Water:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fwater.png?alt=media&token=8f7807c0-9bfa-4a81-babd-efb20e4d3249",

    Grass:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fgrass.png?alt=media&token=f4544519-c71c-4402-9e5a-7237c7cc4b05",
    Lightning:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Flightning.png?alt=media&token=4f0be5f8-28b2-43b7-9f98-6d1efccbe9f4",
    Psychic:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fpsychic.png?alt=media&token=3da11d2e-eb12-493b-bb8e-cfb1efdfb406",
    Fighting:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Ffighting.png?alt=media&token=1744a296-cc84-4a7e-b86d-675ac3c9a59c",
    Darkness:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fdarkness.png?alt=media&token=593e48ed-2605-4dfe-81b2-77b013bfde41",
    Metal:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fmetal.png?alt=media&token=9f790698-dd2b-418b-ab89-17f583fcb7af",
    Fairy:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Ffairy.png?alt=media&token=efb79e77-8ad4-4cee-ac53-6ba79b3257eb",
    Dragon:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fdragon.png?alt=media&token=bb607aaa-2cac-40f2-b010-6b6a4eed9de6",
    Colorless:
      "https://firebasestorage.googleapis.com/v0/b/pkmnbindr.firebasestorage.app/o/binder-sort-type-icons%2Fcolorless.png?alt=media&token=f4e0b98e-5a40-49db-8147-fb844269a413",
  };

  return {
    name: typeName,
    colors: typeColors[typeName] || { bg: "#95A5A6", text: "#FFFFFF" },
    iconPath: firebaseIcons[typeName] || `/icons/${typeName.toLowerCase()}.png`, // Firebase URL with local fallback
  };
};

/**
 * Parse card number for proper numerical sorting
 * Handles various formats like "001", "1", "1a", "SWSH001", etc.
 */
const parseCardNumber = (number) => {
  if (!number) return { numeric: 999999, suffix: "zzz", original: "" };

  const str = number.toString().toLowerCase();

  // Extract numeric part and suffix
  const match = str.match(/^([a-z]*?)(\d+)([a-z]*?)$/);
  if (match) {
    const [, prefix, numeric, suffix] = match;
    return {
      prefix: prefix || "",
      numeric: parseInt(numeric, 10),
      suffix: suffix || "",
      original: str,
    };
  }

  // Fallback for non-standard formats
  return {
    prefix: "",
    numeric: 999999,
    suffix: str,
    original: str,
  };
};

/**
 * Get rarity weight for sorting
 */
const getRarityWeight = (rarity) => {
  if (!rarity) return 999;
  return RARITY_HIERARCHY[rarity] || 999;
};

/**
 * Get type weight for sorting
 */
const getTypeWeight = (types) => {
  if (!types || !Array.isArray(types) || types.length === 0) return 999;
  // Use the first type for sorting
  const hierarchy = getTypeHierarchy();
  return hierarchy[types[0]] || 999;
};

/**
 * Sort cards by set name, then by card number within set
 */
const sortBySet = (cardsArray, direction = "asc") => {
  return cardsArray.sort((a, b) => {
    const aSet = a.cardData?.set?.name || "";
    const bSet = b.cardData?.set?.name || "";

    // First sort by set name
    const setComparison = aSet.localeCompare(bSet);
    let comparison = setComparison;

    // Then sort by card number within the same set
    const aNumber = parseCardNumber(a.cardData?.number);
    const bNumber = parseCardNumber(b.cardData?.number);

    // Compare prefix first
    if (aNumber.prefix !== bNumber.prefix) {
      comparison = aNumber.prefix.localeCompare(bNumber.prefix);
    } else if (aNumber.numeric !== bNumber.numeric) {
      comparison = aNumber.numeric - bNumber.numeric;
    } else {
      comparison = aNumber.suffix.localeCompare(bNumber.suffix);
    }

    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Sort cards by rarity hierarchy
 */
const sortByRarity = (cardsArray, direction = "asc") => {
  return cardsArray.sort((a, b) => {
    const aRarity = a.cardData?.rarity || "";
    const bRarity = b.cardData?.rarity || "";

    const aWeight = getRarityWeight(aRarity);
    const bWeight = getRarityWeight(bRarity);

    let comparison = 0;
    if (aWeight !== bWeight) {
      comparison = aWeight - bWeight;
    } else {
      // Secondary sort by name if rarity is the same
      const aName = a.cardData?.name || "";
      const bName = b.cardData?.name || "";
      comparison = aName.localeCompare(bName);
    }

    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Sort cards by card number across all sets
 */
const sortByNumber = (cardsArray, direction = "asc") => {
  return cardsArray.sort((a, b) => {
    const aNumber = parseCardNumber(a.cardData?.number);
    const bNumber = parseCardNumber(b.cardData?.number);

    let comparison = 0;
    // Compare prefix first
    if (aNumber.prefix !== bNumber.prefix) {
      comparison = aNumber.prefix.localeCompare(bNumber.prefix);
    } else if (aNumber.numeric !== bNumber.numeric) {
      // Then numeric part
      comparison = aNumber.numeric - bNumber.numeric;
    } else {
      // Finally suffix
      comparison = aNumber.suffix.localeCompare(bNumber.suffix);
    }

    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Sort cards by Pokemon type
 */
const sortByType = (cardsArray, direction = "asc") => {
  return cardsArray.sort((a, b) => {
    const aTypes = a.cardData?.types || [];
    const bTypes = b.cardData?.types || [];

    const aWeight = getTypeWeight(aTypes);
    const bWeight = getTypeWeight(bTypes);

    let comparison = 0;
    if (aWeight !== bWeight) {
      comparison = aWeight - bWeight;
    } else {
      // Secondary sort by number if type is the same
      const aNumber = parseCardNumber(a.cardData?.number);
      const bNumber = parseCardNumber(b.cardData?.number);
      if (aNumber.numeric !== bNumber.numeric) {
        comparison = aNumber.numeric - bNumber.numeric;
      } else {
        comparison = aNumber.suffix.localeCompare(bNumber.suffix);
      }
    }

    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Sort cards by name alphabetically
 */
const sortByName = (cardsArray, direction = "asc") => {
  return cardsArray.sort((a, b) => {
    const aName = a.cardData?.name || "";
    const bName = b.cardData?.name || "";
    const comparison = aName.localeCompare(bName);
    return direction === "asc" ? comparison : -comparison;
  });
};

/**
 * Main sorting function
 * @param {object} cards - The cards object from the binder
 * @param {string} sortBy - The sort key (e.g., 'rarity', 'number')
 * @param {string} sortDirection - The sort direction ('asc' or 'desc')
 * @returns {object} - The sorted cards object
 */
export const sortCards = (cards, sortBy, sortDirection = "asc") => {
  if (!cards || typeof cards !== "object") {
    console.warn("sortCards: cards parameter is not a valid object", cards);
    return {};
  }

  const cardsArray = Object.entries(cards).map(([position, cardData]) => ({
    ...cardData,
    originalPosition: parseInt(position, 10),
  }));

  let sortedArray;
  switch (sortBy) {
    case "set":
      sortedArray = sortBySet(cardsArray, sortDirection); // Pass direction
      break;
    case "rarity":
      sortedArray = sortByRarity(cardsArray, sortDirection); // Pass direction
      break;
    case "number":
      sortedArray = sortByNumber(cardsArray, sortDirection); // Pass direction
      break;
    case "type":
      sortedArray = sortByType(cardsArray, sortDirection); // Pass direction
      break;
    case "name":
      sortedArray = sortByName(cardsArray, sortDirection); // Pass direction
      break;
    case "custom":
    default:
      // For custom, just sort by original position to maintain order
      sortedArray = cardsArray.sort(
        (a, b) => a.originalPosition - b.originalPosition
      );
      break;
  }

  // Reconstruct the cards object with new positions (0-indexed)
  const sortedCardsObject = {};
  sortedArray.forEach((card, index) => {
    // eslint-disable-next-line no-unused-vars
    const { originalPosition, ...cardData } = card; // Omit originalPosition
    sortedCardsObject[index.toString()] = cardData;
  });

  return sortedCardsObject;
};

/**
 * Get available sort options with display names
 */
export const getSortOptions = () => [
  { value: "custom", label: "Custom Order", icon: "Target" },
  { value: "set", label: "By Set", icon: "BookOpen" },
  { value: "rarity", label: "By Rarity", icon: "Gem" },
  { value: "number", label: "By Card Number", icon: "Hash" },
  { value: "type", label: "By Type", icon: "Tag" },
  { value: "name", label: "By Name (A-Z)", icon: "SortAsc" },
];

/**
 * Validate sort option
 */
export const isValidSortOption = (sortBy) => {
  const validOptions = getSortOptions().map((option) => option.value);
  return validOptions.includes(sortBy);
};

/**
 * Get display info for a given sort key
 * @param {string} sortBy - The sort key
 * @returns {object} - { label, icon }
 */
export const getSortDisplayInfo = (sortBy) => {
  const options = getSortOptions();
  return (
    options.find((option) => option.value === sortBy) || {
      label: "Custom Order",
      icon: "Target",
    }
  );
};

/**
 * Get display info for a given sort key and direction
 * @param {string} sortBy - The sort key
 * @param {string} sortDirection - The sort direction ('asc' or 'desc')
 * @returns {object} - { label, icon }
 */
export const getSortDirectionInfo = (sortBy, sortDirection) => {
  const isAsc = sortDirection === "asc";
  switch (sortBy) {
    case "rarity":
    case "number":
      return {
        label: isAsc ? "Low to High" : "High to Low",
      };
    case "name":
    case "set":
      return {
        label: isAsc ? "A-Z" : "Z-A",
      };
    case "type":
      return {
        label: isAsc ? "Default Order" : "Reversed Order",
      };
    default:
      return { label: "" };
  }
};
