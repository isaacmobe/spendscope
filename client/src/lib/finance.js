import { AREAS, AREA_BY_ID } from "./areas.js";
import { convert, formatMoney } from "./money.js";

/**
 * finance.js
 * ----------
 * Pure functions (no React, no network) that turn raw records into everything the
 * screen shows: monthly earnings, per-area budgets and spending, the savings plan
 * and the motorbike projection. Keeping this separate makes it easy to test and
 * to explain: the UI only renders what buildSummary() returns.
 */
const DAY_MS = 86400000;
const AVG_MONTH_DAYS = 30.44;

const sameMonth = (d, now) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Next date a monthly bill falls due. A due day of 31 becomes the last day of shorter months.
export function nextDueDate(dueDay, now = new Date()) {
  const today = startOfDay(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const thisMonth = new Date(y, m, Math.min(dueDay, daysInMonth(y, m)));
  if (thisMonth >= today) return thisMonth;
  const ny = m === 11 ? y + 1 : y;
  const nm = (m + 1) % 12;
  return new Date(ny, nm, Math.min(dueDay, daysInMonth(ny, nm)));
}

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * buildSummary({ transactions, bills, goal, settings, now })
 * ----------------------------------------------------------
 * All money in the result is in settings.currency.
 * Savings contributions are expense-type transactions in the "savings" area; the
 * goal's total saved = its starting balance + every savings contribution ever made.
 */
export function buildSummary({ transactions, bills, goal, settings, now = new Date() }) {
  const { currency, usdToKes, allocation } = settings;
  const to = (amount, from) => convert(amount, from || "KES", currency, usdToKes);
  const fmt = (n) => formatMoney(n, currency);

  // 1) Walk the transactions once: this month's earnings, spend per area, lifetime savings.
  let income = 0;
  let savedAllTime = 0;
  const spent = Object.fromEntries(AREAS.map((a) => [a.id, 0]));
  // This month's raw entries per area (and earnings), newest first, for the detail panels.
  const entries = Object.fromEntries(AREAS.map((a) => [a.id, []]));
  const incomeEntries = [];
  for (const t of transactions) {
    const value = to(t.amount, t.currency);
    const inMonth = sameMonth(new Date(t.date), now);
    if (t.type === "income") {
      if (inMonth) {
        income += value;
        incomeEntries.push(t);
      }
      continue;
    }
    // Unknown or old categories count as lifestyle so nothing silently disappears.
    const id = AREA_BY_ID[t.category] ? t.category : "lifestyle";
    if (id === "savings") savedAllTime += value;
    if (inMonth) {
      spent[id] += value;
      entries[id].push(t);
    }
  }

  // 2) Recurring bills are committed spending every month.
  const billsTotal = bills.reduce((sum, b) => sum + to(b.amount, b.currency), 0);
  spent.bills += billsTotal;

  // 3) The plan: split this month's earnings into needs / wants / savings pools.
  const pools = {
    needs: (income * allocation.needs) / 100,
    wants: (income * allocation.wants) / 100,
    savings: (income * allocation.savings) / 100
  };

  const areas = AREAS.map((a) => {
    const budget = pools[a.group] * a.weight;
    return { ...a, budget, spent: spent[a.id], ratio: budget > 0 ? spent[a.id] / budget : spent[a.id] > 0 ? 2 : 0 };
  });

  const groupSpent = {
    needs: areas.filter((a) => a.group === "needs").reduce((s, a) => s + a.spent, 0),
    wants: spent.lifestyle,
    savings: spent.savings
  };
  const totalSpent = groupSpent.needs + groupSpent.wants;
  const leftover = income - totalSpent - groupSpent.savings;

  // 4) Goal projection (the motorbike).
  let goalSummary = null;
  if (goal) {
    const target = to(goal.targetAmount, goal.currency);
    const saved = to(goal.savedAmount || 0, goal.currency) + savedAllTime;
    const remaining = Math.max(0, target - saved);
    const monthsToGo = remaining === 0 ? 0 : pools.savings > 0 ? Math.ceil(remaining / pools.savings - 1e-9) : null;
    let required = null;
    let onTrack = null;
    if (goal.deadline && remaining > 0) {
      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline) - now) / (AVG_MONTH_DAYS * DAY_MS)));
      required = remaining / monthsLeft;
      onTrack = pools.savings >= required;
    }
    goalSummary = {
      name: goal.name,
      target,
      saved,
      remaining,
      progress: target > 0 ? Math.min(1, saved / target) : 0,
      monthsToGo,
      eta: monthsToGo == null ? null : addMonths(now, monthsToGo),
      required,
      onTrack,
      reached: remaining === 0
    };
  }

  // 5) Bills due in the next 7 days.
  const today = startOfDay(now);
  const dueSoon = bills
    .map((b) => {
      const due = nextDueDate(b.dueDay, now);
      return { ...b, due, inDays: Math.round((due - today) / DAY_MS), value: to(b.amount, b.currency) };
    })
    .filter((b) => b.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays);

  // 6) Plain-language, rule-based advice.
  const insights = [];
  if (income === 0) {
    insights.push("Record this month's earnings in the core to unlock your plan.");
  } else {
    for (const a of areas) {
      if (a.group !== "savings" && a.spent > a.budget && a.budget > 0) {
        insights.push(`${a.label} is ${fmt(a.spent - a.budget)} over its share of this month's plan.`);
      }
    }
    if (totalSpent > income) {
      insights.push(`You have spent ${fmt(totalSpent - income)} more than you earned this month. Nothing is left to save.`);
    } else if (groupSpent.savings < pools.savings) {
      insights.push(`Set aside ${fmt(pools.savings - groupSpent.savings)} more this month to match your savings plan.`);
    }
  }
  if (goalSummary && !goalSummary.reached && goalSummary.required != null && !goalSummary.onTrack) {
    insights.push(
      `To reach "${goalSummary.name}" by your deadline you need ${fmt(goalSummary.required)} a month, but the plan sets aside ${fmt(pools.savings)}. Raise your savings share or move the deadline.`
    );
  }
  for (const b of dueSoon) {
    insights.push(`${b.name} (${fmt(b.value)}) is due ${b.inDays === 0 ? "today" : `in ${b.inDays} day${b.inDays === 1 ? "" : "s"}`}.`);
  }

  return { currency, income, incomeEntries, entries, pools, areas, groupSpent, totalSpent, leftover, billsTotal, goal: goalSummary, dueSoon, insights };
}
