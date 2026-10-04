/**
 * fx.js
 * -----
 * Fetches today's KES per 1 USD from a public feed so the exchange rate does not have to be
 * typed by hand. The feed shape expected is { result?: "success", rates: { KES: number } }
 * (the open.er-api.com format). On any failure the caller keeps the user's own rate.
 */
export function parseUsdToKes(payload) {
  if (payload && payload.result && payload.result !== "success") return null;
  const rate = Number(payload?.rates?.KES);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function fetchUsdToKes(url, fetchFn = fetch) {
  const res = await fetchFn(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`The rate service answered ${res.status}.`);
  const json = await res.json();
  const rate = parseUsdToKes(json);
  if (rate == null) throw new Error("The rate service did not return a KES rate.");
  return { rate: Math.round(rate * 100) / 100, updated: json.time_last_update_utc || null };
}
