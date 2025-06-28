import React from "react";
import PropTypes from "prop-types";
import { useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * EdgeNavigationZone - Individual droppable zone for edge navigation
 */
const EdgeNavigationZone = ({
  id,
  direction,
  isActive,
  canNavigate,
  isInZone,
  navigationProgress,
  position,
  onNavigate,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: "edge-navigation",
      direction,
      canNavigate,
    },
    disabled: !canNavigate, // Disable droppable when can't navigate
  });

  if (!isActive) {
    return null;
  }

  const isLeftZone = direction === "left";
  const isRightZone = direction === "right";

  return (
    <div
      ref={setNodeRef}
      className={`fixed top-16 bottom-0 w-24 transition-all duration-200 z-50 pointer-events-auto ${
        isInZone || isOver
          ? "bg-blue-500/30 border-blue-500"
          : "bg-blue-500/10 border-blue-300"
      } ${isLeftZone ? "border-r-4" : "border-l-4"} ${
        canNavigate ? "opacity-100" : "opacity-50"
      }`}
      style={{
        left: isLeftZone ? position.left : position.right,
      }}
      title={`Edge Navigation Zone - ${direction} (${
        canNavigate ? "enabled" : "disabled"
      })`}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-center">
          <div className="relative inline-block">
            {isLeftZone ? (
              <ChevronLeft className="w-8 h-8 mx-auto mb-2" />
            ) : (
              <ChevronRight className="w-8 h-8 mx-auto mb-2" />
            )}
            {(isInZone || isOver) && (
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
                  strokeDashoffset={87.96 - (87.96 * navigationProgress) / 100}
                  className="transition-all duration-75 ease-linear"
                />
              </svg>
            )}
          </div>
          <div className="text-xs font-medium">
            {isInZone || isOver
              ? "Switching..."
              : `Hold to go ${isLeftZone ? "back" : "forward"}`}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * EdgeNavigation - Provides droppable zones for drag-to-navigate functionality
 */
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
    <div
      className={`fixed top-16 bottom-0 z-50 pointer-events-none ${className}`}
    >
      {/* Left Edge Navigation Zone */}
      <EdgeNavigationZone
        id="edge-navigation-left"
        direction="left"
        isActive={isActive}
        canNavigate={canGoPrev}
        isInZone={isInNavigationZone === "left"}
        navigationProgress={navigationProgress}
        position={{ left: positions.left }}
      />

      {/* Right Edge Navigation Zone */}
      <EdgeNavigationZone
        id="edge-navigation-right"
        direction="right"
        isActive={isActive}
        canNavigate={canGoNext}
        isInZone={isInNavigationZone === "right"}
        navigationProgress={navigationProgress}
        position={{ right: positions.right }}
      />
    </div>
  );
};

EdgeNavigationZone.propTypes = {
  id: PropTypes.string.isRequired,
  direction: PropTypes.oneOf(["left", "right"]).isRequired,
  isActive: PropTypes.bool.isRequired,
  canNavigate: PropTypes.bool.isRequired,
  isInZone: PropTypes.bool.isRequired,
  navigationProgress: PropTypes.number.isRequired,
  position: PropTypes.object.isRequired,
  onNavigate: PropTypes.func,
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
