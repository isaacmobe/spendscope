import { AREAS, AREA_BY_ID } from "./areas.js";
import { convert, formatMoney } from "./money.js";
import { MAX_LEVEL, PLAN } from "../config/plan.js";

/**
 * finance.js
 * ----------
 * Pure functions (no React, no network) that turn raw records into everything the screen
 * shows. The UI only renders what buildSummary() returns, so every number can be tested.
 *
 * The plan is "savings first" (pay yourself first): each month's earnings are split into
 * needs / wants / savings pools (50/30/20 by default, from Warren & Tyagi, "All Your Worth"),
 * the savings pool is treated as already spent, and only the rest is spendable.
 * All thresholds live in config/plan.js.
 */
const DAY_MS = 86400000;

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

// Presentation-only "saver level" (0 to MAX_LEVEL) from the share of earnings actually saved this month.
export function saverLevel(rate) {
  if (rate <= 0) return 0;
  return 1 + PLAN.saverLevelSteps.filter((step) => rate >= step).length;
}

/**
 * buildSummary({ transactions, bills, goal, settings, now, today })
 * -----------------------------------------------------------------
 * `now` is any date inside the month being viewed; `today` is the real current date (defaults to
 * `now`). When the viewed month is in the past, forward-looking advice (pace, bills due, ETA,
 * "move unspent to savings") is left out and totals describe that month as it ended.
 * All money in the result is in settings.currency.
 * Savings contributions are expense-type transactions in the "savings" area; the goal's total
 * saved = its starting balance + every savings contribution up to the end of the viewed month.
 */
export function buildSummary({ transactions, bills, goal, settings, now = new Date(), today = now }) {
  const { currency, usdToKes, allocation } = settings;
  const apr = settings.savingsApr || 0;
  const emergencyMonths = settings.emergencyMonths || 3;
  const to = (amount, from) => convert(amount, from || "KES", currency, usdToKes);
  const fmt = (n) => formatMoney(n, currency);

  const year = now.getFullYear();
  const month = now.getMonth();
  const isCurrent = sameMonth(now, today);
  const dim = daysInMonth(year, month);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const dayNow = isCurrent ? today.getDate() : dim;
  const elapsed = dayNow / dim;
  const daysLeft = dim - dayNow;
  const prevMonth = new Date(year, month - 1, 1);

  // 1) Walk the transactions once: earnings (this and last month), spend per area, lifetime savings.
  let income = 0;
  let prevIncome = 0;
  let savedAllTime = 0;
  const spent = Object.fromEntries(AREAS.map((a) => [a.id, 0]));
  const entries = Object.fromEntries(AREAS.map((a) => [a.id, []]));
  const incomeEntries = [];
  const dailySpend = new Array(dim + 1).fill(0); // index = day of month; needs and wants only
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
    if (id === "savings" && when <= monthEnd) savedAllTime += value;
    if (inMonth) {
      spent[id] += value;
      entries[id].push(t);
      if (id !== "savings") dailySpend[when.getDate()] += value;
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
  const livingPool = pools.needs + pools.wants;

  const areas = AREAS.map((a) => {
    const budget = pools[a.group] * a.weight;
    const projected = isCurrent && a.variable && elapsed >= PLAN.paceFromElapsed ? spent[a.id] / elapsed : null;
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

  // 4) Safe to spend: what is left of the living budget (needs + wants), spread over the days left.
  let safeToSpend = null;
  if (isCurrent && income > 0) {
    const remaining = livingPool - totalSpent;
    const days = daysLeft + 1; // today counts
    safeToSpend = { remaining, perDay: remaining / days, days };
  }

  // 5) Spending pace: cumulative needs + wants by day, with bills counted on their due day, against
  // the living budget. Past days only; the chart draws the plan line across the whole month.
  const billsByDay = new Array(dim + 1).fill(0);
  for (const b of bills) billsByDay[Math.min(b.dueDay, dim)] += to(b.amount, b.currency);
  const cumulative = [];
  let running = 0;
  for (let d = 1; d <= dayNow; d++) {
    running += dailySpend[d] + billsByDay[d];
    cumulative.push(running);
  }
  const trend = { days: dim, today: dayNow, cumulative, budget: livingPool };

  // 6) Goal projection (the motorbike), with growth if the user sets a savings rate.
  let goalSummary = null;
  if (goal) {
    const target = to(goal.targetAmount, goal.currency);
    const saved = to(goal.savedAmount || 0, goal.currency) + savedAllTime;
    const remaining = Math.max(0, target - saved);
    const g = {
      name: goal.name,
      target,
      saved,
      remaining,
      progress: target > 0 ? Math.min(1, saved / target) : 0,
      monthsToGo: null,
      eta: null,
      required: null,
      onTrack: null,
      suggestedPercent: null,
      gap: 0,
      interest: 0,
      soonerBy: null,
      reached: remaining === 0
    };

    if (isCurrent) {
      g.monthsToGo = monthsToReach(target, saved, pools.savings, apr);
      g.eta = g.monthsToGo == null ? null : addMonths(today, g.monthsToGo);

      if (g.monthsToGo) {
        // Growth earned on the way, and how much sooner a few more points of earnings would get you there.
        g.interest = Math.max(0, futureBalance(saved, pools.savings, apr, g.monthsToGo) - saved - pools.savings * g.monthsToGo);
        if (income > 0) {
          const faster = monthsToReach(target, saved, pools.savings + income * PLAN.whatIfShare, apr);
          if (faster != null && faster < g.monthsToGo) g.soonerBy = g.monthsToGo - faster;
        }
      }

      if (goal.deadline && remaining > 0) {
        const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline) - today) / (PLAN.daysPerMonth * DAY_MS)));
        g.required = requiredMonthly(target, saved, monthsLeft, apr);
        g.onTrack = pools.savings >= g.required - 0.5;
        g.gap = Math.max(0, g.required - pools.savings);
        if (income > 0) g.suggestedPercent = Math.ceil((g.required / income) * 100);
      }
    }
    goalSummary = g;
  }

  // 7) Safety net: months of planned essential spending (needs share of earnings).
  const emergencyTarget = pools.needs * emergencyMonths;

  // 8) Bills due soon (current month only).
  const todayStart = startOfDay(today);
  const dueSoon = isCurrent
    ? bills
        .map((b) => {
          const due = nextDueDate(b.dueDay, today);
          return { ...b, due, inDays: Math.round((due - todayStart) / DAY_MS), value: to(b.amount, b.currency) };
        })
        .filter((b) => b.inDays <= PLAN.dueSoonDays)
        .sort((a, b) => a.inDays - b.inDays)
    : [];

  // 9) Plain-language advice, most important first.
  const insights = [];
  const add = (tone, text) => insights.push({ tone, text });

  if (income === 0) {
    add("info", isCurrent ? "Record this month's earnings in the core to unlock your plan." : "No earnings were recorded in this month.");
  } else {
    if (totalSpent + groupSpent.savings > income) {
      add("warn", `${isCurrent ? "You have spent" : "You spent"} ${fmt(totalSpent + groupSpent.savings - income)} more than ${isCurrent ? "you earned this month" : "you earned that month"}.${isCurrent ? " Nothing is left to save." : ""}`);
    }
    for (const a of areas.filter((x) => x.group !== "savings" && x.budget > 0 && x.spent > x.budget).slice(0, 2)) {
      add("warn", `${a.label} ${isCurrent ? "is" : "was"} ${fmt(a.spent - a.budget)} over its share of ${isCurrent ? "this month's" : "that month's"} plan.`);
    }
    if (isCurrent) {
      for (const a of areas.filter((x) => x.projected != null && x.budget > 0 && x.spent <= x.budget && x.projected > x.budget * PLAN.paceTolerance).slice(0, 1)) {
        add("warn", `At this pace ${a.label} will reach about ${fmt(a.projected)} by month end, above its ${fmt(a.budget)} share.`);
      }
      if (daysLeft <= PLAN.sweepWithinDays && leftover > 0) {
        add("info", `${fmt(leftover)} is still unspent. Move it to savings before the month ends so it does not get spent by accident.`);
      } else if (groupSpent.savings < pools.savings) {
        add("info", `Pay yourself first: set aside ${fmt(pools.savings - groupSpent.savings)} more this month to match your savings plan.`);
      }
    }
    if (prevIncome > 0 && income > prevIncome) {
      add("good", `Earnings ${isCurrent ? "are" : "were"} ${fmt(income - prevIncome)} above the month before. Saving ${Math.round(PLAN.raiseSaveShare * 100)}% of any increase (${fmt((income - prevIncome) * PLAN.raiseSaveShare)}) raises your savings without cutting your spending.`);
    }
  }

  if (isCurrent && goalSummary && !goalSummary.reached) {
    if (goalSummary.required != null && !goalSummary.onTrack) {
      const wants = Math.min(goalSummary.gap, pools.wants);
      const pct = goalSummary.suggestedPercent != null ? ` (about ${goalSummary.suggestedPercent}% of this month's earnings)` : "";
      add("warn", `To buy the ${goalSummary.name} by your deadline you need ${fmt(goalSummary.required)} a month${pct}; the plan saves ${fmt(pools.savings)}. Close the ${fmt(goalSummary.gap)} gap by trimming Lifestyle${wants > 0 ? ` (up to ${fmt(wants)})` : ""}, raising the savings share, or moving the deadline.`);
    }
    if (goalSummary.soonerBy) {
      add("info", `Saving ${Math.round(PLAN.whatIfShare * 100)}% more of your earnings (${fmt(income * PLAN.whatIfShare)} a month) brings the ${goalSummary.name} ${goalSummary.soonerBy} month${goalSummary.soonerBy === 1 ? "" : "s"} closer.`);
    }
    if (apr > 0 && goalSummary.interest > 0) {
      add("info", `Growth at ${apr}% a year adds about ${fmt(goalSummary.interest)} by the time you reach the goal.`);
    }
  }
  if (isCurrent && (goalSummary?.reached || !goalSummary)) {
    add("good", `${goalSummary ? "Goal reached. Next: build" : "Build"} a safety net of ${fmt(emergencyTarget)} (${emergencyMonths} months of planned essentials).`);
  }
  for (const b of dueSoon) {
    add("info", `${b.name} (${fmt(b.value)}) is due ${b.inDays === 0 ? "today" : `in ${b.inDays} day${b.inDays === 1 ? "" : "s"}`}.`);
  }

  return {
    currency,
    isCurrent,
    monthStart: new Date(year, month, 1),
    income,
    prevIncome,
    incomeEntries,
    entries,
    allocation,
    pools,
    spendable,
    livingPool,
    areas,
    groupSpent,
    totalSpent,
    leftover,
    billsTotal,
    savingsRate,
    level,
    maxLevel: MAX_LEVEL,
    daysLeft,
    safeToSpend,
    trend,
    emergencyTarget,
    emergencyMonths,
    apr,
    goal: goalSummary,
    dueSoon,
    insights: insights.slice(0, 6)
  };
}
