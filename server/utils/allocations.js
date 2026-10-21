import { HttpError, date, num, oneOf } from "./validate.js";
import { CURRENCIES } from "../models/User.js";

/**
 * parseAllocationPlan(body, goalIds)
 * ----------------------------------
 * Validates one confirmed plan: { lines: [{ envelope, amount }], currency?, date? }.
 * Pure (no database), so it is unit-tested. `goalIds` is the set of goal ids owned by the user, so a
 * plan can never fund someone else's goal or an invented one. Lines with amount 0 are dropped.
 * Returns the rows to insert (without `user`).
 */
export const FIXED_ENVELOPES = ["bills", "housing", "food", "transport", "lifestyle", "starter"];
export const MAX_LINES = 20;

const bad = (message) => new HttpError(400, message);

export function parseAllocationPlan(body, goalIds = new Set()) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw bad("Request body must be a JSON object.");
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw bad("A plan needs at least one line.");
  if (body.lines.length > MAX_LINES) throw bad(`A plan can have at most ${MAX_LINES} lines.`);

  const currency = body.currency === undefined ? "KES" : oneOf(body.currency, "currency", CURRENCIES);
  const when = body.date === undefined ? new Date() : date(body.date, "date");

  const rows = [];
  for (const line of body.lines) {
    if (line === null || typeof line !== "object" || Array.isArray(line)) throw bad("Each plan line must be an object.");
    const amount = num(line.amount, "amount", { min: 0 });
    if (typeof line.envelope !== "string") throw bad("envelope must be text.");
    const goalMatch = /^goal:([a-f\d]{24})$/i.exec(line.envelope);
    if (goalMatch) {
      if (!goalIds.has(goalMatch[1])) throw bad("One of the goals in this plan was not found.");
    } else if (!FIXED_ENVELOPES.includes(line.envelope)) {
      throw bad(`Unknown envelope: ${line.envelope.slice(0, 20)}.`);
    }
    if (amount > 0) rows.push({ envelope: line.envelope, amount, currency, date: when });
  }
  if (rows.length === 0) throw bad("Every line is 0, so there is nothing to save.");
  return rows;
}
