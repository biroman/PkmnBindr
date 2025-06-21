import PropTypes from "prop-types";
import BinderDisplay from "./BinderDisplay";

const BinderCore = ({
  binder,
  currentPageConfig,
  dimensions,
  mode = "edit",
  backgroundColor = "#ffffff",
  getCardsForPage = () => [],
  onCardInteraction = {},
  dragHandlers = {},
  activeCard = null,
  className = "",
  style = {},
  children,
  // Public view specific props
  isPublicView = false,
  binderOwner = null,
}) => {
  const {
    onCardClick = () => {},
    onCardDelete = () => {},
    onSlotClick = () => {},
    onToggleMissing = () => {},
  } = onCardInteraction;

  const isReadOnly = mode === "readonly" || mode === "admin";
  const isDragDropEnabled = mode === "edit" && !isReadOnly;

  return (
    <div className={`relative ${className}`} style={style}>
      <BinderDisplay
        binder={binder}
        currentPageConfig={currentPageConfig}
        dimensions={dimensions}
        backgroundColor={backgroundColor}
        isReadOnly={isReadOnly}
        onCardClick={onCardClick}
        onCardDelete={isDragDropEnabled ? onCardDelete : undefined}
        onSlotClick={isDragDropEnabled ? onSlotClick : undefined}
        onToggleMissing={mode === "readonly" ? undefined : onToggleMissing}
        getCardsForPage={getCardsForPage}
        // Public view specific props
        isPublicView={isPublicView}
        binderOwner={binderOwner}
      />
      {children}
    </div>
  );
};

BinderCore.propTypes = {
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
  mode: PropTypes.oneOf(["edit", "readonly", "admin", "preview"]),
  backgroundColor: PropTypes.string,
  getCardsForPage: PropTypes.func,
  onCardInteraction: PropTypes.shape({
    onCardClick: PropTypes.func,
    onCardDelete: PropTypes.func,
    onSlotClick: PropTypes.func,
    onToggleMissing: PropTypes.func,
  }),
  dragHandlers: PropTypes.shape({
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,
    onDragCancel: PropTypes.func,
    onDragOver: PropTypes.func,
  }),
  activeCard: PropTypes.object,
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node,
  // Public view specific props
  isPublicView: PropTypes.bool,
  binderOwner: PropTypes.object,
};

export default BinderCore;
