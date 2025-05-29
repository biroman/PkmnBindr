import { Plus, Star, Clipboard, Check } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const SearchCard = ({
  card,
  onAddCard,
  onAddToClipboard,
  recentlyAdded,
  pulsing,
}) => {
  const { theme } = useTheme();

  const handleAddCard = (isReverseHolo = false) => {
    onAddCard(card, isReverseHolo);
  };

  const handleAddToClipboard = (isReverseHolo = false) => {
    onAddToClipboard(card, isReverseHolo);
  };

  return (
    <div
      className={`${theme.colors.background.card} rounded-lg p-3 border ${theme.colors.border.light} hover:shadow-lg transition-all duration-200 group`}
    >
      <div className="aspect-[2.5/3.5] mb-2 relative">
        <img
          src={card.images.small}
          alt={card.name}
          className="w-full h-full object-contain rounded-md"
        />
      </div>

      <div className="space-y-1">
        <h3
          className={`font-medium ${theme.colors.text.primary} text-xs truncate`}
        >
          {card.name}
        </h3>
        <p className={`text-xs ${theme.colors.text.secondary} truncate`}>
          {card.set.name} #{card.number}
        </p>
        <p className={`text-xs ${theme.colors.text.accent}`}>{card.rarity}</p>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex gap-1">
          <button
            onClick={() => handleAddCard(false)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all duration-200 ${
              recentlyAdded.has(`${card.id}_normal`)
                ? `bg-green-500 text-white ${
                    pulsing.has(`${card.id}_normal`)
                      ? "bg-green-300 shadow-md"
                      : ""
                  }`
                : `${theme.colors.button.primary} hover:scale-105`
            }`}
          >
            {recentlyAdded.has(`${card.id}_normal`) ? (
              <Check className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            {recentlyAdded.has(`${card.id}_normal`) ? "Added!" : "Add"}
          </button>
          <button
            onClick={() => handleAddToClipboard(false)}
            className={`px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-all duration-200 ${
              recentlyAdded.has(`${card.id}_normal_clipboard`)
                ? `bg-green-500 text-white ${
                    pulsing.has(`${card.id}_normal_clipboard`)
                      ? "bg-green-300 shadow-md"
                      : ""
                  }`
                : `${theme.colors.button.secondary} hover:scale-105`
            }`}
            title="Add to clipboard"
          >
            <Clipboard className="w-3 h-3" />
          </button>
        </div>

        {["Common", "Uncommon", "Rare", "Rare Holo"].includes(card.rarity) && (
          <div className="flex gap-1">
            <button
              onClick={() => handleAddCard(true)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all duration-200 ${
                recentlyAdded.has(`${card.id}_rh`)
                  ? `bg-green-500 text-white ${
                      pulsing.has(`${card.id}_rh`)
                        ? "bg-green-300 shadow-md"
                        : ""
                    }`
                  : `${theme.colors.button.secondary} hover:scale-105`
              }`}
            >
              {recentlyAdded.has(`${card.id}_rh`) ? (
                <Check className="w-3 h-3" />
              ) : (
                <Star className="w-3 h-3" />
              )}
              {recentlyAdded.has(`${card.id}_rh`) ? "Added!" : "Add RH"}
            </button>
            <button
              onClick={() => handleAddToClipboard(true)}
              className={`px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                recentlyAdded.has(`${card.id}_rh_clipboard`)
                  ? `bg-green-500 text-white ${
                      pulsing.has(`${card.id}_rh_clipboard`)
                        ? "bg-green-300 shadow-md"
                        : ""
                    }`
                  : `${theme.colors.button.secondary} hover:scale-105`
              }`}
              title="Add reverse holo to clipboard"
            >
              <Clipboard className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchCard;
