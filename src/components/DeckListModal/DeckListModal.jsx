import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { X, Copy, Check } from "lucide-react";

const DeckListModal = ({ cards, onClose }) => {
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deckList);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full m-4 shadow-2xl border border-yellow-500/20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-500">Deck List</h2>
          <button
            onClick={onClose}
            className="text-yellow-500/60 hover:text-yellow-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <textarea
            value={deckList}
            readOnly
            className="w-full h-96 p-4 bg-gray-800/50 border border-yellow-500/20 rounded-xl 
            text-yellow-100 font-mono text-sm mb-4 
            focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
          <div className="absolute top-2 right-2">
            <span className="text-xs text-yellow-500/60 bg-gray-900/80 px-2 py-1 rounded-full border border-yellow-500/20">
              {cards.length} cards
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-yellow-500 text-gray-900 
            rounded-lg hover:bg-yellow-400
            focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
            shadow-lg shadow-yellow-500/20
            transition-all duration-200
            flex items-center gap-2 font-semibold"
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
            className="px-4 py-2 bg-gray-800 text-yellow-500 rounded-lg 
            hover:bg-gray-700 border border-yellow-500/20
            focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
            transition-colors duration-200"
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
