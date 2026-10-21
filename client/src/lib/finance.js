import { AREAS, AREA_BY_ID } from "./areas.js";
import { convert, formatMoney } from "./money.js";
import { MAX_LEVEL, PLAN } from "../config/plan.js";

/**
 * finance.js
 * ----------
 * Pure functions (no React, no network) that turn raw records into everything the screen
 * shows. The UI only renders what buildSummary() returns, so every number can be tested.
 *
 * The plan is a waterfall, in this order:
 *   1. Earnings this month.
 *   2. Recurring bills come off first (they are committed, whatever else happens).
 *   3. Savings next (pay yourself first): the larger of your minimum savings share and what the goal
 *      deadline needs, but never so much that less than a minimum share of the post-bill money is
 *      left to live on.
 *   4. What remains is the flexible money, divided between needs (housing, food, transport) and
 *      wants (lifestyle) in the ratio set in Settings (50:30 by default, after Warren & Tyagi's
 *      50/30/20 in "All Your Worth").
 * Savings fill a starter emergency fund first, then the goal. All thresholds live in config/plan.js.
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
  const starterMonths = settings.starterMonths ?? PLAN.starterMonths; // 0 = no starter fund
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

  // 3) Starter emergency fund and goal inputs. Savings fill the starter fund first, so only what is
  // saved beyond it counts toward the goal. The starter target is months of bills plus the basic
  // living costs the plan allows for, worked out from the minimum savings share (so it does not
  // depend on how much the goal asks you to save this month).
  const free = Math.max(0, income - billsTotal); // money left once the bills are paid
  const baseRate = allocation.savings / 100;
  const needsShare = allocation.needs + allocation.wants > 0 ? allocation.needs / (allocation.needs + allocation.wants) : 0.5;
  const starterTarget = income > 0 ? starterMonths * (billsTotal + needsShare * free * (1 - baseRate)) : 0;
  const starterFunded = Math.min(savedAllTime, starterTarget);
  const starterRemaining = Math.max(0, starterTarget - starterFunded);

  const goalTarget = goal ? to(goal.targetAmount, goal.currency) : 0;
  const goalSaved = goal ? to(goal.savedAmount || 0, goal.currency) + savedAllTime - starterFunded : 0;
  const goalRemaining = Math.max(0, goalTarget - goalSaved);
  let goalMonthsLeft = null;
  let goalNeed = 0; // what the deadline asks you to save each month, starter fund included
  if (goal && isCurrent && goal.deadline && goalRemaining > 0) {
    goalMonthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline) - today) / (PLAN.daysPerMonth * DAY_MS)));
    goalNeed = requiredMonthly(goalTarget + starterRemaining, goalSaved, goalMonthsLeft, apr);
  }

  // 4) Savings: the larger of the minimum share and the goal's need, capped so living money remains.
  const savingsMin = income * baseRate;
  const savingsCap = free * (1 - PLAN.minLivingShare);
  const savingsPlan = income > 0 ? Math.max(0, Math.min(savingsCap, Math.max(savingsMin, goalNeed))) : 0;
  const flexible = Math.max(0, income - billsTotal - savingsPlan); // spendable after bills and savings

  // 5) Pools. Bills are exact; the flexible money is divided between needs and wants.
  const pools = {
    needs: billsTotal + flexible * needsShare,
    wants: flexible * (1 - needsShare),
    savings: savingsPlan
  };
  const spendable = income - pools.savings; // what is left to live on after saving
  const livingPool = pools.needs + pools.wants;

  // The split actually in force, as whole percentages of earnings (adds to 100).
  const share = (n) => (income > 0 ? Math.round((n / income) * 100) : 0);
  const planShare = { savings: share(pools.savings), wants: share(pools.wants) };
  planShare.needs = income > 0 ? Math.max(0, 100 - planShare.savings - planShare.wants) : 0;

  // Weights of the variable needs areas (housing, food, transport) among themselves.
  const varNeeds = AREAS.filter((a) => a.group === "needs" && a.id !== "bills");
  const varNeedsWeight = varNeeds.reduce((sum, a) => sum + a.weight, 0);

  const areas = AREAS.map((a) => {
    let budget;
    if (a.id === "bills") budget = billsTotal;
    else if (a.group === "needs") budget = flexible * needsShare * (a.weight / varNeedsWeight);
    else if (a.group === "wants") budget = pools.wants;
    else budget = pools.savings;
    const projected = isCurrent && a.variable && elapsed >= PLAN.paceFromElapsed ? spent[a.id] / elapsed : null;
    return {
      ...a,
      budget,
      spent: spent[a.id],
      projected,
      // Bills are committed in full, so "exactly the bills" is 100%, not an overspend.
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

  // 6) Goal projection (the motorbike), with growth if the user sets a savings rate. Savings first
  // fill the starter fund, which delays the goal by the months that takes.
  let goalSummary = null;
  if (goal) {
    const g = {
      name: goal.name,
      target: goalTarget,
      saved: goalSaved,
      remaining: goalRemaining,
      progress: goalTarget > 0 ? Math.min(1, goalSaved / goalTarget) : 0,
      monthsToGo: null,
      eta: null,
      required: null,
      onTrack: null,
      suggestedPercent: null,
      gap: 0,
      interest: 0,
      soonerBy: null,
      starterDelay: 0,
      reached: goalRemaining === 0
    };

    if (isCurrent) {
      // The starter fund and the goal are one running total of savings, so they share one month count
      // (rounding the two separately would overshoot). The starter fund is shown as a delay for context.
      const total = goalTarget + starterRemaining;
      g.starterDelay = starterRemaining > 0 && pools.savings > 0 ? Math.ceil(starterRemaining / pools.savings - 1e-9) : 0;
      g.monthsToGo = monthsToReach(total, goalSaved, pools.savings, apr);
      g.eta = g.monthsToGo == null ? null : addMonths(today, g.monthsToGo);

      if (g.monthsToGo) {
        // Growth earned on the way, and how much sooner a few more points of earnings would get you there.
        g.interest = Math.max(0, futureBalance(goalSaved, pools.savings, apr, g.monthsToGo) - goalSaved - pools.savings * g.monthsToGo);
        if (income > 0) {
          const faster = monthsToReach(total, goalSaved, pools.savings + income * PLAN.whatIfShare, apr);
          if (faster != null && faster < g.monthsToGo) g.soonerBy = g.monthsToGo - faster;
        }
      }

      if (goalMonthsLeft != null) {
        g.required = goalNeed;
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
    if (isCurrent) {
      const pct = (n) => Math.round((n / income) * 100);
      add("info", `Bills take ${fmt(billsTotal)} (${pct(billsTotal)}% of earnings). Saving ${fmt(pools.savings)} (${pct(pools.savings)}%) leaves ${fmt(flexible)} to spend.`);
      if (starterRemaining > 0) {
        add("info", `Your first ${fmt(starterTarget)} of savings builds a starter emergency fund (${fmt(starterRemaining)} to go). The ${goal ? goal.name : "goal"} fund starts after that.`);
      }
      if (goalNeed > savingsMin + 0.5 && pools.savings >= goalNeed - 0.5) {
        add("info", `Your deadline needs ${fmt(goalNeed)} a month, so the plan saves ${pct(goalNeed)}% of earnings, above your ${Math.round(baseRate * 100)}% minimum.`);
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
    allocation: planShare,
    settingsAllocation: allocation,
    free,
    flexible,
    savingsMin,
    savingsCap,
    goalNeed,
    starter: { target: starterTarget, funded: starterFunded, remaining: starterRemaining, months: starterMonths },
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
    insights: insights.slice(0, 8)
  };
}
