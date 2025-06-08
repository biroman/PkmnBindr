import { useDroppable } from "@dnd-kit/core";
import DraggableCard from "./DraggableCard";

const DroppableSlot = ({
  card,
  position,
  gridSize,
  onCardClick,
  onCardDelete,
  onSlotClick,
  className = "",
  ...props
}) => {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${position}`,
    data: {
      type: "slot",
      position,
      hasCard: !!card,
    },
  });

  // Check if we're dragging a card and hovering over a slot with a card (swap scenario)
  const isDraggingCard = active?.data?.current?.type === "card";
  const isSwapHover = isOver && isDraggingCard && card;
  const isEmptySlotHover = isOver && isDraggingCard && !card;

  const handleSlotClick = () => {
    if (!card && onSlotClick) {
      onSlotClick(position);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        relative aspect-card rounded-lg border-2 transition-all duration-200
        ${
          isSwapHover
            ? "border-orange-400 bg-orange-50 border-solid shadow-lg" // Swap indicator
            : isEmptySlotHover
            ? "border-blue-400 bg-blue-50 border-dashed" // Empty slot drop indicator
            : card
            ? "border-transparent"
            : "border-gray-200 border-dashed bg-gray-50/50"
        }
        ${
          !card
            ? "cursor-pointer hover:border-gray-300 hover:bg-gray-100/50"
            : ""
        }
        ${className}
      `}
      onClick={handleSlotClick}
      {...props}
    >
      {card ? (
        <div className="relative w-full h-full">
          <DraggableCard
            card={card}
            position={position}
            gridSize={gridSize}
            onCardClick={onCardClick}
            onCardDelete={onCardDelete}
            className={`w-full h-full transition-all duration-200 ${
              isSwapHover ? "scale-95 opacity-75" : ""
            }`}
          />
          {isSwapHover && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                ↔️ SWAP
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isEmptySlotHover && (
            <div className="text-blue-500 text-xs font-medium">Drop here</div>
          )}
        </div>
      )}

      {/* Position indicator for debugging/development */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-0 right-0 bg-black/20 text-white text-xs px-1 rounded-tl">
          {position}
        </div>
      )}
    </div>
  );
};

export default DroppableSlot;
