import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSummary, futureBalance, monthsToReach, nextDueDate, requiredMonthly, saverLevel } from "./finance.js";
import { convert, formatMoney } from "./money.js";

const NOW = new Date(2026, 9, 15); // 15 Oct 2026
const settings = { currency: "KES", usdToKes: 100, allocation: { needs: 50, wants: 30, savings: 20 } };
const tx = (over) => ({ amount: 0, currency: "KES", type: "expense", category: "food", date: new Date(2026, 9, 3).toISOString(), ...over });

test("convert uses the user's rate in both directions", () => {
  assert.equal(convert(1, "USD", "KES", 130), 130);
  assert.equal(convert(130, "KES", "USD", 130), 1);
  assert.equal(convert(50, "KES", "KES", 130), 50);
  assert.equal(formatMoney(12500, "KES"), "KES 12,500");
  assert.equal(formatMoney(1250.5, "USD"), "$1,250.5");
  assert.equal(formatMoney(-205.43, "USD"), "-$205.43");
  assert.equal(formatMoney(-12500, "KES"), "-KES 12,500");
  assert.equal(formatMoney(-0.2, "KES"), "KES 0"); // rounds to zero: no stray minus sign
});

test("only this month's earnings feed the plan, with mixed currencies", () => {
  const s = buildSummary({
    transactions: [
      tx({ type: "income", category: "earnings", amount: 50000 }),
      tx({ type: "income", category: "earnings", amount: 500, currency: "USD" }), // 50,000 KES
      tx({ type: "income", category: "earnings", amount: 99999, date: new Date(2026, 8, 3).toISOString() }) // last month
    ],
    bills: [],
    goal: null,
    settings,
    now: NOW
  });
  assert.equal(s.income, 100000);
  assert.deepEqual(s.pools, { needs: 50000, wants: 30000, savings: 20000 });
  assert.equal(s.pools.needs + s.pools.wants + s.pools.savings, s.income);
});

test("area budgets split their group by weight and spending is tracked", () => {
  const s = buildSummary({
    transactions: [
      tx({ type: "income", category: "earnings", amount: 100000 }),
      tx({ amount: 20000, category: "housing" }),
      tx({ amount: 3000, category: "Mystery" }) // unknown category falls into lifestyle
    ],
    bills: [{ name: "Internet", amount: 3000, currency: "KES", dueDay: 20 }],
    goal: null,
    settings,
    now: NOW
  });
  const by = Object.fromEntries(s.areas.map((a) => [a.id, a]));
  assert.equal(by.housing.budget, 20000); // 50,000 needs * 0.4
  assert.equal(by.housing.ratio, 1);
  assert.equal(by.lifestyle.spent, 3000);
  assert.equal(by.bills.spent, 3000);
  assert.equal(s.totalSpent, 26000);
  assert.equal(s.leftover, 74000);
});

test("motorbike projection: progress, ETA and deadline pace", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ amount: 20000, category: "savings" })], bills: [], settings, now: NOW };
  const goal = { name: "Motorbike", targetAmount: 250000, savedAmount: 30000, currency: "KES" };
  const s = buildSummary({ ...base, goal });
  assert.equal(s.goal.saved, 50000);
  assert.equal(s.goal.remaining, 200000);
  assert.equal(s.goal.monthsToGo, 10); // 200,000 / 20,000 per month
  assert.equal(s.goal.eta.getMonth(), (9 + 10) % 12);

  const tight = buildSummary({ ...base, goal: { ...goal, deadline: new Date(2027, 0, 15).toISOString() } });
  assert.equal(tight.goal.onTrack, false); // needs ~66k/month vs 20k planned
  assert.ok(tight.insights.some((i) => i.text.includes("by your deadline")));

  const done = buildSummary({ ...base, goal: { ...goal, targetAmount: 40000 } });
  assert.equal(done.goal.reached, true);
  assert.equal(done.goal.monthsToGo, 0);
});

test("no earnings gives guidance instead of NaN", () => {
  const s = buildSummary({ transactions: [], bills: [], goal: null, settings, now: NOW });
  assert.equal(s.income, 0);
  assert.ok(s.areas.every((a) => Number.isFinite(a.ratio) && a.budget === 0));
  assert.match(s.insights[0].text, /unlock your plan/);
  const noPlan = buildSummary({ transactions: [], bills: [], goal: { name: "x", targetAmount: 10, savedAmount: 0, currency: "KES" }, settings, now: NOW });
  assert.equal(noPlan.goal.monthsToGo, null);
});

test("nextDueDate handles month ends and rollover", () => {
  assert.equal(nextDueDate(20, NOW).getDate(), 20);
  assert.equal(nextDueDate(10, NOW).getMonth(), 10); // already passed, so November
  assert.equal(nextDueDate(31, new Date(2026, 1, 10)).getDate(), 28); // Feb clamps to 28
  assert.equal(nextDueDate(5, new Date(2026, 11, 20)).getFullYear(), 2027); // December rolls the year
});

test("bills due within a week appear as insights", () => {
  const s = buildSummary({ transactions: [], bills: [{ name: "Rent", amount: 15000, currency: "KES", dueDay: 18 }], goal: null, settings, now: NOW });
  assert.equal(s.dueSoon.length, 1);
  assert.ok(s.insights.some((i) => i.text.includes("Rent") && i.text.includes("in 3 days")));
});

test("compound growth maths: months, balance and required monthly agree with each other", () => {
  // No growth: plain division.
  assert.equal(monthsToReach(100000, 0, 10000, 0), 10);
  assert.equal(monthsToReach(100000, 100000, 10000, 0), 0);
  assert.equal(monthsToReach(100000, 0, 0, 0), null);
  // With growth the answer can only be sooner or equal, and the balance after n months reaches the target.
  const n = monthsToReach(100000, 20000, 8000, 12);
  assert.ok(n <= monthsToReach(100000, 20000, 8000, 0));
  assert.ok(futureBalance(20000, 8000, 12, n) >= 100000);
  assert.ok(futureBalance(20000, 8000, 12, n - 1) < 100000);
  // Growth alone can finish the job when something is already saved.
  assert.ok(monthsToReach(20000, 10000, 0, 12) > 0);
  assert.equal(monthsToReach(20000, 0, 0, 12), null);
  // requiredMonthly is the inverse of futureBalance.
  const need = requiredMonthly(100000, 20000, 10, 12);
  assert.ok(Math.abs(futureBalance(20000, need, 12, 10) - 100000) < 0.01);
  assert.equal(requiredMonthly(100000, 20000, 10, 0), 8000);
  assert.equal(requiredMonthly(1000, 5000, 10, 0), 0);
});

test("a savings rate adds growth to the goal projection", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 })], bills: [], now: NOW };
  const goal = { name: "Motorbike", targetAmount: 250000, savedAmount: 30000, currency: "KES" };
  const flat = buildSummary({ ...base, goal, settings });
  const grown = buildSummary({ ...base, goal, settings: { ...settings, savingsApr: 12 } });
  assert.equal(flat.goal.interest, 0);
  assert.ok(grown.goal.interest > 0);
  assert.ok(grown.goal.monthsToGo <= flat.goal.monthsToGo);
});

test("what-if: saving 5% more of earnings shortens the wait", () => {
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 })],
    bills: [],
    goal: { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES" },
    settings,
    now: NOW
  });
  assert.equal(s.goal.monthsToGo, 13); // 250,000 / 20,000
  assert.equal(s.goal.soonerBy, 3); // 250,000 / 25,000 = 10 months
  assert.ok(s.insights.some((i) => i.text.includes("5% more")));
});

test("deadline gap, suggested savings percent and trim advice", () => {
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 })],
    bills: [],
    goal: { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES", deadline: new Date(2027, 3, 15).toISOString() },
    settings,
    now: NOW
  });
  assert.equal(s.goal.onTrack, false);
  assert.ok(s.goal.gap > 0);
  assert.ok(s.goal.suggestedPercent > 20);
  assert.ok(s.insights.some((i) => i.tone === "warn" && i.text.includes("trimming Lifestyle")));
});

test("safety net target is months of planned essentials", () => {
  const s = buildSummary({ transactions: [tx({ type: "income", category: "earnings", amount: 100000 })], bills: [], goal: null, settings: { ...settings, emergencyMonths: 6 }, now: NOW });
  assert.equal(s.emergencyTarget, 300000); // 50,000 needs * 6
  assert.ok(s.insights.some((i) => i.text.includes("safety net")));
});

test("saver level follows the share of earnings saved", () => {
  assert.deepEqual([0, 0.01, 0.07, 0.12, 0.17, 0.2, 0.4].map(saverLevel), [0, 1, 2, 3, 4, 5, 5]);
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "savings", amount: 12000 })],
    bills: [],
    goal: null,
    settings,
    now: NOW
  });
  assert.equal(s.savingsRate, 0.12);
  assert.equal(s.level, 3);
  assert.equal(s.spendable, 80000);
});

test("raise rule: earnings above last month suggest saving half of the increase", () => {
  const s = buildSummary({
    transactions: [
      tx({ type: "income", category: "earnings", amount: 120000 }),
      tx({ type: "income", category: "earnings", amount: 100000, date: new Date(2026, 8, 5).toISOString() })
    ],
    bills: [],
    goal: null,
    settings,
    now: NOW
  });
  assert.equal(s.prevIncome, 100000);
  assert.ok(s.insights.some((i) => i.tone === "good" && i.text.includes("half of any increase")));
});

test("variable spending is projected to month end and flagged when on pace to overspend", () => {
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "food", amount: 9000 })],
    bills: [],
    goal: null,
    settings,
    now: new Date(2026, 9, 10) // day 10 of 31: 9,000 so far projects to about 27,900 against a 12,500 share
  });
  const food = s.areas.find((a) => a.id === "food");
  assert.ok(food.projected > food.budget);
  assert.ok(s.insights.some((i) => i.text.includes("At this pace Food")));
  assert.equal(s.areas.find((a) => a.id === "housing").projected, null);
});

test("in the last week of the month, unspent money is flagged for savings", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "food", amount: 10000 })], bills: [], goal: null, settings };
  const late = buildSummary({ ...base, now: new Date(2026, 9, 27) });
  assert.equal(late.leftover, 90000);
  assert.ok(late.insights.some((i) => i.text.includes("still unspent")));
  const early = buildSummary({ ...base, now: new Date(2026, 9, 5) });
  assert.ok(!early.insights.some((i) => i.text.includes("still unspent")));
  assert.ok(early.insights.some((i) => i.text.includes("Pay yourself first")));
});
