import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config.
 * - The dev server uses port 5290 (not Vite's default 5173) so it never clashes with other
 *   projects. strictPort makes it fail loudly instead of silently picking another port.
 * - /api is proxied to the Express server, so the browser only ever talks to one origin
 *   (no CORS setup, and the login cookie just works).
 * Both can be overridden without touching code, in client/.env:
 *   CLIENT_PORT=5290
 *   API_TARGET=http://localhost:5000
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.CLIENT_PORT) || 5290;
  const apiTarget = env.API_TARGET || "http://localhost:5000";

  return {
    plugins: [react()],
    server: { port, strictPort: true, proxy: { "/api": apiTarget } },
    preview: { port, strictPort: true, proxy: { "/api": apiTarget } }
  };
});
