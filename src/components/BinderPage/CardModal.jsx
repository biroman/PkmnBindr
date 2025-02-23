import { useTheme } from "../../theme/ThemeContent";
import PropTypes from "prop-types";

const CardModal = ({ card, onClose }) => {
  const { theme } = useTheme();

  // Construct the Cloudflare image URL for high-res version
  const getHighResImageUrl = (card) => {
    const setCode = card.set.id.toLowerCase();
    const paddedNumber = card.number.padStart(3, "0");
    return `https://img.pkmnbindr.com/${setCode}/${paddedNumber}.jpg`;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className={`relative max-w-2xl w-full mx-4`}>
        <div className="p-4">
          <img
            src={getHighResImageUrl(card)}
            alt={card.name}
            className="w-full h-auto rounded-lg"
            onError={(e) => {
              // Fallback to Pokemon TCG API image if Cloudflare image fails
              e.target.src = card.images.large;
            }}
          />
        </div>

        <div className={`px-4 pb-4 ${theme.colors.text.primary}`}>
          <h3 className="font-bold text-lg">{card.name}</h3>
          <p className={`text-sm ${theme.colors.text.secondary}`}>
            {card.set.name} · #{card.number}
          </p>
        </div>
      </div>
    </div>
  );
};

CardModal.propTypes = {
  card: PropTypes.shape({
    name: PropTypes.string.isRequired,
    number: PropTypes.string.isRequired,
    images: PropTypes.shape({
      large: PropTypes.string.isRequired,
    }).isRequired,
    set: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CardModal;
