// Logging utility that can be disabled in production
const isDevelopment = import.meta.env.MODE === "development";
const isDebugMode = import.meta.env.VITE_DEBUG === "true" || isDevelopment;

/**
 * Centralized logging utility
 * - In development: shows all logs
 * - In production: only shows errors (configurable)
 * - Console statements are automatically removed in production builds via Vite config
 */
const logger = {
  /**
   * Debug logs - only shown in development or when VITE_DEBUG=true
   */
  debug: (...args) => {
    if (isDebugMode) {
      console.log("[DEBUG]", ...args);
    }
  },

  /**
   * General logging - shown in development
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Information logs - shown in development
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info("[INFO]", ...args);
    }
  },

  /**
   * Warning logs - shown in development
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn("[WARN]", ...args);
    }
  },

  /**
   * Error logs - always shown (but can be configured)
   * Set VITE_SILENT_ERRORS=true to disable in production
   */
  error: (...args) => {
    const showErrors =
      isDevelopment || import.meta.env.VITE_SILENT_ERRORS !== "true";
    if (showErrors) {
      console.error("[ERROR]", ...args);
    }
  },

  /**
   * Performance logging - only in development
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(`[PERF] ${label}`);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(`[PERF] ${label}`);
    }
  },

  /**
   * Group logging - only in development
   */
  group: (label) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

export default logger;
