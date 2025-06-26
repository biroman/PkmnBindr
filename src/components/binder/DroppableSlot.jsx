import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import DraggableCard from "./DraggableCard";

const CARD_BACK_URL = "https://img.pkmnbindr.com/000.png";

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
  showCardBackForEmpty = false, // New prop for showing card back in empty slots
  showCardBackForMissing = false, // New prop for showing card back for missing cards
  ...props
}) => {
  const [isHovering, setIsHovering] = useState(false);

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

  const shouldShowCardBack =
    (!card && showCardBackForEmpty) ||
    (card && isMissing && showCardBackForMissing);
  const shouldShowMissingOverlay = card && isMissing && !showCardBackForMissing;
  const shouldShowHoverPreview =
    card && isMissing && showCardBackForMissing && isHovering;

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
            : card && !shouldShowCardBack
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
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      {card ? (
        <div className="relative w-full h-full">
          {shouldShowCardBack ? (
            /* Show card back for missing cards when toggle is enabled */
            <div
              className="relative w-full h-full group overflow-hidden rounded-md cursor-pointer"
              onClick={(e) => {
                if (onCardClick && card) {
                  onCardClick(card, e);
                }
              }}
            >
              <img
                src={CARD_BACK_URL}
                alt="Card back"
                className="w-full h-full object-contain rounded-md shadow-sm"
                loading="lazy"
              />

              {/* Subtle indicator for empty slots (only when no card and showing card back) */}
              {!card && showCardBackForEmpty && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm flex items-center justify-center">
                  <div className="w-1 h-1 bg-blue-200 rounded-full"></div>
                </div>
              )}

              {/* Hover Preview for Missing Cards */}
              {shouldShowHoverPreview && (
                <div className="absolute inset-0 z-20 transition-opacity duration-200">
                  <div className="relative w-full h-full">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/20 rounded-md" />

                    {/* Preview Card - Full size to match regular cards */}
                    <div className="absolute inset-0 bg-white rounded-md shadow-2xl border-2 border-blue-500 overflow-hidden">
                      <img
                        src={card.images?.small || card.image}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons on hover - same as PokemonCard */}
              {(onCardDelete || onToggleMissing) && !isReadOnly && (
                <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-30">
                  <div className="flex">
                    {/* Missing/Collected button */}
                    {onToggleMissing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleToggleMissing();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        className={`${onCardDelete ? "flex-1" : "w-full"} ${
                          isMissing
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-orange-500 hover:bg-orange-600"
                        } text-white py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1 pointer-events-auto`}
                        title={
                          isMissing ? "Mark as collected" : "Mark as missing"
                        }
                      >
                        {isMissing ? (
                          <>
                            <svg
                              className="w-4 h-4 pointer-events-none"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="pointer-events-none">
                              Collected
                            </span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 pointer-events-none"
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
                            <span className="pointer-events-none">Missing</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete button */}
                    {onCardDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onCardDelete(card, position);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        className={`${
                          onToggleMissing ? "flex-1" : "w-full"
                        } bg-red-500 hover:bg-red-600 text-white py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1 pointer-events-auto`}
                        title="Remove card from binder"
                      >
                        <svg
                          className="w-4 h-4 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span className="pointer-events-none">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Show regular draggable card */
            <DraggableCard
              card={card}
              position={position}
              gridSize={gridSize}
              onCardClick={onCardClick}
              onCardDelete={onCardDelete}
              onToggleMissing={
                onToggleMissing ? handleToggleMissing : undefined
              }
              isMissing={isMissing}
              isReadOnly={isReadOnly}
              className={`w-full h-full transition-all duration-200 ${
                isSwapHover ? "scale-95 opacity-75" : ""
              } ${isMissing ? "opacity-50 grayscale" : ""}`}
            />
          )}

          {isSwapHover && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                ↔️ SWAP
              </div>
            </div>
          )}

          {shouldShowMissingOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
          {shouldShowCardBack ? (
            /* Show card back for empty slots when toggle is enabled */
            <div className="relative w-full h-full group">
              {/* Card back at full opacity */}
              <img
                src={CARD_BACK_URL}
                alt="Card back"
                className="w-full h-full object-contain rounded-md shadow-sm"
                loading="lazy"
              />
              {/* Hover and default state indicator */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors duration-300"
                aria-hidden="true"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Icon Container: Transforms on hover */}
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent group-hover:w-12 group-hover:h-12 group-hover:bg-white/20 group-hover:backdrop-blur-sm group-hover:border group-hover:border-white/30 transition-all duration-300">
                    <svg
                      className="w-6 h-6 text-white/30 group-hover:text-white transition-colors duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v12m6-6H6"
                      />
                    </svg>
                  </div>
                  {/* Text: Appears on hover */}
                  <span className="mt-2 font-semibold text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Add Card
                  </span>
                </div>
              </div>
            </div>
          ) : isEmptySlotHover ? (
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
