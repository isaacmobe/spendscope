import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSummary, nextDueDate } from "./finance.js";
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
  assert.ok(tight.insights.some((i) => i.includes("by your deadline")));

  const done = buildSummary({ ...base, goal: { ...goal, targetAmount: 40000 } });
  assert.equal(done.goal.reached, true);
  assert.equal(done.goal.monthsToGo, 0);
});

test("no earnings gives guidance instead of NaN", () => {
  const s = buildSummary({ transactions: [], bills: [], goal: null, settings, now: NOW });
  assert.equal(s.income, 0);
  assert.ok(s.areas.every((a) => Number.isFinite(a.ratio) && a.budget === 0));
  assert.match(s.insights[0], /unlock your plan/);
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
  assert.ok(s.insights.some((i) => i.includes("Rent") && i.includes("in 3 days")));
});
