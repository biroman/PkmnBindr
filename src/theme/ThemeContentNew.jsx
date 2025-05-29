import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { themes } from "./themeConfig";
import { STORAGE_KEYS, getItem, setItem } from "../utils/indexedDbUtils";

const ThemeContext = createContext();

// Helper function to get saved theme from IndexedDB
const getSavedTheme = async () => {
  try {
    const savedTheme = await getItem(STORAGE_KEYS.THEME);
    return savedTheme && themes[savedTheme] ? savedTheme : "default";
  } catch {
    return "default";
  }
};

// Helper function to get saved dark mode preference
const getSavedDarkMode = async () => {
  try {
    const savedDarkMode = await getItem(STORAGE_KEYS.DARK_MODE);
    return savedDarkMode === "true";
  } catch {
    return false;
  }
};

// Helper function to save theme to IndexedDB
const saveTheme = async (themeName) => {
  try {
    await setItem(STORAGE_KEYS.THEME, themeName);
  } catch {
    // Silently fail if IndexedDB is not available
  }
};

// Helper function to save dark mode preference
const saveDarkMode = async (isDark) => {
  try {
    await setItem(STORAGE_KEYS.DARK_MODE, isDark.toString());
  } catch {
    // Silently fail if IndexedDB is not available
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentThemeName, setCurrentThemeName] = useState("default");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial theme preferences on mount
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const [savedTheme, savedDarkMode] = await Promise.all([
          getSavedTheme(),
          getSavedDarkMode(),
        ]);

        setCurrentThemeName(savedTheme);
        setIsDarkMode(savedDarkMode);
        setIsLoaded(true);
      } catch (error) {
        console.warn("Failed to load theme preferences:", error);
        setIsLoaded(true);
      }
    };

    loadThemePreferences();
  }, []);

  // Get the actual theme based on current theme name and dark mode
  const getActualTheme = (themeName, darkMode) => {
    if (darkMode && themes[`${themeName}_dark`]) {
      return themes[`${themeName}_dark`];
    }
    return themes[themeName] || themes.default;
  };

  const currentTheme = getActualTheme(currentThemeName, isDarkMode);

  const value = {
    theme: previewTheme || currentTheme,
    setTheme: async (themeName) => {
      setCurrentThemeName(themeName);
      setPreviewTheme(null); // Clear preview when theme is actually selected
      await saveTheme(themeName); // Persist theme preference
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
    setDarkMode: async (darkMode) => {
      setIsDarkMode(darkMode);
      await saveDarkMode(darkMode);
      setPreviewTheme(null); // Clear preview when dark mode changes
    },
    themes,
    isLoaded, // Expose loading state so components can wait for theme to load
  };

  // Always provide context, even during loading
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
