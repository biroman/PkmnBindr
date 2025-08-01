import { useState, forwardRef } from "react";
import PropTypes from "prop-types";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { MagnifyingGlassPlusIcon } from "@heroicons/react/24/outline";

// Loading placeholder component
const CardLoadingScreen = () => (
  <div className="aspect-[5/7] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-slate-400 dark:text-slate-500 text-sm">Loading...</div>
  </div>
);

// Error placeholder component
const CardErrorScreen = ({ error, onRetry }) => (
  <div className="aspect-[5/7] bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg flex flex-col items-center justify-center p-2 text-center">
    <div className="text-red-500 dark:text-red-400 text-xs mb-2">
      Failed to load
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

// Empty slot component
const EmptyCardSlot = forwardRef(
  ({ onClick, className = "", children }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={`
      aspect-[5/7] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700
      border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg 
      flex items-center justify-center transition-all duration-200
      hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer
      group
      ${className}
    `}
    >
      {children || (
        <div className="text-slate-400 dark:text-slate-500 text-center">
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
            +
          </div>
          <div className="text-xs">Add Card</div>
        </div>
      )}
    </div>
  )
);

EmptyCardSlot.displayName = "EmptyCardSlot";

// Type color mapping for Pokemon types
const TYPE_COLORS = {
  Grass: "from-green-400 to-green-600",
  Fire: "from-red-400 to-red-600",
  Water: "from-blue-400 to-blue-600",
  Lightning: "from-yellow-400 to-yellow-600",
  Psychic: "from-purple-400 to-purple-600",
  Fighting: "from-orange-400 to-orange-600",
  Darkness: "from-gray-700 to-gray-900",
  Metal: "from-gray-400 to-gray-600",
  Fairy: "from-pink-400 to-pink-600",
  Dragon: "from-indigo-400 to-indigo-600",
  Colorless: "from-gray-300 to-gray-500",
};

// Main Pokemon card component
const PokemonCard = forwardRef(
  (
    {
      card,
      isLoading = false,
      error = null,
      onClick,
      onDelete,
      onToggleMissing,
      onToggleReverseHolo,
      onImageLoad,
      onImageError,
      showDetails = true,
      showAddButton = false,
      showDeleteButton = false,
      showMissingButton = false,
      showReverseHoloToggle = false,
      isMissing = false,
      dragHandleProps,
      isReadOnly = false,
      className = "",
      style = {},
      children,
      showPreviewIcon = false,
      // Drag and drop props
      draggable = false,
      onDragStart,
      onDragEnd,
      // Drag state props (consumed here to prevent DOM warnings)
      isPlaceholder,
      isDragging,
      disableHover = false,
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Handle loading state
    if (isLoading) {
      return <CardLoadingScreen />;
    }

    // Handle error state
    if (error) {
      return <CardErrorScreen error={error} onRetry={onClick} />;
    }

    // Handle empty slot
    if (!card) {
      return (
        <EmptyCardSlot ref={ref} onClick={onClick} className={className}>
          {children}
        </EmptyCardSlot>
      );
    }

    // Get primary type for color theme
    const primaryType = card.types?.[0] || "Colorless";
    const typeGradient = TYPE_COLORS[primaryType] || TYPE_COLORS.Colorless;

    const handleImageLoad = () => {
      setImageLoaded(true);
      onImageLoad?.(card);
    };

    const handleImageError = () => {
      setImageError(true);
      console.error(
        `[PokemonCard] Image failed to load for card: ${card.name}`,
        {
          cardId: card.id,
          imageUrl: card.imageSmall || card.image,
          imageSmall: card.imageSmall,
          image: card.image,
          card,
        }
      );
      onImageError?.(card);
    };

    const handleCardClick = (e) => {
      onClick?.(card, e);
    };

    // Check if this is a reverse holo card - check multiple possible locations
    const isReverseHolo = 
      card.reverseHolo || 
      card.cardData?.reverseHolo || 
      card.binderMetadata?.reverseHolo || 
      false;

    return (
      <div
        ref={ref}
        className={`
        group relative aspect-[5/7] rounded-[4%] shadow-md overflow-hidden
        ${
          disableHover
            ? ""
            : "transition-all duration-200 hover:shadow-lg hover:scale-105"
        }
        ${onClick ? "cursor-pointer" : ""}
        ${draggable ? "draggable" : ""}
        ${isReverseHolo ? "ring-2 ring-gradient-to-r ring-purple-400" : ""}
        ${className}
      `}
        style={style}
        onClick={showPreviewIcon ? undefined : handleCardClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        {...props}
      >
        {/* Reverse Holo Shimmer Effect */}
        {isReverseHolo && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        )}

        {/* Card Image */}
        <div className="relative w-full h-full" {...(dragHandleProps || {})}>
          {(card.image || card.imageSmall) && !imageError ? (
            <>
              <img
                src={card.imageSmall || card.image}
                alt={card.name}
                className={`
                w-full h-full object-cover transition-opacity duration-300
                ${imageLoaded ? "opacity-100" : "opacity-0"}
                ${dragHandleProps ? "cursor-grab active:cursor-grabbing" : ""}
                ${isReverseHolo ? "brightness-110 contrast-105" : ""}
              `}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />

              {/* Loading overlay */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-pulse flex items-center justify-center">
                  <div className="text-slate-400 dark:text-slate-500 text-xs">
                    Loading...
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback design when no image */
            <div
              className={`w-full h-full bg-gradient-to-br ${typeGradient} flex flex-col items-center justify-center text-white p-2 ${
                dragHandleProps ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              <div className="text-center">
                <h3 className="font-bold text-sm mb-1 line-clamp-2">
                  {card.name}
                </h3>
                {card.types && (
                  <div className="text-xs opacity-90">
                    {card.types.join(" • ")}
                  </div>
                )}
                {/* Debug indicator for missing image */}
                {!card.image && !card.imageSmall && (
                  <div className="mt-2 text-xs bg-red-500/80 px-2 py-1 rounded">
                    NO IMAGE
                  </div>
                )}
                {imageError && (
                  <div className="mt-2 text-xs bg-orange-500/80 px-2 py-1 rounded">
                    IMG ERROR
                  </div>
                )}
                {card.isIncompleteCard && (
                  <div className="mt-2 text-xs bg-purple-500/80 px-2 py-1 rounded">
                    INCOMPLETE
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Icon Overlay */}
        {showPreviewIcon && !disableHover && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(card, e);
            }}
            className="absolute top-1 left-1 bg-black/40 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
            title="View larger"
          >
            <MagnifyingGlassPlusIcon className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Reverse Holo Indicator */}
        {isReverseHolo && showDetails && imageLoaded && (
          <div className="absolute top-1 right-1">
            {showReverseHoloToggle && onToggleReverseHolo ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleReverseHolo(card, false);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-gray-400 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg transition-all duration-200 pointer-events-auto"
                title="Remove Reverse Holo"
              >
                R
              </button>
            ) : (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                R
              </div>
            )}
          </div>
        )}

        {/* Reverse Holo Toggle Button - Show when hovering and card is NOT reverse holo */}
        {showReverseHoloToggle && onToggleReverseHolo && !isReverseHolo && imageLoaded && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleReverseHolo(card, true);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="bg-gray-400 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg transition-all duration-200 pointer-events-auto"
              title="Set as Reverse Holo"
            >
              R
            </button>
          </div>
        )}

        {/* Action buttons on hover - Outside the drag handle area */}
        {(showDeleteButton || showMissingButton) && imageLoaded && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-full hover:translate-y-0 transition-transform duration-200 group-hover:translate-y-0 z-10">
            <div
              className={`flex ${
                showDeleteButton && showMissingButton ? "" : ""
              }`}
            >
              {/* Missing/Collected button */}
              {showMissingButton && onToggleMissing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onToggleMissing(card);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  className={`${showDeleteButton ? "flex-1" : "w-full"} ${
                    isMissing
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-orange-500 hover:bg-orange-600"
                  } text-white py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1 pointer-events-auto`}
                  title={isMissing ? "Mark as collected" : "Mark as missing"}
                >
                  {isMissing ? (
                    <>
                      <Check className="w-4 h-4 pointer-events-none" />
                      <span className="pointer-events-none">Collected</span>
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
              {showDeleteButton && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(card);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  className={`${
                    showMissingButton ? "flex-1" : "w-full"
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

        {/* Add button overlay */}
        {showAddButton && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
            <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
              Add to Binder
            </button>
          </div>
        )}

        {/* Custom children overlay */}
        {children}
      </div>
    );
  }
);

PokemonCard.displayName = "PokemonCard";

// Export both the main component and utility components
export default PokemonCard;
export { EmptyCardSlot, CardLoadingScreen, CardErrorScreen };
