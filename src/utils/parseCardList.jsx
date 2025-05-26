export const parseCardList = (text, setCards = []) => {
  const cardReference = new Map();

  // Build reference map for both regular and reverse holo cards
  setCards.forEach((card) => {
    cardReference.set(card.number, {
      name: card.name.toLowerCase(),
      number: card.number,
    });

    // Add reverse holo version if applicable
    if (["Common", "Uncommon", "Rare", "Rare Holo"].includes(card.rarity)) {
      cardReference.set(`${card.number}_reverse`, {
        name: card.name.toLowerCase(),
        number: `${card.number}_reverse`,
      });
    }
  });

  const normalizeText = (text) => text.toLowerCase().replace(/[^\w\s]/g, "");

  const strategies = [
    // Match [number] format
    (line) => {
      const match = line.match(/\[(\d+[a-z]?)\]/);
      return match ? match[1] : null;
    },
    // Match number/total format
    (line) => {
      const match = line.match(/(\d+[a-z]?)\/\d+/);
      return match ? match[1] : null;
    },
    // Match #number format
    (line) => {
      const match = line.match(/#(\d+[a-z]?)/);
      return match ? match[1] : null;
    },
    // Match numberrh format (like 1rh, 25rh)
    (line) => {
      const match = line.match(/^#?(\d+[a-z]?)rh$/i);
      if (match && cardReference.has(`${match[1]}_reverse`)) {
        return `${match[1]}_reverse`;
      }
      return null;
    },
    // Match just number format
    (line) => {
      const match = line.match(/^(\d+[a-z]?)$/);
      return match ? match[1] : null;
    },
    // Match card name
    (line) => {
      const normalizedLine = normalizeText(line);
      for (const [number, card] of cardReference) {
        if (normalizedLine.includes(card.name)) {
          return number;
        }
      }
      return null;
    },
    // Match reverse holo indicators (with spaces)
    (line) => {
      const normalizedLine = normalizeText(line);
      if (normalizedLine.includes("reverse") || /\d+\s+rh/i.test(line)) {
        // Try to extract number from the line (with or without hash)
        const numberMatch = line.match(/#?(\d+[a-z]?)/);
        if (numberMatch && cardReference.has(`${numberMatch[1]}_reverse`)) {
          return `${numberMatch[1]}_reverse`;
        }
      }
      return null;
    },
  ];

  const lines = text.split("\n").filter((line) => line.trim());
  const missingCards = new Set();

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    for (const strategy of strategies) {
      const cardNumber = strategy(trimmedLine);
      if (cardNumber && cardReference.has(cardNumber)) {
        missingCards.add(cardNumber);
        break;
      }
    }
  });

  return missingCards;
};
