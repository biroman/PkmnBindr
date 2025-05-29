import { useTheme } from "../theme/ThemeContent";
import { Palette, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const ThemeSelector = () => {
  const { theme, changeTheme, currentTheme, availableThemes, themes } =
    useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleCloseDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className={`p-2 rounded-lg transition-all duration-200
          ${theme.colors.button.secondary}
          border ${theme.colors.border.light}`}
      >
        <Palette className="w-4 h-4" />
      </button>

      <div
        className={`absolute right-0 top-10 mt-2 w-48 py-2 
        ${theme.colors.background.sidebar} rounded-lg shadow-xl border ${
          theme.colors.border.accent
        }
          ${isOpen ? "visible opacity-100" : "invisible opacity-0"} 
        transition-all duration-200 z-50`}
      >
        {availableThemes
          .filter((themeName) => !themeName.endsWith("_dark")) // Only show light themes
          .map((themeName) => {
            const isSelected = currentTheme === themeName;

            return (
              <button
                key={themeName}
                onClick={() => {
                  changeTheme(themeName);
                  handleCloseDropdown();
                }}
                className={`w-full px-4 py-2 text-left transition-all duration-200 flex items-center justify-between group/item
                ${theme.colors.dropdown.hover}
                ${
                  isSelected
                    ? `${theme.colors.text.accent} font-medium ${theme.colors.dropdown.input}`
                    : `${theme.colors.text.primary}`
                }`}
              >
                <span>{themes[themeName]?.name || themeName}</span>
                {isSelected && (
                  <Check className={`w-4 h-4 ${theme.colors.text.accent}`} />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default ThemeSelector;
