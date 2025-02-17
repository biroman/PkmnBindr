import { ArrowLeft, ArrowRight } from "lucide-react";
import PropTypes from "prop-types";

const BinderPage = ({
  cards = [],
  currentPage,
  onNextPage,
  onPrevPage,
  parsedMissingCards,
  layout,
}) => {
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

  const renderPage = (pageCards) => {
    return (
      <div className="relative bg-gray-900/90 backdrop-blur-sm w-full h-full rounded-2xl shadow-xl ">
        <div
          className={`grid ${getGridClasses()} h-full w-full ${getGridSpacingClasses()}`}
        >
          {Array.from({ length: layout.cards }).map((_, idx) => {
            const card = pageCards[idx];
            const column = idx % parseInt(layout.id[0]);

            let borderClasses = "";
            if (column === parseInt(layout.id[0]) - 1) {
              borderClasses =
                "border-r border-t border-b border-dashed border-yellow-500/20";
            } else {
              borderClasses =
                "border-l border-t border-b border-dashed border-yellow-500/20";
            }

            return (
              <div
                key={idx}
                className="relative w-full pt-[140%]" // This creates the 1:1.4 aspect ratio container
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 ${borderClasses} rounded-lg pointer-events-none`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-yellow-500/5 rounded-lg pointer-events-none" />

                  {card && (
                    <div className="relative w-[98%] h-[98%] flex items-center justify-center">
                      <div className="relative w-full h-full group flex items-center justify-center">
                        <img
                          src={
                            parsedMissingCards.has(card.number)
                              ? "https://pkmnbinder.com/images/000/000.png"
                              : card.images.small
                          }
                          alt={card.name}
                          className="w-full h-full object-contain rounded-lg shadow-lg transition-all duration-200 
                           group-hover:shadow-yellow-500/20"
                        />
                        {parsedMissingCards.has(card.number) && (
                          <img
                            src={card.images.small}
                            alt={card.name}
                            className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-lg 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          />
                        )}
                        <div className="absolute top-[-8px] right-[-8px]">
                          <span
                            className="bg-yellow-500 text-gray-900 
                          font-bold text-xs px-2 py-1 rounded-lg shadow-lg"
                          >
                            #{card.number}
                          </span>
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
      <div className="flex justify-between items-center px-6 py-3 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-500">
              Set Progress
            </span>
            <span className="text-sm font-medium text-yellow-500">
              {collectedCount} / {totalCards} cards (
              {Math.round(progressPercentage)}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content with side buttons */}
      <div className="flex-1 relative overflow-hidden bg-gray-950">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Left page turn button */}
          <button
            onClick={onPrevPage}
            disabled={currentPage === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10
            w-12 h-24 flex items-center justify-center
            bg-gray-900/80 backdrop-blur-sm rounded-lg
            enabled:hover:bg-gray-800
            disabled:opacity-40 disabled:cursor-not-allowed
            border border-yellow-500/20
            transition-all duration-200
            group"
          >
            <ArrowLeft className="w-6 h-6 text-yellow-500 group-enabled:group-hover:scale-110 transition-transform" />
          </button>

          {/* Binder content */}
          <div
            className={`relative ${getBinderSizeClasses()} ${getContainerClasses()} rounded-lg overflow-hidden`}
          >
            <div className="absolute inset-0 flex gap-2">
              <div className="flex-1">
                {currentPage === 0 ? (
                  <div
                    className="h-full w-full bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl 
                    flex flex-col items-center justify-center p-8"
                  >
                    <img
                      src="/umbreon.png"
                      alt="Umbreon"
                      className="absolute opacity-10"
                    />
                    <div className="text-4xl font-bold text-[#d62e36] opacity-20 rotate-45 mb-4">
                      WORK IN PROGRESS
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
            className="absolute bottom-8 right-13 px-3 py-1.5 
              bg-gray-900/90 backdrop-blur-sm rounded-lg 
              border border-yellow-500/20
              text-sm text-yellow-500"
          >
            <span className="font-medium">
              {currentPage === 0
                ? "Cover"
                : `Pages ${leftPhysicalPage + 1}-${rightPhysicalPage + 1}`}
            </span>
            <span className="text-yellow-500/60 ml-2">
              of {totalPhysicalPages}
            </span>
          </div>

          {/* Right page turn button */}
          <button
            onClick={onNextPage}
            disabled={currentPage >= adjustedTotalPages - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10
            w-12 h-24 flex items-center justify-center
            bg-gray-900/80 backdrop-blur-sm rounded-lg
            enabled:hover:bg-gray-800
            disabled:opacity-40 disabled:cursor-not-allowed
            border border-yellow-500/20
            transition-all duration-200
            group"
          >
            <ArrowRight className="w-6 h-6 text-yellow-500 group-enabled:group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
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
};

export default BinderPage;
