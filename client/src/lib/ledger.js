import { PLAN } from "../config/plan.js";
import { AREAS, AREA_BY_ID } from "./areas.js";
import { DAY_MS, addMonths, daysInMonth, dueCount, sameMonth } from "./dates.js";
import { convert } from "./money.js";
import { monthsToReach, requiredMonthly } from "./savingsMath.js";

/**
 * ledger.js
 * ---------
 * The envelope plan, as pure functions (no React, no network), so every number can be tested.
 *
 * How it works. Every time money arrives you PLAN it: each shilling is given a job. A plan is a
 * set of allocations, one per envelope:
 *   bills / housing / food / transport / lifestyle   spending envelopes
 *   starter                                          the starter emergency fund
 *   goal:<id>                                        one of your savings goals
 * An envelope's balance = money allocated to it - money spent from it, and it carries forward, so
 * unspent money stays where you put it. "To assign" = all earnings - everything allocated.
 *
 * suggestPlan() proposes a split for an amount (the waterfall: bills, then savings, then living
 * money), and checkPlan() works out what any split means for your goals, so you can change amounts
 * and watch the effect before you confirm.
 */

export const STARTER = "starter";
export const goalEnvelope = (id) => `goal:${id}`;
export const isGoalEnvelope = (e) => typeof e === "string" && e.startsWith("goal:");
export const SPENDING = AREAS.map((a) => a.id); // bills, housing, food, transport, lifestyle

// Spending envelopes that make up everyday spending money (bills are committed separately).
const LIVING = ["housing", "food", "transport", "lifestyle"];

// Smallest step of money in a currency: whole shillings, cents for dollars.
const unit = (currency) => (currency === "USD" ? 0.01 : 1);
const roundTo = (value, step) => Math.round(value / step) * step;
const clean = (n) => Math.round(n * 100) / 100; // tidy floating point noise

/**
 * buildLedger({ transactions, allocations, bills, goals, settings, now })
 * Everything is converted to settings.currency with the user's rate.
 */
export function buildLedger({ transactions = [], allocations = [], bills = [], goals = [], settings, now = new Date() }) {
  const { currency, usdToKes } = settings;
  const to = (amount, from) => convert(amount, from || "KES", currency, usdToKes);
  const allocation = settings.allocation;
  const starterMonths = settings.starterMonths ?? PLAN.starterMonths;
  const apr = settings.savingsApr || 0;

  // 1) Earnings, and spending per envelope (unknown categories count as lifestyle so nothing vanishes).
  let incomeTotal = 0;
  let monthIncome = 0;
  let lastMonthIncome = 0;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const incomeEntries = [];
  const spent = Object.fromEntries(SPENDING.map((id) => [id, 0]));
  const entries = Object.fromEntries(SPENDING.map((id) => [id, []]));
  for (const t of transactions) {
    const value = to(t.amount, t.currency);
    const when = new Date(t.date);
    if (t.type === "income") {
      incomeTotal += value;
      incomeEntries.push(t);
      if (sameMonth(when, now)) monthIncome += value;
      else if (sameMonth(when, lastMonth)) lastMonthIncome += value;
      continue;
    }
    const id = AREA_BY_ID[t.category] ? t.category : "lifestyle";
    spent[id] += value;
    entries[id].push(t);
  }

  // 2) Bills: each one is charged automatically on its due day, from the day it was added.
  // Charging starts the day the Bills envelope is first funded (or the bill is added, if later), so
  // bills from before you started planning never show up as a debt.
  const billsTotal = bills.reduce((sum, b) => sum + to(b.amount, b.currency), 0);
  const firstFunded = allocations.filter((a) => a.envelope === "bills").reduce((min, a) => Math.min(min, new Date(a.date).getTime()), Infinity);
  const billsCharged = Number.isFinite(firstFunded)
    ? bills.reduce((sum, b) => sum + dueCount(b.dueDay, new Date(Math.max(firstFunded, new Date(b.createdAt || 0).getTime())), now) * to(b.amount, b.currency), 0)
    : 0;
  spent.bills += billsCharged;

  // 3) Allocations: what each envelope has been given, and how much was planned this month.
  const given = {};
  let allocatedTotal = 0;
  let savedThisMonth = 0;
  for (const a of allocations) {
    const value = to(a.amount, a.currency);
    given[a.envelope] = (given[a.envelope] || 0) + value;
    allocatedTotal += value;
    if ((a.envelope === STARTER || isGoalEnvelope(a.envelope)) && sameMonth(new Date(a.date), now)) savedThisMonth += value;
  }

  const envelopes = Object.fromEntries(
    SPENDING.map((id) => {
      const allocated = given[id] || 0;
      return [id, { id, label: AREA_BY_ID[id].label, allocated, spent: spent[id], balance: allocated - spent[id], entries: entries[id] }];
    })
  );

  // 4) The income this plan is based on: this month's, or last month's before any arrives this month.
  const incomeBasis = monthIncome > 0 ? monthIncome : lastMonthIncome;
  const baseRate = allocation.savings / 100;
  const needsShare = allocation.needs + allocation.wants > 0 ? allocation.needs / (allocation.needs + allocation.wants) : 0.5;

  // 5) Starter emergency fund: months of bills plus basic living costs, from the minimum savings share.
  const free = Math.max(0, incomeBasis - billsTotal);
  const starterTarget = incomeBasis > 0 ? starterMonths * (billsTotal + needsShare * free * (1 - baseRate)) : 0;
  const starterFunded = given[STARTER] || 0;
  const starter = { target: starterTarget, funded: starterFunded, remaining: Math.max(0, starterTarget - starterFunded), months: starterMonths };

  // 6) Goals, in priority order (lowest number first). Savings fill the starter fund first, then goals
  // one after another, so a goal's deadline is met only if the savings stream covers the starter fund
  // still missing plus every goal ahead of it plus the goal itself. `need` is that monthly requirement.
  const monthsPerDay = PLAN.daysPerMonth * DAY_MS;
  let cumulative = starter.remaining;
  const goalList = [...goals]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .map((g) => {
      const target = to(g.targetAmount, g.currency);
      const start = to(g.savedAmount || 0, g.currency);
      const allocated = given[goalEnvelope(g._id)] || 0;
      const saved = start + allocated;
      const remaining = Math.max(0, target - saved);
      cumulative += remaining;
      const monthsLeft = g.deadline && remaining > 0 ? Math.max(1, Math.ceil((new Date(g.deadline) - now) / monthsPerDay)) : null;
      return {
        id: g._id,
        envelope: goalEnvelope(g._id),
        name: g.name,
        target,
        start,
        allocated,
        saved,
        remaining,
        progress: target > 0 ? Math.min(1, saved / target) : 0,
        deadline: g.deadline ? new Date(g.deadline) : null,
        monthsLeft,
        // Monthly savings (growth included) that meets this goal's deadline, or 0 without a deadline.
        need: monthsLeft ? requiredMonthly(cumulative, 0, monthsLeft, apr) : 0,
        reached: remaining === 0
      };
    });

  const dim = daysInMonth(now.getFullYear(), now.getMonth());
  const daysLeft = dim - now.getDate();

  return {
    currency,
    now,
    allocation,
    baseRate,
    needsShare,
    apr,
    incomeTotal,
    monthIncome,
    incomeBasis,
    incomeEntries,
    allocatedTotal,
    toAssign: clean(incomeTotal - allocatedTotal),
    billsTotal,
    envelopes,
    starter,
    goals: goalList,
    savedThisMonth,
    daysLeft,
    daysInMonth: dim,
    // Everyday money available right now (overspent envelopes count as zero here, not as a debt).
    spendingMoney: LIVING.reduce((sum, id) => sum + Math.max(0, envelopes[id].balance), 0)
  };
}

/**
 * suggestPlan(ledger, amount)
 * The waterfall for one amount:
 *   1. Top up bills so the Bills envelope covers a month of bills.
 *   2. Savings: the larger of your minimum share and what goal deadlines need this month, less what
 *      was already saved this month, capped so at least `minLivingShare` of the money left after
 *      bills stays for living. Savings fill the starter fund first, then goals in priority order.
 *   3. The rest is living money: needs (housing, food, transport by weight) and lifestyle, in the
 *      Needs : Wants ratio from Settings.
 * Returns { lines: [{ id, label, amount, reason }], saved } where the lines add up to `amount`.
 */
export function suggestPlan(ledger, amount) {
  const step = unit(ledger.currency);
  const lines = [];
  const add = (id, label, value, reason) => lines.push({ id, label, amount: value, reason });
  const activeGoals = ledger.goals.filter((g) => !g.reached);
  const fmt = (n) => `${ledger.currency === "USD" ? "$" : "KES "}${Math.round(n).toLocaleString("en-US")}`;

  // 1) Bills
  const billsGap = Math.max(0, ledger.billsTotal - ledger.envelopes.bills.balance);
  const bills = Math.min(amount, roundTo(billsGap, step));
  add("bills", "Bills", bills, ledger.billsTotal > 0 ? `Keeps a month of bills (${fmt(ledger.billsTotal)}) covered.` : "No recurring bills yet. Add them under Bills.");
  const free = amount - bills;

  // 2) Savings
  const monthIncome = Math.max(ledger.incomeBasis, amount);
  const need = activeGoals.reduce((max, g) => Math.max(max, g.need), 0); // the tightest deadline decides
  const monthTarget = Math.max(monthIncome * ledger.baseRate, need);
  const cap = free * (1 - PLAN.minLivingShare);
  const saveTotal = roundTo(Math.max(0, Math.min(cap, monthTarget - ledger.savedThisMonth)), step);

  const starterShare = Math.min(saveTotal, roundTo(ledger.starter.remaining, step));
  add("starter", "Emergency fund", starterShare, ledger.starter.remaining > 0 ? `Starter fund first: ${fmt(ledger.starter.funded)} of ${fmt(ledger.starter.target)} saved.` : "Starter fund is full.");

  // Then goals in priority order, each up to what it still needs; anything spare stays in the emergency fund.
  let left = saveTotal - starterShare;
  const goalLines = activeGoals.map((g) => {
    const give = Math.min(left, roundTo(g.remaining, step));
    left -= give;
    return { goal: g, give };
  });
  lines[lines.length - 1].amount += left;
  for (const { goal, give } of goalLines) {
    add(goal.envelope, goal.name, give, goal.need > 0 ? `Deadline needs about ${fmt(goal.need)} a month in total savings.` : "Filled in order of priority.");
  }
  if (activeGoals.length === 0) lines.find((l) => l.id === "starter").reason += " Add a goal to give your savings a purpose.";

  // 3) Living money
  const living = amount - bills - saveTotal;
  const needsPart = living * ledger.needsShare;
  const needsAreas = AREAS.filter((a) => a.group === "needs");
  const weightSum = needsAreas.reduce((s, a) => s + a.weight, 0);
  let used = 0;
  for (const a of needsAreas) {
    const value = roundTo(needsPart * (a.weight / weightSum), step);
    used += value;
    add(a.id, a.label, value, `${Math.round((a.weight / weightSum) * 100)}% of the needs share of your living money.`);
  }
  add("lifestyle", "Lifestyle", clean(living - used), "Everything left: fun, shopping, subscriptions.");

  // Put lines in a friendly order, and make rounding add up exactly.
  const order = ["bills", "starter", ...activeGoals.map((g) => g.envelope), "housing", "food", "transport", "lifestyle"];
  lines.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const diff = clean(amount - total);
  if (diff !== 0) lines.find((l) => l.id === "lifestyle").amount = clean(lines.find((l) => l.id === "lifestyle").amount + diff);
  for (const l of lines) l.amount = clean(Math.max(0, l.amount));
  return { lines, saved: saveTotal };
}

/**
 * checkPlan(ledger, amounts, amount)
 * What a split means. `amounts` is { envelopeId: value }; `amount` is the money being planned.
 * Monthly pace for a goal = its line x (monthly income / this amount): the same split applied to a
 * whole month of earnings.
 */
export function checkPlan(ledger, amounts, amount) {
  const sum = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const left = clean(amount - sum);
  const monthIncome = Math.max(ledger.incomeBasis, amount);
  const factor = amount > 0 ? monthIncome / amount : 1;
  const get = (id) => Number(amounts[id]) || 0;

  const saveIds = [STARTER, ...ledger.goals.map((g) => g.envelope)];
  const saveTotal = saveIds.reduce((s, id) => s + get(id), 0);
  const rate = amount > 0 ? saveTotal / amount : 0;

  // Projection: this payment's lines go in as entered; after that the same monthly savings pace
  // (`pace`) flows in priority order, starter fund first, then each goal in turn.
  const pace = saveTotal * factor;
  const starterMissing = Math.max(0, ledger.starter.target - ledger.starter.funded - get(STARTER));
  let cumulative = starterMissing;
  const goals = ledger.goals.map((g) => {
    const line = get(g.envelope);
    const remainingAfter = Math.max(0, g.target - (g.saved + line));
    cumulative += remainingAfter;
    const done = remainingAfter === 0;
    const months = done ? 0 : pace > 0 ? monthsToReach(cumulative, 0, pace, ledger.apr) : null;
    const faster = done || pace <= 0 ? null : monthsToReach(cumulative, 0, pace + monthIncome * PLAN.whatIfShare, ledger.apr);
    const needed = g.monthsLeft && !done ? requiredMonthly(cumulative, 0, g.monthsLeft, ledger.apr) : 0;
    return {
      id: g.id,
      envelope: g.envelope,
      name: g.name,
      line,
      months,
      eta: months == null ? null : addMonths(ledger.now, months),
      deadline: g.deadline,
      needed,
      onTrack: g.monthsLeft && !done ? months != null && months <= g.monthsLeft : null,
      short: Math.max(0, needed - pace),
      soonerBy: months != null && faster != null && faster < months ? months - faster : null,
      reached: g.reached || done
    };
  });

  const starterLine = get(STARTER);
  const starter = {
    funded: ledger.starter.funded + starterLine,
    target: ledger.starter.target,
    monthsToFull: starterMissing <= 0 ? 0 : pace > 0 ? Math.ceil(starterMissing / pace - 1e-9) : null
  };

  const billsAfter = ledger.envelopes.bills.balance + get("bills");
  const livingAfter = LIVING.reduce((s, id) => s + Math.max(0, ledger.envelopes[id].balance + get(id)), 0);
  const perDay = livingAfter / (ledger.daysLeft + 1);

  const warnings = [];
  if (left > 0.5) warnings.push({ tone: "warn", text: `${ledger.currency === "USD" ? "$" : "KES "}${Math.round(left).toLocaleString("en-US")} is not assigned yet. Every shilling needs a job before you confirm.` });
  if (left < -0.5) warnings.push({ tone: "warn", text: "You have assigned more than you received. Lower a line." });
  if (amount > 0 && rate < ledger.baseRate - 0.005 && left <= 0.5) warnings.push({ tone: "warn", text: `You are saving ${Math.round(rate * 100)}% of this payment, below your ${Math.round(ledger.baseRate * 100)}% minimum.` });
  if (ledger.billsTotal > 0 && billsAfter < ledger.billsTotal - 0.5) warnings.push({ tone: "warn", text: "The Bills envelope does not cover a full month of bills yet." });
  for (const g of goals) if (g.onTrack === false) warnings.push({ tone: "warn", text: `${g.name}: to meet the deadline you need to save about ${Math.round(g.needed).toLocaleString("en-US")} a month in total; this split gives ${Math.round(pace).toLocaleString("en-US")}.` });

  return { sum, left, saveTotal, pace, rate, belowMin: rate < ledger.baseRate - 0.005, factor, goals, starter, billsMonths: ledger.billsTotal > 0 ? billsAfter / ledger.billsTotal : null, perDay, livingAfter, warnings };
}
