import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the FastAPI backend during development
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output goes to frontend/dist, which api.py serves in production
    outDir: "dist",
    emptyOutDir: true,
  },
});
