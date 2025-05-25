import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";
import { themes } from "./themeConfig";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(themes.default);

  const value = {
    theme: currentTheme,
    setTheme: (themeName) => {
      setCurrentTheme(themes[themeName]);
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
