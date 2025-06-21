import PropTypes from "prop-types";
import CoverPage from "./CoverPage";
import CardPage from "./CardPage";
import BinderSpine from "./BinderSpine";

const BinderDisplay = ({
  binder,
  currentPageConfig,
  dimensions,
  backgroundColor = "#ffffff",
  isReadOnly = false,
  onCardClick = () => {},
  onCardDelete = () => {},
  onSlotClick = () => {},
  onToggleMissing = () => {},
  getCardsForPage = () => [],
  className = "",
  style = {},
}) => {
  if (!binder || !currentPageConfig) {
    return null;
  }

  const containerStyle = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    ...style,
  };

  return (
    <div
      className={`relative flex gap-4 binder-container ${className}`}
      style={containerStyle}
    >
      {/* Left Page */}
      {currentPageConfig.leftPage.type === "cover" ? (
        <CoverPage
          binder={binder}
          backgroundColor={backgroundColor}
          isReadOnly={isReadOnly}
        />
      ) : (
        <CardPage
          pageNumber={currentPageConfig.leftPage.pageNumber}
          cards={getCardsForPage(currentPageConfig.leftPage.cardPageIndex)}
          gridSize={binder.settings?.gridSize || "3x3"}
          onCardClick={isReadOnly ? undefined : onCardClick}
          onCardDelete={isReadOnly ? undefined : onCardDelete}
          onSlotClick={isReadOnly ? undefined : onSlotClick}
          onToggleMissing={isReadOnly ? undefined : onToggleMissing}
          cardPageIndex={currentPageConfig.leftPage.cardPageIndex}
          missingPositions={binder.metadata?.missingInstances || []}
          backgroundColor={backgroundColor}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Center Spine */}
      <BinderSpine />

      {/* Right Page */}
      <CardPage
        pageNumber={currentPageConfig.rightPage.pageNumber}
        cards={getCardsForPage(currentPageConfig.rightPage.cardPageIndex)}
        gridSize={binder.settings?.gridSize || "3x3"}
        onCardClick={isReadOnly ? undefined : onCardClick}
        onCardDelete={isReadOnly ? undefined : onCardDelete}
        onSlotClick={isReadOnly ? undefined : onSlotClick}
        onToggleMissing={isReadOnly ? undefined : onToggleMissing}
        cardPageIndex={currentPageConfig.rightPage.cardPageIndex}
        missingPositions={binder.metadata?.missingInstances || []}
        backgroundColor={backgroundColor}
        isReadOnly={isReadOnly}
      />
    </div>
  );
};

BinderDisplay.propTypes = {
  binder: PropTypes.object.isRequired,
  currentPageConfig: PropTypes.shape({
    leftPage: PropTypes.shape({
      type: PropTypes.string.isRequired,
      pageNumber: PropTypes.number,
      cardPageIndex: PropTypes.number,
    }).isRequired,
    rightPage: PropTypes.shape({
      type: PropTypes.string.isRequired,
      pageNumber: PropTypes.number.isRequired,
      cardPageIndex: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  dimensions: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  backgroundColor: PropTypes.string,
  isReadOnly: PropTypes.bool,
  onCardClick: PropTypes.func,
  onCardDelete: PropTypes.func,
  onSlotClick: PropTypes.func,
  onToggleMissing: PropTypes.func,
  getCardsForPage: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default BinderDisplay;
