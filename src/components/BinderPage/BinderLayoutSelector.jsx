import PropTypes from "prop-types";
import { Grid2X2, Grid3X3, LayoutGrid, ArrowDown, ArrowUp } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const BinderLayoutSelector = ({
  currentLayout,
  onLayoutChange,
  displayOptions,
  onDisplayOptionsChange,
  isCustomBinder = false,
}) => {
  const layouts = [
    { id: "2x2", label: "2×2", icon: Grid2X2, cards: 4 },
    { id: "3x3", label: "3×3", icon: Grid3X3, cards: 9 },
    { id: "4x3", label: "4×3", icon: LayoutGrid, cards: 12 },
    { id: "4x4", label: "4×4", icon: LayoutGrid, cards: 16 },
  ];
  const { theme } = useTheme();

  return (
    <div
      className={`${theme.colors.background.card} rounded-xl border ${theme.colors.border.accent} p-4 space-y-4`}
    >
      {/* Layout Grid Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${theme.colors.text.accent}`}>
            Binder Layout
          </label>
          <span className={`text-xs ${theme.colors.text.secondary}`}>
            {currentLayout.cards} cards per page
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            const isSelected = currentLayout.id === layout.id;
            return (
              <button
                key={layout.id}
                onClick={() => onLayoutChange(layout)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group relative
                  ${
                    isSelected
                      ? `${theme.colors.button.primary} shadow-lg`
                      : `hover:${theme.colors.background.sidebar} ${theme.colors.button.secondary} border ${theme.colors.border.accent}`
                  }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isSelected
                      ? ""
                      : "group-hover:scale-110 transition-transform duration-200"
                  }`}
                />
                <span className="font-medium">{layout.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-3 pt-2 ${theme.colors.border.accent}">
        <label className={`text-sm font-medium ${theme.colors.text.accent}`}>
          Display Options
        </label>

        <div className="space-y-3">
          {/* Show Reverse Holos - Only for set collections */}
          {!isCustomBinder && (
            <div
              className={`flex items-center justify-between p-2 rounded-lg transition-colors
              ${
                displayOptions.showReverseHolos
                  ? theme.colors.background.sidebar
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 flex items-center justify-center 
        rounded-md border text-xs font-bold relative
        overflow-hidden text-gray-400`}
                >
                  R<div className="absolute inset-0"></div>
                </div>
                <span className={`text-sm ${theme.colors.text.primary}`}>
                  Reverse Holos
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayOptions.showReverseHolos}
                  onChange={(e) =>
                    onDisplayOptionsChange({
                      ...displayOptions,
                      showReverseHolos: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out flex items-center
                  ${
                    displayOptions.showReverseHolos
                      ? theme.colors.button.primary
                      : `${theme.colors.background.sidebar} border ${theme.colors.border.accent}`
                  }
                  peer-focus:ring-2 peer-focus:ring-offset-1
                  ${
                    displayOptions.showReverseHolos
                      ? "peer-focus:ring-sky-500/50"
                      : `peer-focus:ring-${theme.colors.text.secondary}/30`
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full shadow-sm border transition-transform duration-200 ease-in-out
                    ${
                      theme.isDark
                        ? "bg-white border-gray-200"
                        : "bg-gray-100 border-gray-300"
                    }
                    ${
                      displayOptions.showReverseHolos
                        ? "translate-x-[21px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>
            </div>
          )}

          {/* Sort Direction */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {displayOptions.sortDirection === "asc" ? (
                <ArrowUp className={`w-4 h-4 ${theme.colors.text.accent}`} />
              ) : (
                <ArrowDown className={`w-4 h-4 ${theme.colors.text.accent}`} />
              )}
              <span className={`text-sm ${theme.colors.text.primary}`}>
                Sort Order
              </span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() =>
                  onDisplayOptionsChange({
                    ...displayOptions,
                    sortDirection: "asc",
                  })
                }
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200
                  ${
                    displayOptions.sortDirection === "asc"
                      ? theme.colors.button.primary
                      : `hover:${theme.colors.background.sidebar} ${theme.colors.button.secondary} border ${theme.colors.border.accent}`
                  }`}
              >
                Ascending
              </button>
              <button
                onClick={() =>
                  onDisplayOptionsChange({
                    ...displayOptions,
                    sortDirection: "desc",
                  })
                }
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200
                  ${
                    displayOptions.sortDirection === "desc"
                      ? theme.colors.button.primary
                      : `hover:${theme.colors.background.sidebar} ${theme.colors.button.secondary} border ${theme.colors.border.accent}`
                  }`}
              >
                Descending
              </button>
            </div>
          </div>
        </div>
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
  displayOptions: PropTypes.shape({
    showReverseHolos: PropTypes.bool.isRequired,
    sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  }).isRequired,
  onDisplayOptionsChange: PropTypes.func.isRequired,
  isCustomBinder: PropTypes.bool,
};

export default BinderLayoutSelector;
