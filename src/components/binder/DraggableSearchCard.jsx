import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import PropTypes from "prop-types";
import PokemonCard from "../PokemonCard";

/**
 * DraggableSearchCard – allows dragging cards from the Add-Cards modal directly
 * into the binder. It reuses DnD-Kit just like DraggableCard but marks its
 * payload as `new-card` (no position yet).
 */
const DraggableSearchCard = ({ card, className = "", ...props }) => {
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({
      // Use card id plus timestamp to avoid collisions when the same card is rendered multiple times.
      id: `search-${card.id}-${card.setCode || ""}`,
      data: {
        type: "new-card",
        card,
        position: -1, // synthetic position for shift-preview calculations
        modalBounds: (() => {
          const panel = document.querySelector(".add-card-modal-panel");
          if (panel) {
            const r = panel.getBoundingClientRect();
            return {
              top: r.top,
              left: r.left,
              right: r.right,
              bottom: r.bottom,
            };
          }
          return null;
        })(),
      },
    });

  const style = {
    transform: isDragging ? "none" : CSS.Translate.toString(transform),
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0 : 1,
  };

  if (!card) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all ${className}`}
      {...props}
    >
      <PokemonCard
        card={card}
        size="small"
        dragHandleProps={{ ...listeners, ...attributes }}
        disableHover={false}
      />
    </div>
  );
};

DraggableSearchCard.propTypes = {
  card: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default DraggableSearchCard;
