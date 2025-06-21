import PropTypes from "prop-types";

const EdgeNavigation = ({
  isActive,
  navigation,
  positions,
  dragState,
  className = "",
}) => {
  const { canGoNext, canGoPrev } = navigation;

  const { isInNavigationZone, navigationProgress } = dragState;

  // Only show during active drag operations
  if (!isActive) {
    return null;
  }

  return (
    <div className={`fixed top-16 bottom-0 z-20 ${className}`}>
      {/* Left Edge Zone */}
      <div
        className={`fixed top-16 bottom-0 w-24 transition-all duration-200 z-20 ${
          isInNavigationZone === "left"
            ? "bg-blue-500/30 border-r-4 border-blue-500"
            : "bg-blue-500/10 border-r-2 border-blue-300"
        } ${canGoPrev ? "opacity-100" : "opacity-50"}`}
        style={{ left: positions.left }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-center">
            <div className="relative inline-block">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {isInNavigationZone === "left" && (
                <svg
                  className="absolute inset-0 w-8 h-8 -rotate-90"
                  viewBox="0 0 32 32"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="87.96"
                    strokeDashoffset={
                      87.96 - (87.96 * navigationProgress) / 100
                    }
                    className="transition-all duration-75 ease-linear"
                  />
                </svg>
              )}
            </div>
            <div className="text-xs font-medium">
              {isInNavigationZone === "left"
                ? "Switching..."
                : "Hold to go back"}
            </div>
          </div>
        </div>
      </div>

      {/* Right Edge Zone */}
      <div
        className={`fixed top-16 bottom-0 w-24 transition-all duration-200 z-20 ${
          isInNavigationZone === "right"
            ? "bg-blue-500/30 border-l-4 border-blue-500"
            : "bg-blue-500/10 border-l-2 border-blue-300"
        } ${canGoNext ? "opacity-100" : "opacity-50"}`}
        style={{ left: positions.right }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-center">
            <div className="relative inline-block">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {isInNavigationZone === "right" && (
                <svg
                  className="absolute inset-0 w-8 h-8 -rotate-90"
                  viewBox="0 0 32 32"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="87.96"
                    strokeDashoffset={
                      87.96 - (87.96 * navigationProgress) / 100
                    }
                    className="transition-all duration-75 ease-linear"
                  />
                </svg>
              )}
            </div>
            <div className="text-xs font-medium">
              {isInNavigationZone === "right"
                ? "Switching..."
                : "Hold to go forward"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

EdgeNavigation.propTypes = {
  isActive: PropTypes.bool.isRequired,
  navigation: PropTypes.shape({
    canGoNext: PropTypes.bool.isRequired,
    canGoPrev: PropTypes.bool.isRequired,
  }).isRequired,
  positions: PropTypes.shape({
    left: PropTypes.string.isRequired,
    right: PropTypes.string.isRequired,
  }).isRequired,
  dragState: PropTypes.shape({
    isInNavigationZone: PropTypes.oneOf(["left", "right", null]),
    navigationProgress: PropTypes.number.isRequired,
  }).isRequired,
  className: PropTypes.string,
};

export default EdgeNavigation;
