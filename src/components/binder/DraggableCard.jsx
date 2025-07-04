import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import PokemonCard from "../PokemonCard";

const DraggableCard = ({
  card,
  position,
  gridSize,
  onCardClick,
  onCardDelete,
  onToggleMissing,
  isMissing = false,
  className = "",
  isDragging = false,
  isReadOnly = false,
  // Selection mode props
  isSelectionMode = false,
  isSelected = false,
  onCardSelect,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: `card-${position}`,
    data: {
      type: "card",
      card,
      position,
      // Include selection data for bulk operations
      isSelectionMode,
      isSelected,
      isBulkDrag: isSelectionMode && isSelected,
    },
    disabled: isReadOnly || (isSelectionMode && !isSelected), // Only allow dragging selected cards in selection mode
  });

  const isDraggable = !isReadOnly && (!isSelectionMode || isSelected);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isCurrentlyDragging ? 0.5 : 1,
    cursor: isDraggable
      ? isCurrentlyDragging
        ? "grabbing"
        : "grab"
      : "default",
    // Ensure drag doesn't go off-screen
    zIndex: isCurrentlyDragging ? 1000 : 1,
  };

  if (!card) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-opacity duration-200 ${className}`}
      {...props}
    >
      <PokemonCard
        card={card}
        size="small"
        onClick={() => onCardClick && onCardClick(card, position)}
        onDelete={onCardDelete ? () => onCardDelete(card, position) : undefined}
        onToggleMissing={onToggleMissing ? () => onToggleMissing() : undefined}
        showDeleteButton={!!onCardDelete && !isCurrentlyDragging}
        showMissingButton={!!onToggleMissing && !isCurrentlyDragging}
        isMissing={isMissing}
        isReadOnly={isReadOnly}
        dragHandleProps={
          isDraggable ? { ...attributes, ...listeners } : undefined
        }
        // Selection mode props
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onSelect={onCardSelect}
        className={`
          touch-none select-none ${
            isCurrentlyDragging ? "pointer-events-none" : ""
          }
          ${isCurrentlyDragging ? "shadow-2xl scale-105" : ""}
          transition-all duration-200
        `}
        style={{
          // Prevent card from extending beyond viewport
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />
    </div>
  );
};

export default DraggableCard;
