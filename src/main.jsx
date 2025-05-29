import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/ThemeContent.jsx";
import { QueryProvider } from "./providers/QueryProvider.jsx";

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
