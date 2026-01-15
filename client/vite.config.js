import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite dev proxy:
 * - In development, the React app runs on port 5173
 * - The backend runs on port 5000
 * - This proxy forwards any request starting with /api to the backend
 * - Benefit: avoids CORS issues + keeps frontend code simple (no hardcoded base URL)
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});
