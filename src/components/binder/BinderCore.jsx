import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import PropTypes from "prop-types";
import BinderDisplay from "./BinderDisplay";
import DraggableCard from "./DraggableCard";

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

  // If drag and drop is disabled, render without DndContext
  if (!isDragDropEnabled) {
    return (
      <div
        className={`flex items-center justify-center flex-1 ${className}`}
        style={style}
      >
        <BinderDisplay
          binder={binder}
          currentPageConfig={currentPageConfig}
          dimensions={dimensions}
          backgroundColor={backgroundColor}
          isReadOnly={true}
          onCardClick={onCardClick}
          onCardDelete={undefined}
          onSlotClick={undefined}
          onToggleMissing={mode === "readonly" ? undefined : onToggleMissing}
          getCardsForPage={getCardsForPage}
        />
        {children}
      </div>
    );
  }

  // Full interactive mode with drag and drop
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      onDragOver={onDragOver}
    >
      <div
        className={`flex items-center justify-center flex-1 ${className}`}
        style={style}
      >
        <BinderDisplay
          binder={binder}
          currentPageConfig={currentPageConfig}
          dimensions={dimensions}
          backgroundColor={backgroundColor}
          isReadOnly={false}
          onCardClick={onCardClick}
          onCardDelete={onCardDelete}
          onSlotClick={onSlotClick}
          onToggleMissing={onToggleMissing}
          getCardsForPage={getCardsForPage}
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeCard ? (
            <DraggableCard
              card={activeCard}
              position={-1} // Special position for overlay
              gridSize={binder.settings?.gridSize || "3x3"}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>

        {children}
      </div>
    </DndContext>
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
