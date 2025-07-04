import React from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import PokemonCard from "../PokemonCard";

/**
 * DragProvider component that wraps DndContext and provides drag functionality
 * Handles the drag overlay and collision detection for binder components
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render within the drag context
 * @param {Object} props.dragHandlers - Drag event handlers
 * @param {Function} props.dragHandlers.onDragStart - Drag start handler
 * @param {Function} props.dragHandlers.onDragEnd - Drag end handler
 * @param {Function} props.dragHandlers.onDragCancel - Drag cancel handler
 * @param {Function} props.dragHandlers.onDragOver - Drag over handler
 * @param {Function} props.dragHandlers.onDragMove - Drag move handler
 * @param {Object} props.activeCard - Currently dragged card data
 * @param {boolean} props.disabled - Whether drag functionality is disabled
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactElement} DragProvider component
 */
export const DragProvider = ({
  children,
  dragHandlers = {},
  activeCard,
  disabled = false,
  className = "",
  selectedCardsData = [],
}) => {
  const {
    onDragStart = () => {},
    onDragEnd = () => {},
    onDragCancel = () => {},
    onDragOver = () => {},
    onDragMove = () => {},
  } = dragHandlers;

  // Don't render DndContext if drag is disabled
  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      onDragOver={onDragOver}
      onDragMove={onDragMove}
    >
      <div className={className}>{children}</div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="transform rotate-3 scale-105 opacity-90 pointer-events-none">
            <PokemonCard
              card={activeCard}
              isPlaceholder={false}
              isDragging={true}
              className="shadow-2xl border-2 border-blue-400"
            />
            {/* Bulk drag indicator */}
            {selectedCardsData.length > 1 && (
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white">
                +{selectedCardsData.length - 1} more
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

DragProvider.propTypes = {
  children: PropTypes.node.isRequired,
  dragHandlers: PropTypes.shape({
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,
    onDragCancel: PropTypes.func,
    onDragOver: PropTypes.func,
    onDragMove: PropTypes.func,
  }),
  activeCard: PropTypes.object,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  selectedCardsData: PropTypes.array,
};

export default DragProvider;
