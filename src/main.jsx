import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/ThemeContent.jsx";
import { QueryProvider } from "./providers/QueryProvider.jsx";
import StorageInitializer from "./components/StorageInitializer.jsx";

// Import migration test utilities for development
if (process.env.NODE_ENV === "development") {
  import("./utils/migrationTest.js");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <StorageInitializer>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </StorageInitializer>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);
