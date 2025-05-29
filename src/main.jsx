import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/ThemeContent.jsx";
import { QueryProvider } from "./providers/QueryProvider.jsx";
import { initializeStorageSystem } from "./utils/storageInit";
import logger from "./utils/logger";

// Initialize storage system in the background without blocking UI
initializeStorageSystem()
  .then((success) => {
    if (success) {
      logger.info("Storage system initialized successfully in background");
    } else {
      logger.warn(
        "Storage initialization failed - using localStorage fallback"
      );
    }
  })
  .catch((error) => {
    logger.error("Storage initialization error:", error);
    logger.warn("Continuing with localStorage fallback");
  });

// Import migration test utilities for development
if (process.env.NODE_ENV === "development") {
  import("./utils/migrationTest.js");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);
