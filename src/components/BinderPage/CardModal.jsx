import { useTheme } from "../../theme/ThemeContent";
import { X, Star, Hash, Layers } from "lucide-react";
import PropTypes from "prop-types";

const CardModal = ({ card, onClose }) => {
  const { theme } = useTheme();

  // Use the high-resolution Pokemon TCG image with _hires suffix
  const getHighResImageUrl = (card) => {
    // Construct the high-res URL: https://images.pokemontcg.io/{setId}/{number}_hires.png
    const setId = card.set.id.toLowerCase();
    const cardNumber = card.number; // Use card number as-is, no padding
    return `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative max-w-4xl w-full ${theme.colors.background.main} rounded-2xl shadow-2xl border ${theme.colors.border.light} overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`${theme.colors.background.sidebar} border-b ${theme.colors.border.light} p-4 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${theme.colors.background.card} flex items-center justify-center`}
            >
              <Layers className={`w-5 h-5 ${theme.colors.text.accent}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${theme.colors.text.primary}`}>
                Card Details
              </h2>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                View card information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Card Image */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="relative max-w-md w-full">
              <img
                src={getHighResImageUrl(card)}
                alt={card.name}
                className="w-full h-auto rounded-xl shadow-2xl"
                onError={(e) => {
                  // Fallback to Pokemon TCG API large image, then small image
                  if (e.target.src.includes("_hires.png")) {
                    e.target.src = card.images.large;
                  } else if (e.target.src === card.images.large) {
                    e.target.src = card.images.small;
                  }
                }}
              />
              {/* Reverse Holo Indicator */}
              {card.isReverseHolo && (
                <div className="absolute top-4 right-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Information */}
          <div className="flex-1 p-6 space-y-6">
            {/* Card Name */}
            <div>
              <h3
                className={`text-2xl font-bold ${theme.colors.text.primary} mb-2`}
              >
                {card.name}
              </h3>
              {card.isReverseHolo && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span
                    className={`text-sm font-medium ${theme.colors.text.accent}`}
                  >
                    Reverse Holo
                  </span>
                </div>
              )}
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              {/* All Card Information */}
              <div
                className={`${theme.colors.background.card} rounded-xl p-4 border ${theme.colors.border.light}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layers className={`w-4 h-4 ${theme.colors.text.accent}`} />
                  <span
                    className={`text-sm font-medium ${theme.colors.text.accent}`}
                  >
                    Card Information
                  </span>
                </div>

                {/* Set Information */}
                <div className="mb-4">
                  <div
                    className={`font-semibold ${theme.colors.text.primary} mb-1`}
                  >
                    {card.set.name}
                  </div>
                  <div
                    className={`text-sm ${theme.colors.text.secondary} mb-2`}
                  >
                    {card.set.series && `${card.set.series} • `}
                    Released {card.set.releaseDate || "Unknown"}
                  </div>
                </div>

                {/* Card Number and Rarity */}
                <div className="flex flex-wrap gap-4 items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Hash
                      className={`w-4 h-4 ${theme.colors.text.secondary}`}
                    />
                    <span
                      className={`font-medium ${theme.colors.text.primary}`}
                    >
                      #{card.number}
                      {card.set.total && ` of ${card.set.total}`}
                    </span>
                  </div>

                  {card.rarity && (
                    <div className="flex items-center gap-2">
                      <Star
                        className={`w-4 h-4 ${theme.colors.text.secondary}`}
                      />
                      <span
                        className={`inline-block px-3 py-1 rounded-lg ${theme.colors.button.accent} font-medium text-sm`}
                      >
                        {card.rarity}
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {(card.artist || card.flavorText) && (
                  <div className="border-t pt-4 border-gray-200 dark:border-gray-700">
                    {card.artist && (
                      <div
                        className={`text-sm ${theme.colors.text.secondary} mb-2`}
                      >
                        <span className="font-medium">Artist:</span>{" "}
                        {card.artist}
                      </div>
                    )}
                    {card.flavorText && (
                      <div
                        className={`text-sm ${theme.colors.text.secondary} italic`}
                      >
                        &ldquo;{card.flavorText}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CardModal.propTypes = {
  card: PropTypes.shape({
    name: PropTypes.string.isRequired,
    number: PropTypes.string.isRequired,
    rarity: PropTypes.string,
    artist: PropTypes.string,
    flavorText: PropTypes.string,
    isReverseHolo: PropTypes.bool,
    images: PropTypes.shape({
      large: PropTypes.string.isRequired,
      small: PropTypes.string.isRequired,
    }).isRequired,
    set: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      series: PropTypes.string,
      releaseDate: PropTypes.string,
      total: PropTypes.number,
    }).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CardModal;
