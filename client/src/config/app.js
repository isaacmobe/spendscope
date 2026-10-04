/**
 * app.js
 * ------
 * App-wide constants. Values that differ per deployment come from environment variables
 * (VITE_*, set in client/.env or in the Vercel dashboard) with these as fallbacks.
 */
export const APP = Object.freeze({
  name: "SpendScope",
  // Public exchange-rate feed (no API key). Override with VITE_FX_URL to use another provider
  // that returns { rates: { KES: number } }.
  fxUrl: "https://open.er-api.com/v6/latest/USD",
  storage: Object.freeze({ theme: "spendscope-theme", tour: "spendscope-tour-done" }),
  // Longest note allowed on an entry (matches the server).
  noteMax: 60
});
