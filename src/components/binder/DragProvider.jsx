import React from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
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
}) => {
  const {
    onDragStart = () => {},
    onDragEnd = () => {},
    onDragCancel = () => {},
    onDragOver = () => {},
  } = dragHandlers;

  // Configure sensors with small activation distance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 15,
      },
    })
  );

  // Don't render DndContext if drag is disabled
  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      onDragOver={onDragOver}
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
              className="shadow-2xl"
            />
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
  }),
  activeCard: PropTypes.object,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default DragProvider;
