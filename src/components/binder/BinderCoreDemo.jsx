import React, { useState, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getThemeAwareBinderColor } from "../../utils/themeUtils";
import BinderCore from "./BinderCore";
import useBinderDimensions from "../../hooks/useBinderDimensions";

// Demo component showing different modes of BinderCore
const BinderCoreDemo = ({ binder, getCardsForPage, currentPageConfig }) => {
  const [mode, setMode] = useState("edit");
  const [activeCard, setActiveCard] = useState(null);
  const { theme } = useTheme();

  const dimensions = useBinderDimensions(binder?.settings?.gridSize || "3x3");

  if (!binder) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">BinderCore Demo</h2>
        <p className="text-secondary">No binder selected</p>
      </div>
    );
  }

  const handleCardInteraction = {
    onCardClick: (card, position) => {
      console.log("Card clicked:", card, "at position:", position);
    },
    onCardDelete: (card, position) => {
      console.log("Card delete requested:", card, "at position:", position);
    },
    onSlotClick: (position) => {
      console.log("Empty slot clicked at position:", position);
    },
    onToggleMissing: (instanceId, isMissing) => {
      console.log("Toggle missing status:", instanceId, "to", isMissing);
    },
  };

  const dragHandlers = {
    onDragStart: (event) => {
      console.log("Drag started:", event.active.data.current);
      setActiveCard(event.active.data.current?.card || null);
    },
    onDragEnd: (event) => {
      console.log("Drag ended:", event.active, event.over);
      setActiveCard(null);
    },
    onDragCancel: () => {
      console.log("Drag cancelled");
      setActiveCard(null);
    },
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Mode Selector */}
      <div className="p-4 bg-white/10 backdrop-blur-sm">
        <h2 className="text-white text-xl font-bold mb-4">
          BinderCore Demo - Different Modes
        </h2>
        <div className="flex gap-2">
          {["edit", "readonly", "admin", "preview"].map((modeOption) => (
            <button
              key={modeOption}
              onClick={() => setMode(modeOption)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                mode === modeOption
                  ? "bg-blue-500 text-white"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              }`}
            >
              {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)} Mode
            </button>
          ))}
        </div>
        <p className="text-white/70 text-sm mt-2">
          Current mode: <strong>{mode}</strong> -
          {mode === "edit" && " Full editing with drag & drop"}
          {mode === "readonly" && " Read-only viewing (public binders)"}
          {mode === "admin" && " Admin view with limited editing"}
          {mode === "preview" && " Preview mode for selection"}
        </p>
      </div>

      {/* BinderCore in selected mode */}
      <div className="flex-1">
        <BinderCore
          binder={binder}
          currentPageConfig={currentPageConfig}
          dimensions={dimensions}
          mode={mode}
          backgroundColor={getThemeAwareBinderColor(
            binder.settings?.binderColor,
            theme
          )}
          getCardsForPage={getCardsForPage}
          onCardInteraction={handleCardInteraction}
          dragHandlers={dragHandlers}
          activeCard={activeCard}
        />
      </div>
    </div>
  );
};

export default BinderCoreDemo;
