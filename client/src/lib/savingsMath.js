import { PLAN } from "../config/plan.js";

/**
 * savingsMath.js
 * --------------
 * Compound-growth maths for savings goals. Pure functions, no React.
 */

/* ------------------------------------------------------------------ */
/* Savings maths (compound growth). r = monthly rate = apr / 100 / 12. */
/* ------------------------------------------------------------------ */

// Balance after `months` of saving `monthly` at the end of each month, starting from `saved`.
export function futureBalance(saved, monthly, apr, months) {
  const r = apr / 100 / 12;
  if (r === 0) return saved + monthly * months;
  const growth = Math.pow(1 + r, months);
  return saved * growth + (monthly * (growth - 1)) / r;
}

// Whole months until `saved` reaches `target`, or null if it never gets there (or takes too long).
// Solves saved*(1+r)^n + monthly*((1+r)^n - 1)/r = target for n.
export function monthsToReach(target, saved, monthly, apr = 0) {
  if (saved >= target) return 0;
  if (monthly <= 0 && (apr <= 0 || saved <= 0)) return null;
  const r = apr / 100 / 12;
  let n;
  if (r === 0) {
    n = (target - saved) / monthly;
  } else {
    const k = monthly / r;
    n = Math.log((target + k) / (saved + k)) / Math.log(1 + r);
  }
  n = Math.ceil(n - 1e-9);
  return Number.isFinite(n) && n <= PLAN.maxProjectionMonths ? Math.max(1, n) : null;
}

// Monthly amount that must be saved to reach `target` in `months`.
export function requiredMonthly(target, saved, months, apr = 0) {
  const r = apr / 100 / 12;
  if (r === 0) return Math.max(0, (target - saved) / months);
  const growth = Math.pow(1 + r, months);
  const need = target - saved * growth;
  return need <= 0 ? 0 : (need * r) / (growth - 1);
}
