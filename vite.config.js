import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    // Remove console statements in production
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
  build: {
    // Enable source maps for debugging in production (optional)
    sourcemap: false,
    // Minify the code
    minify: "esbuild",
    // Additional optimizations
    rollupOptions: {
      output: {
        // Remove comments in production
        compact: true,
      },
    },
  },
});
