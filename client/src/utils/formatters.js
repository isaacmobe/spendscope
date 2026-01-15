/**
 * formatters.js
 * -------------
 * Utility helpers used across the UI.
 * Keeping formatting logic here prevents duplication in components.
 */

export function formatMoney(value) {
  const n = Number(value || 0);

  // Convert number to a readable string like "12,500"
  return n.toLocaleString();
}
