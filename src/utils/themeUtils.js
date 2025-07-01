/**
 * Theme-aware utilities for binder background colors
 */

/**
 * Get the current theme from the document class
 * @returns {string} 'dark' or 'light'
 */
export const getCurrentTheme = () => {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }
  return "light"; // Default fallback
};

/**
 * Get theme-appropriate binder background color
 * @param {string} customColor - Custom color set by user
 * @param {string} theme - Current theme ('dark' or 'light')
 * @returns {string} Appropriate background color
 */
export const getThemeAwareBinderColor = (customColor, theme = null) => {
  // If user has set a custom color, use it regardless of theme
  if (customColor && customColor !== "#ffffff" && customColor !== "#000000") {
    return customColor;
  }

  // Auto-detect theme if not provided
  const currentTheme = theme || getCurrentTheme();

  // Return theme-appropriate default colors
  if (currentTheme === "dark") {
    return "#1e293b"; // slate-800 - dark mode default
  } else {
    return "#ffffff"; // white - light mode default
  }
};

/**
 * Hook-like function to get theme-aware binder background
 * @param {Object} binder - Binder object with settings
 * @returns {string} Theme-appropriate background color
 */
export const useThemeAwareBinderBackground = (binder) => {
  const customColor = binder?.settings?.binderColor;
  return getThemeAwareBinderColor(customColor);
};

/**
 * Check if a color should be treated as a "default" color that should adapt to theme
 * @param {string} color - Color to check
 * @returns {boolean} Whether this color should adapt to theme
 */
export const isDefaultColor = (color) => {
  return !color || color === "#ffffff" || color === "#000000";
};
