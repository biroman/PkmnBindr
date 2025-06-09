import { getGridConfig } from "../../hooks/useBinderDimensions";
import DroppableSlot from "./DroppableSlot";

const CardPage = ({
  pageNumber,
  cards = [],
  gridSize = "3x3",
  onCardClick,
  onCardDelete,
  onSlotClick,
  onToggleMissing, // New prop for toggling missing status
  cardPageIndex = 0, // For calculating global positions
  missingPositions = [], // Array of missing instance IDs
}) => {
  const gridConfig = getGridConfig(gridSize);
  const slots = Array.from({ length: gridConfig.total });

  return (
    <div className="flex-1 bg-white rounded-lg shadow-2xl relative">
      {/* Page Header */}
      <div className="absolute top-2 left-4 right-4 flex items-center justify-between z-10">
        <div className="text-sm font-medium text-gray-500">
          Page {pageNumber}
        </div>
        <div className="flex items-center gap-2">
          {/* Binding holes decoration */}
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="p-4 pt-8 h-full">
        <div
          className={`grid gap-2 h-full`}
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
          }}
        >
          {slots.map((_, index) => {
            const card = cards[index];
            // Calculate global position based on page index and slot index
            const globalPosition = cardPageIndex * gridConfig.total + index;

            // Check if this card is marked as missing (instance-based)
            const instanceId = card?.binderMetadata?.instanceId;
            const isMissing =
              instanceId && missingPositions.includes(instanceId);

            return (
              <DroppableSlot
                key={`slot-${globalPosition}`}
                card={card}
                position={globalPosition}
                gridSize={gridSize}
                onCardClick={onCardClick}
                onCardDelete={onCardDelete}
                onSlotClick={onSlotClick}
                onToggleMissing={onToggleMissing}
                className="w-full h-full"
                isMissing={isMissing}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CardPage;
