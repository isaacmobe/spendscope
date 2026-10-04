/**
 * defaults.js
 * -----------
 * Starting values for a NEW account. Nothing here is baked into the code paths: change them
 * with environment variables (see .env.example) or edit this one file. Users can change all
 * of them later in Settings, and existing accounts keep what they already chose.
 */
const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== undefined && value !== "" ? Number(value) : fallback);

export const defaults = Object.freeze({
  currency: process.env.DEFAULT_CURRENCY === "USD" ? "USD" : "KES",
  // KES per 1 USD. Only a starting point; the app can fetch a live rate and users can type their own.
  usdToKes: num(process.env.DEFAULT_USD_TO_KES, 129),
  allocation: Object.freeze({
    needs: num(process.env.DEFAULT_SPLIT_NEEDS, 50),
    wants: num(process.env.DEFAULT_SPLIT_WANTS, 30),
    savings: num(process.env.DEFAULT_SPLIT_SAVINGS, 20)
  }),
  savingsApr: num(process.env.DEFAULT_SAVINGS_APR, 0),
  emergencyMonths: num(process.env.DEFAULT_EMERGENCY_MONTHS, 3)
});
