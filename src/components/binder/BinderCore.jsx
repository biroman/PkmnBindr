import PropTypes from "prop-types";
import BinderDisplay from "./BinderDisplay";
import DragProvider from "./DragProvider";

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
}) => {
  const {
    onCardClick = () => {},
    onCardDelete = () => {},
    onSlotClick = () => {},
    onToggleMissing = () => {},
  } = onCardInteraction;

  const {
    onDragStart = () => {},
    onDragEnd = () => {},
    onDragCancel = () => {},
    onDragOver = () => {},
  } = dragHandlers;

  const isReadOnly = mode === "readonly" || mode === "admin";
  const isDragDropEnabled = mode === "edit" && !isReadOnly;

  return (
    <DragProvider
      dragHandlers={isDragDropEnabled ? dragHandlers : {}}
      activeCard={activeCard}
      disabled={!isDragDropEnabled}
      className={`flex items-center justify-center flex-1 ${className}`}
    >
      <div style={style}>
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
        />
        {children}
      </div>
    </DragProvider>
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
};

export default BinderCore;
