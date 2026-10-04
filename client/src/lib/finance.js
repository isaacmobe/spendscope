import { AREAS, AREA_BY_ID } from "./areas.js";
import { convert, formatMoney } from "./money.js";

/**
 * finance.js
 * ----------
 * Pure functions (no React, no network) that turn raw records into everything the screen
 * shows. The UI only renders what buildSummary() returns, so every number can be tested.
 *
 * The plan is "savings first" (pay yourself first): each month's earnings are split into
 * needs / wants / savings pools (50/30/20 by default, from Warren & Tyagi, "All Your Worth"),
 * the savings pool is treated as already spent, and only the rest is spendable.
 */
const DAY_MS = 86400000;
const AVG_MONTH_DAYS = 30.44;
const MAX_MONTHS = 600; // a projection longer than 50 years is shown as "not reachable"

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

// Whole months until `saved` reaches `target`, or null if it never gets there (or takes > 50 years).
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
  return Number.isFinite(n) && n <= MAX_MONTHS ? Math.max(1, n) : null;
}

// Monthly amount that must be saved to reach `target` in `months`.
export function requiredMonthly(target, saved, months, apr = 0) {
  const r = apr / 100 / 12;
  if (r === 0) return Math.max(0, (target - saved) / months);
  const growth = Math.pow(1 + r, months);
  const need = target - saved * growth;
  return need <= 0 ? 0 : (need * r) / (growth - 1);
}

// Presentation-only "saver level" (0 to 5) from the share of earnings actually saved this month.
// 20% is level 5 because it is the savings share of the 50/30/20 rule.
export function saverLevel(rate) {
  if (rate <= 0) return 0;
  if (rate < 0.05) return 1;
  if (rate < 0.1) return 2;
  if (rate < 0.15) return 3;
  if (rate < 0.2) return 4;
  return 5;
}

/**
 * buildSummary({ transactions, bills, goal, settings, now })
 * ----------------------------------------------------------
 * All money in the result is in settings.currency.
 * Savings contributions are expense-type transactions in the "savings" area; the goal's total
 * saved = its starting balance + every savings contribution ever made.
 */
export function buildSummary({ transactions, bills, goal, settings, now = new Date() }) {
  const { currency, usdToKes, allocation } = settings;
  const apr = settings.savingsApr || 0;
  const emergencyMonths = settings.emergencyMonths || 3;
  const to = (amount, from) => convert(amount, from || "KES", currency, usdToKes);
  const fmt = (n) => formatMoney(n, currency);

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // 1) Walk the transactions once: earnings (this and last month), spend per area, lifetime savings.
  let income = 0;
  let prevIncome = 0;
  let savedAllTime = 0;
  const spent = Object.fromEntries(AREAS.map((a) => [a.id, 0]));
  // This month's raw entries per area (and earnings) for the detail panels.
  const entries = Object.fromEntries(AREAS.map((a) => [a.id, []]));
  const incomeEntries = [];
  for (const t of transactions) {
    const value = to(t.amount, t.currency);
    const when = new Date(t.date);
    const inMonth = sameMonth(when, now);
    if (t.type === "income") {
      if (inMonth) {
        income += value;
        incomeEntries.push(t);
      } else if (sameMonth(when, prevMonth)) {
        prevIncome += value;
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

  // 3) The plan: pay yourself first. Savings pool is set aside before anything else.
  const pools = {
    needs: (income * allocation.needs) / 100,
    wants: (income * allocation.wants) / 100,
    savings: (income * allocation.savings) / 100
  };
  const spendable = income - pools.savings; // what is left to live on after saving

  // Month progress, used to project variable spending to month end.
  const dim = daysInMonth(now.getFullYear(), now.getMonth());
  const elapsed = now.getDate() / dim;
  const daysLeft = dim - now.getDate();

  const areas = AREAS.map((a) => {
    const budget = pools[a.group] * a.weight;
    const projected = a.variable && elapsed >= 0.2 ? spent[a.id] / elapsed : null;
    return {
      ...a,
      budget,
      spent: spent[a.id],
      projected,
      ratio: budget > 0 ? spent[a.id] / budget : spent[a.id] > 0 ? 2 : 0
    };
  });

  const groupSpent = {
    needs: areas.filter((a) => a.group === "needs").reduce((s, a) => s + a.spent, 0),
    wants: spent.lifestyle,
    savings: spent.savings
  };
  const totalSpent = groupSpent.needs + groupSpent.wants;
  const leftover = income - totalSpent - groupSpent.savings;
  const savingsRate = income > 0 ? groupSpent.savings / income : 0;
  const level = saverLevel(savingsRate);

  // 4) Goal projection (the motorbike), with growth if the user sets a savings rate.
  let goalSummary = null;
  if (goal) {
    const target = to(goal.targetAmount, goal.currency);
    const saved = to(goal.savedAmount || 0, goal.currency) + savedAllTime;
    const remaining = Math.max(0, target - saved);
    const monthsToGo = monthsToReach(target, saved, pools.savings, apr);
    const g = {
      name: goal.name,
      target,
      saved,
      remaining,
      progress: target > 0 ? Math.min(1, saved / target) : 0,
      monthsToGo,
      eta: monthsToGo == null ? null : addMonths(now, monthsToGo),
      required: null,
      onTrack: null,
      suggestedPercent: null,
      gap: 0,
      interest: 0,
      soonerBy: null,
      reached: remaining === 0
    };

    if (monthsToGo) {
      // Growth earned on the way, and how much sooner 5 more points of earnings would get you there.
      g.interest = Math.max(0, futureBalance(saved, pools.savings, apr, monthsToGo) - saved - pools.savings * monthsToGo);
      if (income > 0) {
        const faster = monthsToReach(target, saved, pools.savings + income * 0.05, apr);
        if (faster != null && faster < monthsToGo) g.soonerBy = monthsToGo - faster;
      }
    }

    if (goal.deadline && remaining > 0) {
      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline) - now) / (AVG_MONTH_DAYS * DAY_MS)));
      g.required = requiredMonthly(target, saved, monthsLeft, apr);
      g.onTrack = pools.savings >= g.required - 0.5;
      g.gap = Math.max(0, g.required - pools.savings);
      if (income > 0) g.suggestedPercent = Math.ceil((g.required / income) * 100);
    }
    goalSummary = g;
  }

  // 5) Safety net: months of planned essential spending (needs share of earnings).
  const emergencyTarget = pools.needs * emergencyMonths;

  // 6) Bills due in the next 7 days.
  const today = startOfDay(now);
  const dueSoon = bills
    .map((b) => {
      const due = nextDueDate(b.dueDay, now);
      return { ...b, due, inDays: Math.round((due - today) / DAY_MS), value: to(b.amount, b.currency) };
    })
    .filter((b) => b.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays);

  // 7) Plain-language advice, most important first.
  const insights = [];
  const add = (tone, text) => insights.push({ tone, text });

  if (income === 0) {
    add("info", "Record this month's earnings in the core to unlock your plan.");
  } else {
    if (totalSpent + groupSpent.savings > income) {
      add("warn", `You have spent ${fmt(totalSpent + groupSpent.savings - income)} more than you earned this month. Nothing is left to save.`);
    }
    for (const a of areas.filter((x) => x.group !== "savings" && x.budget > 0 && x.spent > x.budget).slice(0, 2)) {
      add("warn", `${a.label} is ${fmt(a.spent - a.budget)} over its share of this month's plan.`);
    }
    for (const a of areas.filter((x) => x.projected != null && x.budget > 0 && x.spent <= x.budget && x.projected > x.budget * 1.1).slice(0, 1)) {
      add("warn", `At this pace ${a.label} will reach about ${fmt(a.projected)} by month end, above its ${fmt(a.budget)} share.`);
    }
    if (daysLeft <= 7 && leftover > 0) {
      add("info", `${fmt(leftover)} is still unspent. Move it to savings before the month ends so it does not get spent by accident.`);
    } else if (groupSpent.savings < pools.savings) {
      add("info", `Pay yourself first: set aside ${fmt(pools.savings - groupSpent.savings)} more this month to match your savings plan.`);
    }
    if (prevIncome > 0 && income > prevIncome) {
      add("good", `Earnings are ${fmt(income - prevIncome)} above last month. Saving half of any increase (${fmt((income - prevIncome) / 2)}) raises your savings without cutting your spending.`);
    }
  }

  if (goalSummary && !goalSummary.reached) {
    if (goalSummary.required != null && !goalSummary.onTrack) {
      const wants = Math.min(goalSummary.gap, pools.wants);
      const pct = goalSummary.suggestedPercent != null ? ` (about ${goalSummary.suggestedPercent}% of this month's earnings)` : "";
      add("warn", `To buy the ${goalSummary.name} by your deadline you need ${fmt(goalSummary.required)} a month${pct}; the plan saves ${fmt(pools.savings)}. Close the ${fmt(goalSummary.gap)} gap by trimming Lifestyle${wants > 0 ? ` (up to ${fmt(wants)})` : ""}, raising the savings share, or moving the deadline.`);
    }
    if (goalSummary.soonerBy) {
      add("info", `Saving 5% more of your earnings (${fmt(income * 0.05)} a month) brings the ${goalSummary.name} ${goalSummary.soonerBy} month${goalSummary.soonerBy === 1 ? "" : "s"} closer.`);
    }
    if (apr > 0 && goalSummary.interest > 0) {
      add("info", `Growth at ${apr}% a year adds about ${fmt(goalSummary.interest)} by the time you reach the goal.`);
    }
  }
  if (goalSummary?.reached || !goalSummary) {
    add("good", `${goalSummary ? "Goal reached. Next: build" : "Build"} a safety net of ${fmt(emergencyTarget)} (${emergencyMonths} months of planned essentials).`);
  }
  for (const b of dueSoon) {
    add("info", `${b.name} (${fmt(b.value)}) is due ${b.inDays === 0 ? "today" : `in ${b.inDays} day${b.inDays === 1 ? "" : "s"}`}.`);
  }

  return {
    currency,
    income,
    prevIncome,
    incomeEntries,
    entries,
    pools,
    spendable,
    areas,
    groupSpent,
    totalSpent,
    leftover,
    billsTotal,
    savingsRate,
    level,
    daysLeft,
    emergencyTarget,
    emergencyMonths,
    apr,
    goal: goalSummary,
    dueSoon,
    insights: insights.slice(0, 6)
  };
}
