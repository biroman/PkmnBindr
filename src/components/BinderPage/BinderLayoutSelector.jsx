import PropTypes from "prop-types";
import { Grid2X2, Grid3X3, LayoutGrid } from "lucide-react";

const BinderLayoutSelector = ({ currentLayout, onLayoutChange }) => {
  const layouts = [
    { id: "2x2", label: "2×2", icon: Grid2X2, cards: 4 },
    { id: "3x3", label: "3×3", icon: Grid3X3, cards: 9 },
    { id: "4x3", label: "4×3", icon: LayoutGrid, cards: 12 },
    { id: "4x4", label: "4×4", icon: LayoutGrid, cards: 16 },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-yellow-500">
        Binder Layout
      </label>
      <div className="grid grid-cols-2 gap-2">
        {layouts.map((layout) => {
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              onClick={() => onLayoutChange(layout)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg 
              transition-all duration-200 
              ${
                currentLayout.id === layout.id
                  ? "bg-yellow-500 text-gray-900 font-semibold"
                  : "bg-gray-800/50 text-yellow-500 border border-yellow-500/20 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{layout.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

BinderLayoutSelector.propTypes = {
  currentLayout: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    cards: PropTypes.number.isRequired,
  }).isRequired,
  onLayoutChange: PropTypes.func.isRequired,
};

export default BinderLayoutSelector;
