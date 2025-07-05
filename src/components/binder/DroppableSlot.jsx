import PropTypes from "prop-types";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { Check, EyeOff, Trash2, Plus } from "lucide-react";
import DraggableCard from "./DraggableCard";
import { useSelection } from "../../contexts/selection";
import { useBinderContext } from "../../contexts/BinderContext";

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

  // Selection context
  const {
    selectionMode,
    toggleCardSelection,
    isSelected,
    previewOffset,
    isBulkDragging,
    setPreviewOffset,
  } = useSelection();

  const { currentBinder } = useBinderContext();

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
    if (selectionMode) {
      // In selection mode we toggle selection regardless of card presence
      toggleCardSelection(position);
      return;
    }

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

  // Determine if this slot is predicted destination in multi-drag preview
  const isPreviewDestination =
    selectionMode &&
    previewOffset !== null &&
    !isSelected(position) &&
    isSelected(position - previewOffset);

  // Compute preview card for destination slots (card that will move here)
  let previewCard = null;
  if (isPreviewDestination && currentBinder && previewOffset !== null) {
    const sourcePos = position - previewOffset;
    const entry = currentBinder.cards?.[sourcePos?.toString?.()];
    const data = entry?.cardData;
    if (data) {
      previewCard = {
        id: data.id,
        name: data.name,
        image: data.image || data.imageSmall,
        images: { small: data.imageSmall || data.image, large: data.image },
        binderMetadata: { instanceId: entry.instanceId },
      };
    }
  }

  // Compute incoming preview for selected (source) slots – show card moving in
  let incomingCardPreview = null;
  if (
    selectionMode &&
    isSelected(position) &&
    previewOffset !== null &&
    currentBinder
  ) {
    const destinationPos = position + previewOffset;
    const destEntry = currentBinder.cards?.[destinationPos?.toString?.()];
    const destData = destEntry?.cardData;
    if (destData) {
      incomingCardPreview = {
        id: destData.id,
        name: destData.name,
        image: destData.image || destData.imageSmall,
        images: {
          small: destData.imageSmall || destData.image,
          large: destData.image,
        },
        binderMetadata: { instanceId: destEntry.instanceId },
      };
    }
  }

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
            ? "border-orange-400 bg-orange-50 dark:bg-orange-950 border-solid shadow-lg" // Swap indicator
            : isEmptySlotHover
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950 border-dashed" // Empty slot drop indicator
            : card && !shouldShowCardBack
            ? "border-transparent"
            : "border-gray-200 dark:border-gray-700 border-dashed bg-gray-50/50 dark:bg-gray-800/50"
        }
        ${
          !card && !isReadOnly
            ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
            : ""
        }
        ${className}
        ${
          selectionMode && isSelected(position)
            ? "ring-4 ring-blue-500/70"
            : isPreviewDestination
            ? "ring-4 ring-orange-400/70"
            : ""
        }
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
                    <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-md shadow-2xl border-2 border-blue-500 overflow-hidden">
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
                            <Check className="w-4 h-4 pointer-events-none" />
                            <span className="pointer-events-none">
                              Collected
                            </span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 pointer-events-none" />
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
                        <Trash2 className="w-4 h-4 pointer-events-none" />
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
              onCardDelete={isMobile ? undefined : onCardDelete}
              onToggleMissing={
                isMobile
                  ? undefined
                  : onToggleMissing
                  ? handleToggleMissing
                  : undefined
              }
              onDoubleClick={
                isMobile && onToggleMissing
                  ? (e) => {
                      e.stopPropagation();
                      handleToggleMissing();
                    }
                  : undefined
              }
              isMissing={isMissing}
              isReadOnly={isReadOnly}
              dragDisabled={selectionMode && !isSelected(position)}
              isGhost={
                isBulkDragging &&
                ((selectionMode && isSelected(position)) ||
                  isPreviewDestination)
              }
              disableHover={isMobile}
              className={`w-full h-full transition-all duration-200 ${
                isSwapHover ? "scale-95 opacity-75" : ""
              } ${isMissing ? "opacity-50 grayscale" : ""}`}
            />
          )}

          {isSwapHover && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                {selectionMode && isSelected(position)
                  ? "✔️ SELECTED"
                  : selectionMode
                  ? "↔️ SWAP GROUP"
                  : "↔️ SWAP"}
              </div>
            </div>
          )}

          {shouldShowMissingOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                MISSING
              </div>
            </div>
          )}

          {/* Preview overlays */}
          {previewCard && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <img
                src={previewCard.images?.small || previewCard.image}
                alt={previewCard.name}
                className="w-full h-full object-contain opacity-80 rounded-md"
              />
            </div>
          )}

          {incomingCardPreview && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <img
                src={
                  incomingCardPreview.images?.small || incomingCardPreview.image
                }
                alt={incomingCardPreview.name}
                className="w-full h-full object-contain opacity-60 grayscale rounded-md"
              />
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
                    <Plus className="w-6 h-6 text-white/30 group-hover:text-white transition-colors duration-300" />
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
              <Plus className="w-6 h-6 mb-1 opacity-60 group-hover:opacity-80" />
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

      {/* Selection overlay */}
      {selectionMode && isSelected(position) && (
        <div className="absolute inset-0 bg-blue-500/40 border-4 border-blue-600 rounded-md pointer-events-none flex items-center justify-center">
          <Check className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      )}

      {isPreviewDestination && (
        <div className="absolute inset-0 bg-orange-400/40 border-4 border-orange-600 rounded-md pointer-events-none"></div>
      )}
    </div>
  );
};

export default DroppableSlot;
