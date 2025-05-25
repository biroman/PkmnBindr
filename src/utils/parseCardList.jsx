export const parseCardList = (text, setCards) => {
  const cardReference = new Map(
    setCards.map((card) => [
      card.number,
      {
        name: card.name.toLowerCase(),
        number: card.number,
      },
    ])
  );

  //const normalizeText = (text) => text.toLowerCase().replace(/[^\w\s]/g, "");

  const strategies = [
    (line) => {
      const match = line.match(/\[(\d+[a-z]?)\]/);
      return match ? match[1] : null;
    },
    (line) => {
      const match = line.match(/(\d+[a-z]?)\/\d+/);
      return match ? match[1] : null;
    },
    (line) => {
      const match = line.match(/#(\d+[a-z]?)/);
      return match ? match[1] : null;
    },
    /*
    (line) => {
      const normalizedLine = normalizeText(line);
      for (const [number, card] of cardReference) {
        if (normalizedLine.includes(card.name)) {
          return number;
        }
      }
      return null;
    },
    */
  ];

  const lines = text.split("\n").filter((line) => line.trim());
  const missingCards = new Set();

  lines.forEach((line) => {
    for (const strategy of strategies) {
      const cardNumber = strategy(line);
      if (cardNumber && cardReference.has(cardNumber)) {
        missingCards.add(cardNumber);
        break;
      }
    }
  });

  return missingCards;
};
