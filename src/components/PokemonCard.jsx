import { useState, forwardRef } from "react";

// Loading placeholder component
const CardLoadingScreen = () => (
  <div className="aspect-[5/7] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-slate-400 text-sm">Loading...</div>
  </div>
);

// Error placeholder component
const CardErrorScreen = ({ error, onRetry }) => (
  <div className="aspect-[5/7] bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex flex-col items-center justify-center p-2 text-center">
    <div className="text-red-500 text-xs mb-2">Failed to load</div>
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
      aspect-[5/7] bg-gradient-to-br from-slate-50 to-slate-100 
      border-2 border-dashed border-slate-300 rounded-lg 
      flex items-center justify-center transition-all duration-200
      hover:border-slate-400 hover:bg-slate-100 cursor-pointer
      group
      ${className}
    `}
    >
      {children || (
        <div className="text-slate-400 text-center">
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
      onImageLoad,
      onImageError,
      showDetails = true,
      showAddButton = false,
      showDeleteButton = false,
      showMissingButton = false,
      isMissing = false,
      dragHandleProps,
      isReadOnly = false,
      className = "",
      style = {},
      children,
      // Drag and drop props (for future implementation)
      draggable = false,
      onDragStart,
      onDragEnd,
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
      onImageError?.(card);
    };

    const handleCardClick = (e) => {
      onClick?.(card, e);
    };

    // Check if this is a reverse holo card
    const isReverseHolo = card.reverseHolo || false;

    return (
      <div
        ref={ref}
        className={`
        group relative aspect-[5/7] bg-white rounded-lg shadow-md overflow-hidden
        transition-all duration-200 hover:shadow-lg hover:scale-105
        ${onClick && !isReadOnly ? "cursor-pointer" : ""}
        ${draggable ? "draggable" : ""}
        ${isReverseHolo ? "ring-2 ring-gradient-to-r ring-purple-400" : ""}
        ${className}
      `}
        style={style}
        onClick={handleCardClick}
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
          {card.image && !imageError ? (
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
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse flex items-center justify-center">
                  <div className="text-slate-400 text-xs">Loading...</div>
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
              </div>
            </div>
          )}
        </div>

        {/* Reverse Holo Indicator */}
        {isReverseHolo && showDetails && imageLoaded && (
          <div className="absolute top-1 right-1">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
              R
            </div>
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
                      <span className="pointer-events-none">Collected</span>
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

        {/* Set info */}
        {card.set?.symbol && showDetails && imageLoaded && (
          <div className="absolute top-1 left-1">
            <img
              src={card.set.symbol}
              alt={card.set.name}
              className="w-4 h-4 opacity-80"
              title={`${card.set.name} (${card.number})`}
            />
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
