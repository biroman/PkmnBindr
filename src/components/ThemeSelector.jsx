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
        className="absolute right-0 mt-2 w-48 py-2 
        bg-slate-900 rounded-lg shadow-xl border border-slate-800 
        opacity-0 group-hover:opacity-100 invisible group-hover:visible 
        transition-all duration-200 z-50"
      >
        {Object.entries(themes).map(([key, themeOption]) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`w-full px-4 py-2 text-left hover:bg-slate-800
              ${
                theme.name === themeOption.name
                  ? "text-indigo-400"
                  : "text-slate-200"
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
