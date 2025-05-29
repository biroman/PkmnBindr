import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { themes } from "./themeConfig";
import { getTheme, saveTheme } from "../utils/storageUtilsIndexedDB";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("default"); // Default theme
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await getTheme();
        if (savedTheme && themes[savedTheme]) {
          setCurrentTheme(savedTheme);
        }
      } catch (error) {
        console.warn("Failed to load theme from storage:", error);
        // Keep default theme
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedTheme();
  }, []);

  const changeTheme = async (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      try {
        await saveTheme(themeName);
      } catch (error) {
        console.warn("Failed to save theme to storage:", error);
      }
    }
  };

  // Always provide a theme, even while loading
  const theme = themes[currentTheme] || themes.default;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        changeTheme,
        availableThemes: Object.keys(themes),
        themes,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
