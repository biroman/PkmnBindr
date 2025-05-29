import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContent";

const DarkModeToggle = () => {
  const { theme, currentTheme, changeTheme } = useTheme();

  // Determine if current theme is dark variant
  const isDarkMode = currentTheme.endsWith("_dark");

  // Get the base theme name (without _dark suffix)
  const baseTheme = isDarkMode
    ? currentTheme.replace("_dark", "")
    : currentTheme;

  const toggleDarkMode = () => {
    const targetTheme = isDarkMode ? baseTheme : `${baseTheme}_dark`;
    changeTheme(targetTheme);
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative p-2 rounded-lg transition-all duration-300 ease-in-out
        ${theme.colors.button.secondary}
        hover:scale-105 active:scale-95
        group overflow-hidden
      `}
      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="relative w-4 h-4">
        {/* Sun Icon */}
        <Sun
          className={`
            absolute inset-0 w-4 h-4 transition-all duration-300 ease-in-out
            ${
              isDarkMode
                ? "opacity-0 rotate-90 scale-0"
                : "opacity-100 rotate-0 scale-100"
            }
          `}
        />

        {/* Moon Icon */}
        <Moon
          className={`
            absolute inset-0 w-4 h-4 transition-all duration-300 ease-in-out
            ${
              isDarkMode
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-0"
            }
          `}
        />
      </div>

      {/* Subtle glow effect on hover */}
      <div
        className={`
        absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 
        transition-opacity duration-300
        ${
          isDarkMode
            ? "bg-blue-400 shadow-lg shadow-blue-400/25"
            : "bg-yellow-400 shadow-lg shadow-yellow-400/25"
        }
      `}
      />
    </button>
  );
};

export default DarkModeToggle;
