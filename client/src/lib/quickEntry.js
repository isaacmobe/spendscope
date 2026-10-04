import { AREAS, INCOME_WORDS } from "./areas.js";
import { APP } from "../config/app.js";

/**
 * quickEntry.js
 * -------------
 * Turns one line of text into an entry, for the quick-add bar:
 *   "food 450 lunch"       expense, Food, 450, note "lunch"
 *   "rent 30k"             expense, Housing, 30,000
 *   "+85000 salary"        income 85,000, note "salary"
 *   "fare $2 boda"         expense, Transport, 2 USD
 * Words that mean an area come from the aliases in areas.js. Nothing is guessed: if the area or
 * the amount is missing the result is an error message to show, not a made-up entry.
 */
const AREA_BY_WORD = new Map(AREAS.flatMap((a) => a.aliases.map((w) => [w, a.id])));
const DROPPED_WORDS = new Set(["earn", "earned", "income"]); // meaningful, but not worth keeping as a note

// 1,200 / 1.5k / 2m / $20 / usd20 / 450kes, with an optional leading +.
const AMOUNT = /^(\+)?(\$|kes|ksh|usd)?(\d[\d,]*(?:\.\d+)?)([km])?(kes|ksh|usd)?$/i;

function readAmount(word) {
  const m = AMOUNT.exec(word);
  if (!m) return null;
  let amount = Number(m[3].replaceAll(",", ""));
  if (!Number.isFinite(amount)) return null;
  if (m[4]) amount *= m[4].toLowerCase() === "k" ? 1e3 : 1e6;
  const unit = (m[2] || m[5] || "").toLowerCase();
  return { amount, plus: Boolean(m[1]), currency: unit === "$" || unit === "usd" ? "USD" : unit ? "KES" : null };
}

export function parseQuickEntry(text, defaultCurrency = "KES") {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { error: "Type something like: food 450 lunch" };

  let amountInfo = null;
  let areaId = null;
  let areaWord = "";
  let income = false;
  const note = [];

  for (const word of words) {
    const amount = amountInfo ? null : readAmount(word);
    if (amount) {
      amountInfo = amount;
      if (amount.plus) income = true;
      continue;
    }
    const key = word.toLowerCase().replace(/[^a-z]/g, "");
    if (INCOME_WORDS.includes(key)) income = true;
    if (DROPPED_WORDS.has(key)) continue;
    if (!areaId && AREA_BY_WORD.has(key)) {
      areaId = AREA_BY_WORD.get(key);
      areaWord = word;
      continue;
    }
    note.push(word);
  }

  if (!amountInfo || !(amountInfo.amount > 0)) return { error: "Add an amount, for example: food 450 lunch" };
  const currency = amountInfo.currency || defaultCurrency;

  if (income) {
    // For earnings an area word is just part of the description.
    const title = (areaWord ? [areaWord, ...note] : note).join(" ").slice(0, APP.noteMax);
    return { type: "income", amount: amountInfo.amount, currency, title: title || "Earnings", areaId: null };
  }
  if (!areaId) return { error: "Which area? Use a word like food, rent, fare, bills, fun or save." };

  // The note is whatever else was typed; if nothing, the word that named the area.
  const title = (note.join(" ") || areaWord).slice(0, APP.noteMax);
  return { type: "expense", areaId, amount: amountInfo.amount, currency, title };
}
