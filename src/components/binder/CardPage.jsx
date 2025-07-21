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
  onToggleReverseHolo, // New prop for toggling reverse holo status
  cardPageIndex = 0, // For calculating global positions
  missingPositions = [], // Array of missing instance IDs
  isReadOnly = false, // New prop for read-only mode
  backgroundColor = "#ffffff", // New prop for background color
  isMobile = false, // New prop for mobile mode
  fullScreen = false, // New prop for full-screen mobile mode
  dimensions,
  reorderMode = "swap",
  // Card back display settings
  showCardBackForEmpty = false,
  showCardBackForMissing = false,
}) => {
  const gridConfig = getGridConfig(gridSize);
  const slots = Array.from({ length: gridConfig.total });

  // Full screen mobile layout (keeps background but removes binder styling)
  if (fullScreen && isMobile) {
    return (
      <div
        className="h-full w-full flex flex-col rounded-lg"
        style={{
          background: backgroundColor?.startsWith("linear-gradient")
            ? backgroundColor
            : undefined,
          backgroundColor: !backgroundColor?.startsWith("linear-gradient")
            ? backgroundColor
            : undefined,
          // The parent in BinderDisplay provides the dimensions, so we just fill it.
        }}
      >
        {/* Card Grid */}
        <div className="flex-1 p-2">
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
              gap: "0px",
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
                  onCardDelete={isReadOnly ? undefined : onCardDelete}
                  onSlotClick={isReadOnly ? undefined : onSlotClick}
                  onToggleMissing={isReadOnly ? undefined : onToggleMissing}
                  onToggleReverseHolo={isReadOnly ? undefined : onToggleReverseHolo}
                  className="w-full h-full"
                  isMissing={isMissing}
                  isReadOnly={isReadOnly}
                  isMobile={isMobile}
                  showCardBackForEmpty={showCardBackForEmpty}
                  showCardBackForMissing={showCardBackForMissing}
                  reorderMode={reorderMode}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Traditional binder layout (desktop and regular mobile)
  return (
    <div
      className={`flex-1 rounded-lg shadow-2xl relative transition-colors duration-300 ${
        isMobile ? "mobile-card-page" : ""
      }`}
      style={{
        background: backgroundColor?.startsWith("linear-gradient")
          ? backgroundColor
          : undefined,
        backgroundColor: !backgroundColor?.startsWith("linear-gradient")
          ? backgroundColor
          : undefined,
      }}
    >
      {/* Page Header */}
      <div className="absolute top-2 left-4 right-4 flex items-center justify-between z-10">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Page {pageNumber}
        </div>
      </div>

      {/* Card Grid */}
      <div className={`${isMobile ? "p-3 pt-6" : "p-4 pt-8"} h-full`}>
        <div
          className={`grid ${isMobile ? "gap-1.5" : "gap-2"} h-full`}
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
            gap: "8px",
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
                onCardDelete={isReadOnly ? undefined : onCardDelete}
                onSlotClick={isReadOnly ? undefined : onSlotClick}
                onToggleMissing={isReadOnly ? undefined : onToggleMissing}
                onToggleReverseHolo={isReadOnly ? undefined : onToggleReverseHolo}
                className="w-full h-full"
                isMissing={isMissing}
                isReadOnly={isReadOnly}
                isMobile={isMobile}
                showCardBackForEmpty={showCardBackForEmpty}
                showCardBackForMissing={showCardBackForMissing}
                reorderMode={reorderMode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CardPage;
