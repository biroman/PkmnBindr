import { ArrowLeft, ArrowRight, Star, Eye, Plus, Trash2 } from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import CardModal from "./CardModal";
import { useState } from "react";

const BinderPage = ({
  cards = [],
  currentPage,
  onNextPage,
  onPrevPage,
  parsedMissingCards,
  layout,
  onToggleCardStatus,
}) => {
  const { theme } = useTheme();
  const [selectedCard, setSelectedCard] = useState(null);
  const cardsPerPage = layout.cards;
  const totalPhysicalPages = Math.ceil(cards.length / cardsPerPage);
  const adjustedTotalPages = Math.ceil((totalPhysicalPages + 1) / 2);

  // Calculate progress
  const totalCards = cards.length;
  const missingCount = parsedMissingCards.size;
  const collectedCount = totalCards - missingCount;
  const progressPercentage =
    totalCards > 0 ? (collectedCount / totalCards) * 100 : 0;

  let leftPhysicalPage, rightPhysicalPage;

  if (currentPage === 0) {
    leftPhysicalPage = null;
    rightPhysicalPage = 0;
  } else {
    leftPhysicalPage = 2 * currentPage - 1;
    rightPhysicalPage = 2 * currentPage;
  }

  const leftPageCards =
    leftPhysicalPage !== null && leftPhysicalPage < totalPhysicalPages
      ? cards.slice(
          leftPhysicalPage * cardsPerPage,
          (leftPhysicalPage + 1) * cardsPerPage
        )
      : [];
  const rightPageCards =
    rightPhysicalPage < totalPhysicalPages
      ? cards.slice(
          rightPhysicalPage * cardsPerPage,
          (rightPhysicalPage + 1) * cardsPerPage
        )
      : [];

  // Calculate grid classes based on layout
  const getGridClasses = () => {
    switch (layout.id) {
      case "2x2":
        return "grid-cols-2 grid-rows-2";
      case "3x3":
        return "grid-cols-3 grid-rows-3";
      case "4x3":
        return "grid-cols-4 grid-rows-3";
      case "4x4":
        return "grid-cols-4 grid-rows-4";
      default:
        return "grid-cols-3 grid-rows-3";
    }
  };

  // Calculate container size classes based on layout
  const getContainerClasses = () => {
    switch (layout.id) {
      case "2x2":
        return "w-[70%]";
      case "3x3":
        return "w-[78%]";
      case "4x3":
        return "w-[92%]"; // Wider for 4 columns
      case "4x4":
        return "w-[80%]";
      default:
        return "w-[75%]";
    }
  };

  // Calculate binder height based on layout
  const getBinderSizeClasses = () => {
    switch (layout.id) {
      case "2x2":
        return "h-[85%]";
      case "3x3":
        return "h-[95%]";
      case "4x3":
        return "h-[85%]"; // Shorter for 3 rows
      case "4x4":
        return "h-[98%]";
      default:
        return "h-[95%]";
    }
  };

  // Calculate grid spacing based on layout
  const getGridSpacingClasses = () => {
    switch (layout.id) {
      case "2x2":
        return "gap-3 p-4";
      case "3x3":
        return "gap-2 p-3";
      case "4x3":
        return "gap-1.5 p-2";
      case "4x4":
        return "gap-1 p-2";
      default:
        return "gap-2 p-3";
    }
  };

  // Handle toggling card status (add/remove from missing cards)
  const handleToggleCardStatus = (e, card) => {
    e.stopPropagation(); // Prevent opening the card modal
    if (onToggleCardStatus) {
      onToggleCardStatus(card.number);
    }
  };

  // Handle opening card details
  const handleInspectCard = (e, card) => {
    e.stopPropagation(); // Redundant but good practice
    setSelectedCard(card);
  };

  const renderPage = (pageCards) => {
    return (
      <div
        className={`relative ${theme.colors.background.sidebar} backdrop-blur-sm w-full h-full rounded-2xl shadow-xl`}
      >
        <div
          className={`grid ${getGridClasses()} h-full w-full ${getGridSpacingClasses()}`}
        >
          {Array.from({ length: layout.cards }).map((_, idx) => {
            const card = pageCards[idx];
            const column = idx % parseInt(layout.id[0]);

            let borderClasses = "";
            if (column === parseInt(layout.id[0]) - 1) {
              borderClasses = `border-r border-t border-b border-dashed ${theme.colors.border.accent}`;
            } else {
              borderClasses = `border-l border-t border-b border-dashed ${theme.colors.border.accent}`;
            }

            return (
              <div key={idx} className="relative w-full pt-[140%]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 ${borderClasses} rounded-lg pointer-events-none`}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-${theme.colors.primary}-500/5 via-transparent to-${theme.colors.primary}-500/5 rounded-lg pointer-events-none`}
                  />

                  {card && (
                    <div className="relative w-[98%] h-[98%] flex items-center justify-center">
                      <div className="relative w-full h-full group flex items-center justify-center">
                        {/* Base card layer */}
                        <div className="w-full h-full cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                          <div className="relative w-full h-full">
                            <img
                              src={
                                parsedMissingCards.has(
                                  card.isReverseHolo
                                    ? `${card.number}_reverse`
                                    : card.number
                                )
                                  ? "https://img.pkmnbindr.com/000.png"
                                  : card.images.small
                              }
                              alt={card.name}
                              className={`w-full h-full object-contain rounded-lg shadow-lg 
                                transition-all duration-200 
                                group-hover:shadow-${theme.colors.primary}-500/20`}
                              onClick={() => setSelectedCard(card)}
                            />
                          </div>
                        </div>

                        {/* Hover layer for missing cards */}
                        {parsedMissingCards.has(
                          card.isReverseHolo
                            ? `${card.number}_reverse`
                            : card.number
                        ) && (
                          <div
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => setSelectedCard(card)}
                          >
                            <img
                              src={card.images.small}
                              alt={card.name}
                              className="w-full h-full object-contain rounded-lg shadow-lg 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            />
                          </div>
                        )}

                        {/* Action buttons on hover */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2">
                          {/* Inspect button */}
                          <button
                            onClick={(e) => handleInspectCard(e, card)}
                            className={`${theme.colors.button.primary} shadow-lg p-2 rounded-full flex items-center justify-center`}
                            title="Inspect card"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Add/Remove toggle button */}
                          {parsedMissingCards.has(
                            card.isReverseHolo
                              ? `${card.number}_reverse`
                              : card.number
                          ) ? (
                            <button
                              onClick={(e) => handleToggleCardStatus(e, card)}
                              className={`${theme.colors.button.success} shadow-lg p-2 rounded-full flex items-center justify-center`}
                              title="Add to collection"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleToggleCardStatus(e, card)}
                              className={`bg-red-500 text-white shadow-lg p-2 rounded-full flex items-center justify-center`}
                              title="Remove from collection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Card number badge */}
                        <div className="absolute top-[-8px] right-[-8px] flex gap-1">
                          <span
                            className={`${theme.colors.button.primary} text-xs px-2 py-1 rounded-lg shadow-lg font-bold`}
                          >
                            #{card.number}
                          </span>
                          {card.isReverseHolo && (
                            <span
                              className={`${theme.colors.button.secondary} text-xs px-2 py-1 rounded-lg shadow-lg font-bold
                                flex items-center gap-1`}
                            >
                              <Star className="w-3 h-3" />
                              RH
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar at top */}
      <div
        className={`flex justify-between items-center px-6 py-3 ${theme.colors.background.sidebar}`}
      >
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${theme.colors.text.accent}`}>
              Set Progress
            </span>
            <span className={`text-sm font-medium ${theme.colors.text.accent}`}>
              {collectedCount} / {totalCards} cards (
              {Math.round(progressPercentage)}%)
            </span>
          </div>
          <div
            className={`w-full h-2 ${theme.colors.background.card} rounded-full overflow-hidden`}
          >
            <div
              className={`h-full bg-gradient-to-r ${
                theme.colors.progress?.from || "from-sky-500"
              } ${
                theme.colors.progress?.to || "to-sky-400"
              } transition-all duration-300 ease-out`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content with side buttons */}
      <div
        className={`flex-1 relative overflow-hidden ${theme.colors.background.main}`}
      >
        <div className="absolute inset-0 flex items-center justify-center ">
          {/* Left page turn button */}
          <button
            onClick={onPrevPage}
            disabled={currentPage === 0}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10
              w-12 h-24 flex items-center justify-center
              ${theme.colors.background.sidebar} backdrop-blur-sm rounded-lg
              enabled:hover:${theme.colors.background.card}
              disabled:opacity-40 disabled:cursor-not-allowed
              border ${theme.colors.border.accent}
              transition-all duration-200
              group`}
          >
            <ArrowLeft
              className={`w-6 h-6 ${theme.colors.text.accent} group-enabled:group-hover:scale-110 transition-transform`}
            />
          </button>

          {/* Binder content */}
          <div
            className={`relative ${getBinderSizeClasses()} ${getContainerClasses()} rounded-lg overflow-hidden`}
          >
            <div className="absolute inset-0 flex gap-2 ">
              <div className="flex-1">
                {currentPage === 0 ? (
                  <div
                    className={`h-full w-full ${theme.colors.background.sidebar} backdrop-blur-sm rounded-2xl shadow-xl 
                    flex flex-col items-center justify-center p-8`}
                  >
                    <img
                      src={`/${theme.name.toLowerCase()}.png`}
                      alt={theme.name}
                      className="absolute opacity-10"
                    />
                    <div className="text-4xl font-bold text-[#d62e36] opacity-20 rotate-45 mb-4">
                      PkmnBindr
                    </div>
                  </div>
                ) : (
                  renderPage(leftPageCards)
                )}
              </div>
              <div className="flex-1">{renderPage(rightPageCards)}</div>
            </div>
          </div>

          {/* Page indicator */}
          <div
            className={`absolute bottom-8 right-13 px-3 py-1.5 
            ${theme.colors.background.sidebar} backdrop-blur-sm rounded-lg 
            border ${theme.colors.border.accent}
            text-sm ${theme.colors.text.accent}`}
          >
            <span className="font-medium">
              {currentPage === 0
                ? "Cover"
                : `Pages ${leftPhysicalPage + 1}-${rightPhysicalPage + 1}`}
            </span>
            <span className={`${theme.colors.text.secondary} ml-2`}>
              of {totalPhysicalPages}
            </span>
          </div>

          {/* Right page turn button */}
          <button
            onClick={onNextPage}
            disabled={currentPage >= adjustedTotalPages - 1}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10
              w-12 h-24 flex items-center justify-center
              ${theme.colors.background.sidebar} backdrop-blur-sm rounded-lg
              enabled:hover:${theme.colors.background.card}
              disabled:opacity-40 disabled:cursor-not-allowed
              border ${theme.colors.border.accent}
              transition-all duration-200
              group`}
          >
            <ArrowRight
              className={`w-6 h-6 ${theme.colors.text.accent} group-enabled:group-hover:scale-110 transition-transform`}
            />
          </button>
        </div>
      </div>
      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
};

BinderPage.propTypes = {
  cards: PropTypes.array,
  currentPage: PropTypes.number.isRequired,
  onNextPage: PropTypes.func.isRequired,
  onPrevPage: PropTypes.func.isRequired,
  parsedMissingCards: PropTypes.instanceOf(Set).isRequired,
  layout: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    cards: PropTypes.number.isRequired,
  }).isRequired,
  onToggleCardStatus: PropTypes.func,
};

export default BinderPage;
