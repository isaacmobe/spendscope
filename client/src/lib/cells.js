import { CELL_INFO } from "../config/cells.js";
import { formatMoneyFit } from "./money.js";

/**
 * cells.js
 * --------
 * Turns a summary (from buildSummary) into the descriptors for the information hexagons around the
 * core: what each shows (kicker / value / caption), its tone, and how full its liquid level is.
 * Pure and testable; components only draw what this returns.
 *   tone: "ok" | "warn" | "over" | "good" | "muted"
 */
const monthYear = (d) => d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
const pct = (n) => `${Math.round(n * 100)}%`;

export function buildCells(summary) {
  const { currency, isCurrent, income, pools, groupSpent, allocation, goal, insights, leftover, spendable, level, maxLevel, savingsRate, emergencyTarget, emergencyMonths, safeToSpend, trend, totalSpent, livingPool } = summary;
  const fmt = (n) => formatMoneyFit(n, currency);
  const hasIncome = income > 0;
  const group = (spent, pool) => (pool > 0 ? spent / pool : 0);
  const tone = (ratio) => (ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "ok");

  // Safe to spend (a month summary when looking back).
  let safe;
  if (!isCurrent) {
    safe = { kicker: "Month saved", value: pct(savingsRate), caption: "of earnings", tone: "good", level: Math.min(1, savingsRate / 0.2) };
  } else if (!hasIncome || !safeToSpend) {
    safe = { kicker: "Safe today", value: "--", caption: "add earnings", tone: "muted", level: 0 };
  } else if (safeToSpend.remaining < 0) {
    safe = { kicker: "Safe today", value: `-${fmt(Math.abs(safeToSpend.perDay))}`, caption: "over budget", tone: "over", level: 1 };
  } else {
    safe = { kicker: "Safe today", value: fmt(safeToSpend.perDay), caption: `${safeToSpend.days} day${safeToSpend.days === 1 ? "" : "s"} left`, tone: "ok", level: Math.min(1, livingPool > 0 ? safeToSpend.remaining / livingPool : 0) };
  }

  // Goal / ETA.
  let goalCell;
  if (!goal) goalCell = { kicker: "Goal", value: "Set goal", caption: "Motorbike", tone: "muted", level: 0, icon: "ban" };
  else if (goal.reached) goalCell = { kicker: goal.name, value: "Reached", caption: "time to ride", tone: "good", level: 1, icon: "check" };
  else if (!isCurrent) goalCell = { kicker: goal.name, value: pct(goal.progress), caption: "saved by then", tone: "ok", level: goal.progress, icon: "check" };
  else if (goal.monthsToGo == null) goalCell = { kicker: goal.name, value: "No ETA", caption: "add earnings", tone: "over", level: goal.progress, icon: "ban" };
  else if (goal.onTrack === false) goalCell = { kicker: goal.name, value: "Behind", caption: `needs ${fmt(goal.required)}/mo`, tone: "over", level: goal.progress, icon: "ban" };
  else goalCell = { kicker: goal.name, value: `ETA ${monthYear(goal.eta)}`, caption: `${goal.monthsToGo} month${goal.monthsToGo === 1 ? "" : "s"}`, tone: "ok", level: goal.progress, icon: "check" };

  const needsRatio = group(groupSpent.needs, pools.needs);
  const wantsRatio = group(groupSpent.wants, pools.wants);
  const savedRatio = group(groupSpent.savings, pools.savings);

  const paceRatio = livingPool > 0 ? totalSpent / livingPool : 0;
  const warns = insights.filter((i) => i.tone === "warn").length;

  return [
    { id: "safe", ...safe },
    { id: "goal", ...goalCell },
    { id: "needs", kicker: `Needs ${allocation.needs}%`, value: fmt(pools.needs), caption: `used ${pct(needsRatio)}`, tone: tone(needsRatio), level: Math.min(1, needsRatio) },
    { id: "wants", kicker: `Wants ${allocation.wants}%`, value: fmt(pools.wants), caption: `used ${pct(wantsRatio)}`, tone: tone(wantsRatio), level: Math.min(1, wantsRatio) },
    { id: "pool", kicker: `Savings ${allocation.savings}%`, value: fmt(pools.savings), caption: `saved ${pct(savedRatio)}`, tone: "good", level: Math.min(1, savedRatio) },
    { id: "after", kicker: "After saving", value: fmt(spendable), caption: "to live on", tone: "ok", level: hasIncome ? Math.max(0, Math.min(1, spendable / income)) : 0 },
    { id: "left", kicker: "Left", value: fmt(leftover), caption: isCurrent ? "this month" : "that month", tone: leftover < 0 ? "over" : "ok", level: hasIncome ? Math.max(0, Math.min(1, leftover / income)) : 0 },
    { id: "level", kicker: "Saver level", value: `${level} / ${maxLevel}`, caption: `${pct(savingsRate)} saved`, tone: "good", level: level / maxLevel },
    { id: "net", kicker: "Safety net", value: fmt(emergencyTarget), caption: `${emergencyMonths} month${emergencyMonths === 1 ? "" : "s"}`, tone: "ok", level: 0 },
    { id: "pace", kicker: "Pace", value: livingPool > 0 ? pct(paceRatio) : "--", caption: "of budget", tone: livingPool > 0 ? tone(paceRatio) : "muted", level: Math.min(1, paceRatio), spark: trend.cumulative, sparkMax: Math.max(livingPool, trend.cumulative[trend.cumulative.length - 1] || 0, 1) },
    { id: "advice", kicker: "Advice", value: `${insights.length} tip${insights.length === 1 ? "" : "s"}`, caption: warns ? `${warns} warning${warns === 1 ? "" : "s"}` : "all clear", tone: warns ? "warn" : "ok", level: 0 },
    { id: "quick", kicker: "Quick add", value: "Ctrl K", caption: "type a line", tone: "ok", level: 0 }
  ].map((c) => ({ ...c, info: CELL_INFO[c.id] }));
}
