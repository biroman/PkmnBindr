import { useDroppable } from "@dnd-kit/core";
import DraggableCard from "./DraggableCard";

const DroppableSlot = ({
  card,
  position,
  gridSize,
  onCardClick,
  onCardDelete,
  onSlotClick,
  onToggleMissing, // New prop to handle missing/collected toggle
  className = "",
  isMissing = false,
  isReadOnly = false, // Extract isReadOnly to prevent it from passing to DOM
  isMobile = false, // Extract isMobile to prevent it from passing to DOM
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
  const isDraggingCard =
    active?.data?.current?.type === "card" ||
    (active && !active.data?.current?.type);
  const isSwapHover = isOver && isDraggingCard && card;
  const isEmptySlotHover = isOver && isDraggingCard && !card;

  const handleSlotClick = () => {
    if (!card && onSlotClick) {
      onSlotClick(position);
    }
  };

  const handleToggleMissing = () => {
    if (card && onToggleMissing) {
      // Use unique instance ID for tracking missing cards
      const instanceId = card.binderMetadata?.instanceId;
      if (instanceId) {
        onToggleMissing(instanceId, !isMissing);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        relative aspect-card rounded-md border-2 transition-all duration-200
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
          !card && !isReadOnly
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
            onToggleMissing={onToggleMissing ? handleToggleMissing : undefined}
            isMissing={isMissing}
            isReadOnly={isReadOnly}
            className={`w-full h-full transition-all duration-200 ${
              isSwapHover ? "scale-95 opacity-75" : ""
            } ${isMissing ? "opacity-50 grayscale" : ""}`}
          />

          {isSwapHover && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                ↔️ SWAP
              </div>
            </div>
          )}
          {isMissing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                MISSING
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center group">
          {isEmptySlotHover ? (
            <div className="text-blue-500 text-xs font-medium">Drop here</div>
          ) : !isReadOnly ? (
            <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
              <svg
                className="w-6 h-6 mb-1 opacity-60 group-hover:opacity-80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs font-medium opacity-60 group-hover:opacity-80">
                Add card
              </span>
            </div>
          ) : null}
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
