import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";
import { themes } from "./themeConfig";

const ThemeContext = createContext();

// Helper function to get saved theme from localStorage
const getSavedTheme = () => {
  try {
    const savedTheme = localStorage.getItem("pkmnbindr-theme");
    return savedTheme && themes[savedTheme] ? savedTheme : "default";
  } catch {
    return "default";
  }
};

// Helper function to get saved dark mode preference
const getSavedDarkMode = () => {
  try {
    const savedDarkMode = localStorage.getItem("pkmnbindr-darkmode");
    return savedDarkMode === "true";
  } catch {
    return false;
  }
};

// Helper function to save theme to localStorage
const saveTheme = (themeName) => {
  try {
    localStorage.setItem("pkmnbindr-theme", themeName);
  } catch {
    // Silently fail if localStorage is not available
  }
};

// Helper function to save dark mode preference
const saveDarkMode = (isDark) => {
  try {
    localStorage.setItem("pkmnbindr-darkmode", isDark.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentThemeName, setCurrentThemeName] = useState(() =>
    getSavedTheme()
  );
  const [isDarkMode, setIsDarkMode] = useState(() => getSavedDarkMode());
  const [previewTheme, setPreviewTheme] = useState(null);

  // Get the actual theme based on current theme name and dark mode
  const getActualTheme = (themeName, darkMode) => {
    if (darkMode && themes[`${themeName}_dark`]) {
      return themes[`${themeName}_dark`];
    }
    return themes[themeName];
  };

  const currentTheme = getActualTheme(currentThemeName, isDarkMode);

  const value = {
    theme: previewTheme || currentTheme,
    setTheme: (themeName) => {
      setCurrentThemeName(themeName);
      setPreviewTheme(null); // Clear preview when theme is actually selected
      saveTheme(themeName); // Persist theme preference
    },
    previewTheme: (themeName) => {
      if (themeName) {
        const previewThemeObj = getActualTheme(themeName, isDarkMode);
        setPreviewTheme(previewThemeObj);
      } else {
        setPreviewTheme(null);
      }
    },
    currentThemeName,
    isDarkMode,
    setDarkMode: (darkMode) => {
      setIsDarkMode(darkMode);
      saveDarkMode(darkMode);
      setPreviewTheme(null); // Clear preview when dark mode changes
    },
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
