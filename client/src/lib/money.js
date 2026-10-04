/**
 * money.js
 * --------
 * Currency helpers for the two supported currencies, KES and USD.
 * Amounts are stored on the server in the currency they were entered in;
 * everything shown on screen is converted to ONE display currency using the
 * user's own exchange rate (settings.usdToKes), so no external FX service is needed.
 */
export const CURRENCIES = ["KES", "USD"];

// Convert between KES and USD with the user's rate (KES per 1 USD).
export function convert(amount, from, to, usdToKes) {
  const n = Number(amount) || 0;
  if (from === to) return n;
  return from === "USD" ? n * usdToKes : n / usdToKes;
}

// "KES 12,500" or "$1,250.50". KES has no minor unit in daily use, so no decimals.
// Negative amounts put the sign first: "-KES 500", "-$12.40".
export function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  const isUsd = currency === "USD";
  const formatted = new Intl.NumberFormat(isUsd ? "en-US" : "en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isUsd ? 2 : 0
  }).format(Math.abs(n));
  const sign = n < 0 && Number(formatted.replace(/[^\d]/g, "")) > 0 ? "-" : "";
  return `${sign}${isUsd ? "$" : "KES "}${formatted}`;
}

// Shorter text for small hexagon cells: the full amount when it is short enough, otherwise "KES 1.2M" / "KES 340K".
export function formatMoneyFit(amount, currency, maxChars = 11) {
  const full = formatMoney(amount, currency);
  if (full.length <= maxChars) return full;
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const prefix = currency === "USD" ? "$" : "KES ";
  const trim = (v) => String(Math.round(v * 10) / 10);
  if (abs >= 1e9) return `${sign}${prefix}${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${prefix}${trim(abs / 1e6)}M`;
  return `${sign}${prefix}${trim(abs / 1e3)}K`;
}
