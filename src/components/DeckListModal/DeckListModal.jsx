import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { X, Copy, Check } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import logger from "../../utils/logger";

const DeckListModal = ({ cards, onClose }) => {
  const { theme } = useTheme();
  const [deckList, setDeckList] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateDeckList = () => {
      const list = cards
        .map((card) => {
          const abilities = card.abilities || [];
          const attacks = card.attacks || [];
          const skills = [
            ...abilities.map((ability) => ability.name),
            ...attacks.map((attack) => attack.name),
          ].map((name) => (name.includes(" ") ? `"${name}"` : name));
          return `${card.name} ${skills.join(" ")}`;
        })
        .join("\n");
      setDeckList(list);
    };
    generateDeckList();
  }, [cards]);

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={`${theme.colors.background.sidebar} rounded-2xl p-6 max-w-2xl w-full m-4 shadow-2xl border ${theme.colors.border.accent}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-bold ${theme.colors.text.accent}`}>
            Deck List
          </h2>
          <button
            onClick={onClose}
            className={`${theme.colors.text.secondary} hover:${theme.colors.text.accent} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <textarea
            value={deckList}
            readOnly
            className={`w-full h-96 p-4 ${theme.colors.background.card} border ${theme.colors.border.accent} rounded-xl
              ${theme.colors.text.primary} font-mono text-sm mb-4
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          />
          <div className="absolute top-2 right-2">
            <span
              className={`text-xs ${theme.colors.text.secondary} ${theme.colors.background.sidebar} px-2 py-1 rounded-full border ${theme.colors.border.accent}`}
            >
              {cards.length} cards
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => copyToClipboard(deckList)}
            className={`px-4 py-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
              shadow-lg
              transition-all duration-200
              flex items-center gap-2 font-semibold
              ${theme.colors.button.primary}`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
              transition-colors duration-200
              border ${theme.colors.border.accent}
              ${theme.colors.button.secondary}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

DeckListModal.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      abilities: PropTypes.array,
      attacks: PropTypes.array,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeckListModal;
