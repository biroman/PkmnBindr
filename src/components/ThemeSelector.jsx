import { useTheme } from "../theme/ThemeContent";
import { Palette } from "lucide-react";

const ThemeSelector = () => {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="relative group">
      <button
        className={`p-2 rounded-lg transition-all duration-200
          ${theme.colors.button.secondary}
          border ${theme.colors.border.light}`}
      >
        <Palette className="w-4 h-4" />
      </button>

      <div
        className={`absolute right-0 top-10 mt-2 w-48 py-2 
        ${theme.colors.background.sidebar} rounded-lg shadow-xl border ${theme.colors.border.accent}
          invisible group-hover:visible 
        transition-all duration-200 z-50`}
      >
        {Object.entries(themes).map(([key, themeOption]) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`w-full px-4 py-2 text-left transition-colors duration-200
              hover:${theme.colors.background.card}
              ${
                theme.name === themeOption.name
                  ? `${theme.colors.text.accent} font-medium`
                  : `${theme.colors.text.primary}`
              }`}
          >
            {themeOption.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
