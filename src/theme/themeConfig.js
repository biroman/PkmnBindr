// Helper function to create dark variant of a theme
const createDarkVariant = (lightTheme, accentColor = "blue") => {
  // Map accent colors to better dark mode text colors for readability
  const darkTextColorMap = {
    blue: "text-blue-400",
    yellow: "text-yellow-300", // Pikachu theme - lighter for visibility
    pink: "text-pink-300", // Lighter pink for better contrast
    orange: "text-orange-300",
  };

  const darkTextColor =
    darkTextColorMap[accentColor] || `text-${accentColor}-400`;

  return {
    ...lightTheme,
    name: `${lightTheme.name} Dark`,
    colors: {
      ...lightTheme.colors,
      background: {
        main: "bg-slate-900",
        sidebar: "bg-slate-800",
        card: "bg-slate-700",
      },
      dropdown: {
        background: "bg-slate-800",
        hover: "hover:bg-slate-700",
        input: "bg-slate-700",
      },
      text: {
        primary: "text-slate-100",
        secondary: "text-slate-400",
        accent: darkTextColor,
      },
      border: {
        light: "border-slate-600",
        accent: "border-slate-500/50",
      },
      button: {
        primary: lightTheme.colors.button.primary.replace(
          "shadow-sm",
          "shadow-lg"
        ),
        secondary:
          "bg-slate-600 hover:bg-slate-500 text-slate-100 transition-colors shadow-lg border border-slate-500/50",
        success:
          "bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-lg",
      },
      progress: {
        from: `from-${accentColor}-500`,
        to: `to-${accentColor}-400`,
      },
    },
  };
};

export const themes = {
  default: {
    name: "Default",
    colors: {
      primary: "blue",
      secondary: "slate",
      accent: "blue",
      background: {
        main: "bg-white",
        sidebar: "bg-white",
        card: "bg-white",
      },
      dropdown: {
        background: "bg-white",
        hover: "hover:bg-slate-50",
        input: "bg-slate-50",
      },
      text: {
        primary: "text-slate-900",
        secondary: "text-slate-600",
        accent: "text-blue-600",
      },
      border: {
        light: "border-slate-200",
        accent: "border-slate-200/60",
      },
      button: {
        primary:
          "bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm",
        secondary:
          "bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm",
        success:
          "bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm",
      },
      progress: {
        from: "from-blue-500",
        to: "to-blue-600",
      },
    },
  },

  pikachu: {
    name: "Pikachu",
    colors: {
      primary: "yellow",
      secondary: "yellow",
      accent: "yellow",
      background: {
        main: "bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-50",
        sidebar: "bg-white",
        card: "bg-white",
      },
      dropdown: {
        background: "bg-white",
        hover: "hover:bg-yellow-50",
        input: "bg-yellow-50/50",
      },
      text: {
        primary: "text-yellow-900",
        secondary: "text-yellow-700",
        accent: "text-yellow-600",
      },
      border: {
        light: "border-yellow-200",
        accent: "border-yellow-200/60",
      },
      button: {
        primary:
          "bg-yellow-500 hover:bg-yellow-600 text-white transition-colors shadow-sm",
        secondary:
          "bg-white hover:bg-yellow-50 text-yellow-700 transition-colors shadow-sm",
        success:
          "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 transition-colors shadow-sm",
      },
      progress: {
        from: "from-yellow-400",
        to: "to-yellow-500",
      },
    },
  },
  charizard: {
    name: "Charizard",
    colors: {
      primary: "orange",
      secondary: "red",
      accent: "orange",
      background: {
        main: "bg-gradient-to-br from-orange-50 via-red-50 to-orange-50",
        sidebar: "bg-white",
        card: "bg-white",
      },
      dropdown: {
        background: "bg-white",
        hover: "hover:bg-orange-50",
        input: "bg-orange-50/50",
      },
      text: {
        primary: "text-orange-900",
        secondary: "text-orange-700",
        accent: "text-orange-600",
      },
      border: {
        light: "border-orange-200",
        accent: "border-orange-200/60",
      },
      button: {
        primary:
          "bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm",
        secondary:
          "bg-white hover:bg-orange-50 text-orange-700 transition-colors shadow-sm",
        success:
          "bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm",
      },
      progress: {
        from: "from-orange-500",
        to: "to-red-500",
      },
    },
  },
  umbreon: {
    name: "Umbreon",
    colors: {
      primary: "slate",
      secondary: "yellow",
      accent: "yellow",
      background: {
        main: "bg-gradient-to-br from-slate-50 via-yellow-50 to-slate-50",
        sidebar: "bg-white",
        card: "bg-white",
      },
      dropdown: {
        background: "bg-white",
        hover: "hover:bg-slate-50",
        input: "bg-slate-50/50",
      },
      text: {
        primary: "text-slate-900",
        secondary: "text-slate-700",
        accent: "text-yellow-600",
      },
      border: {
        light: "border-slate-200",
        accent: "border-yellow-200/60",
      },
      button: {
        primary:
          "bg-yellow-500 hover:bg-yellow-600 text-slate-900 transition-colors shadow-sm",
        secondary:
          "bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm",
        success:
          "bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition-colors shadow-sm",
      },
      progress: {
        from: "from-yellow-400",
        to: "to-yellow-500",
      },
    },
  },
  mew: {
    name: "Mew",
    colors: {
      primary: "pink",
      secondary: "rose",
      accent: "pink",
      background: {
        main: "bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50",
        sidebar: "bg-white",
        card: "bg-white",
      },
      dropdown: {
        background: "bg-white",
        hover: "hover:bg-pink-50",
        input: "bg-pink-50/50",
      },
      text: {
        primary: "text-pink-900",
        secondary: "text-pink-700",
        accent: "text-pink-600",
      },
      border: {
        light: "border-pink-200",
        accent: "border-pink-200/60",
      },
      button: {
        primary:
          "bg-pink-500 hover:bg-pink-600 text-white transition-colors shadow-sm",
        secondary:
          "bg-white hover:bg-pink-50 text-pink-700 transition-colors shadow-sm",
        success:
          "bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-sm",
      },
      progress: {
        from: "from-pink-400",
        to: "to-rose-500",
      },
    },
  },
};

// Add dark variants for all themes
const lightThemes = { ...themes };
Object.keys(lightThemes).forEach((key) => {
  const lightTheme = lightThemes[key];
  const accentColor = lightTheme.colors.accent;
  themes[`${key}_dark`] = createDarkVariant(lightTheme, accentColor);
});
