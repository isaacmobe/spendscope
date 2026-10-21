import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSummary, futureBalance, monthsToReach, nextDueDate, requiredMonthly, saverLevel } from "./finance.js";
import { convert, formatMoney } from "./money.js";
import { MAX_LEVEL, PLAN } from "../config/plan.js";

const NOW = new Date(2026, 9, 15); // 15 Oct 2026
const settings = { currency: "KES", usdToKes: 100, allocation: { needs: 50, wants: 30, savings: 20 }, starterMonths: 0 }; // starter fund off unless a test turns it on
const withStarter = { ...settings, starterMonths: 1 };
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
  assert.deepEqual(s.pools, { needs: 50000, wants: 30000, savings: 20000 }); // no bills: the plain 50/30/20 split
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
  // Bills 3,000 come off first, savings take 20,000, so 77,000 is flexible: 62.5% needs, 37.5% wants.
  assert.equal(by.bills.budget, 3000);
  assert.equal(by.bills.ratio, 1); // exactly the bills is 100%, not an overspend
  assert.equal(by.savings.budget, 20000);
  assert.equal(by.housing.budget, 24062.5); // 77,000 * 0.625 * (0.4 / 0.8)
  assert.equal(by.food.budget, 15039.0625); // 77,000 * 0.625 * (0.25 / 0.8)
  assert.equal(by.lifestyle.budget, 28875); // 77,000 * 0.375
  assert.equal(by.housing.ratio, 20000 / 24062.5);
  assert.equal(by.lifestyle.spent, 3000);
  assert.equal(by.bills.spent, 3000);
  assert.equal(s.totalSpent, 26000);
  assert.equal(s.leftover, 74000);
});

test("motorbike projection: progress and ETA", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ amount: 20000, category: "savings" })], bills: [], settings, now: NOW };
  const goal = { name: "Motorbike", targetAmount: 250000, savedAmount: 30000, currency: "KES" };
  const s = buildSummary({ ...base, goal });
  assert.equal(s.goal.saved, 50000);
  assert.equal(s.goal.remaining, 200000);
  assert.equal(s.goal.monthsToGo, 10); // 200,000 / 20,000 per month
  assert.equal(s.goal.eta.getMonth(), (9 + 10) % 12);

  const done = buildSummary({ ...base, goal: { ...goal, targetAmount: 40000 } });
  assert.equal(done.goal.reached, true);
  assert.equal(done.goal.monthsToGo, 0);
});

test("a deadline raises savings above the minimum, within what the bills leave", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 })], bills: [], settings, now: NOW };
  // 6 months to find 250,000 = 41,666.67 a month: more than the 20,000 minimum, less than the cap.
  const s = buildSummary({ ...base, goal: { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES", deadline: new Date(2027, 3, 15).toISOString() } });
  assert.ok(Math.abs(s.pools.savings - 250000 / 6) < 0.01);
  assert.equal(s.goal.onTrack, true);
  assert.equal(s.goal.monthsToGo, 6);
  assert.ok(s.pools.savings > s.savingsMin);
  assert.ok(s.insights.length > 0);
});

test("savings never squeeze out living money: capped, and the gap is reported", () => {
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 })],
    bills: [{ name: "Rent", amount: 20000, currency: "KES", dueDay: 1 }],
    goal: { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES", deadline: new Date(2026, 11, 15).toISOString() }, // 3 months
    settings,
    now: NOW
  });
  // 80,000 is free after bills; at most 65% of it (52,000) may be saved, but the goal wants ~83,333.
  assert.equal(s.free, 80000);
  assert.equal(s.pools.savings, 52000);
  assert.equal(s.goal.onTrack, false);
  assert.ok(s.goal.gap > 31000 && s.goal.gap < 31400);
  assert.ok(s.insights.some((i) => i.tone === "warn" && i.text.includes("by your deadline")));
  assert.equal(Math.round(s.pools.needs + s.pools.wants + s.pools.savings), 100000); // everything is accounted for
});

test("the plan in force adds up to 100% and follows the bills", () => {
  const s = buildSummary({ transactions: [tx({ type: "income", category: "earnings", amount: 44000 })], bills: [{ name: "Apps", amount: 24.19, currency: "USD", dueDay: 5 }], goal: null, settings: { ...settings, usdToKes: 129 }, now: NOW });
  assert.ok(Math.abs(s.billsTotal - 3120.51) < 0.01); // USD bills keep their currency and convert at your rate
  assert.equal(s.allocation.needs + s.allocation.wants + s.allocation.savings, 100);
  assert.ok(s.allocation.savings >= 20);
});

test("starter emergency fund is filled before the goal", () => {
  const base = { transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ amount: 30000, category: "savings" })], bills: [{ name: "Rent", amount: 20000, currency: "KES", dueDay: 1 }], settings: withStarter, now: NOW };
  const goal = { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES" };
  const s = buildSummary({ ...base, goal });
  // Starter target: 1 month of bills + basic living = 20,000 + 0.625 * 80,000 * 0.8 = 60,000.
  assert.equal(s.starter.target, 60000);
  assert.equal(s.starter.funded, 30000); // the 30,000 saved so far all goes to the starter fund
  assert.equal(s.starter.remaining, 30000);
  assert.equal(s.goal.saved, 0); // nothing reaches the goal yet
  // Savings plan is 20% of 100,000. 30,000 starter + 250,000 goal at 20,000 a month = 14 months.
  assert.equal(s.pools.savings, 20000);
  assert.equal(s.goal.monthsToGo, 14);
  assert.equal(s.goal.starterDelay, 2);
  assert.ok(s.starter.funded + s.starter.remaining === s.starter.target);

  // Once the starter fund is full, extra savings count toward the goal.
  const more = buildSummary({ ...base, transactions: [...base.transactions, tx({ amount: 45000, category: "savings" })], goal });
  assert.equal(more.starter.remaining, 0);
  assert.equal(more.goal.saved, 15000); // 75,000 saved - 60,000 starter
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

test("safety net target is months of planned essentials", () => {
  const s = buildSummary({ transactions: [tx({ type: "income", category: "earnings", amount: 100000 })], bills: [], goal: null, settings: { ...settings, emergencyMonths: 6 }, now: NOW });
  assert.equal(s.emergencyTarget, 300000); // 50,000 needs * 6
  assert.ok(s.insights.some((i) => i.text.includes("safety net")));
});

test("saver level follows the share of earnings saved", () => {
  assert.deepEqual([0, 0.01, 0.07, 0.12, 0.17, 0.2, 0.4].map(saverLevel), [0, 1, 2, 3, 4, 5, 5]);
  assert.equal(saverLevel(1), MAX_LEVEL);
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
  assert.ok(s.insights.some((i) => i.tone === "good" && i.text.includes(`${Math.round(PLAN.raiseSaveShare * 100)}% of any increase`)));
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

test("safe to spend divides what is left of the living budget over the days left, today included", () => {
  const s = buildSummary({
    transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "food", amount: 10000 })],
    bills: [],
    goal: null,
    settings,
    now: new Date(2026, 9, 21) // day 21 of 31: 11 days left including today
  });
  assert.equal(s.livingPool, 80000); // needs 50,000 + wants 30,000
  assert.equal(s.safeToSpend.remaining, 70000);
  assert.equal(s.safeToSpend.days, 11);
  assert.equal(Math.round(s.safeToSpend.perDay), Math.round(70000 / 11));
  const none = buildSummary({ transactions: [], bills: [], goal: null, settings, now: NOW });
  assert.equal(none.safeToSpend, null);
});

test("spending pace series is cumulative by day and counts bills on their due day", () => {
  const s = buildSummary({
    transactions: [
      tx({ type: "income", category: "earnings", amount: 100000 }),
      tx({ category: "food", amount: 1000, date: new Date(2026, 9, 2, 12).toISOString() }),
      tx({ category: "food", amount: 500, date: new Date(2026, 9, 4, 12).toISOString() }),
      tx({ category: "savings", amount: 9999, date: new Date(2026, 9, 3, 12).toISOString() }) // savings never counts as spending
    ],
    bills: [{ name: "Wi-Fi", amount: 3000, currency: "KES", dueDay: 3 }],
    goal: null,
    settings,
    now: new Date(2026, 9, 5)
  });
  assert.deepEqual(s.trend.cumulative, [0, 1000, 4000, 4500, 4500]);
  assert.equal(s.trend.days, 31);
  assert.equal(s.trend.today, 5);
});

test("viewing a past month: totals as they ended, no forward-looking advice", () => {
  const sep = (day) => new Date(2026, 8, day, 12).toISOString();
  const s = buildSummary({
    transactions: [
      tx({ type: "income", category: "earnings", amount: 90000, date: sep(2) }),
      tx({ category: "food", amount: 5000, date: sep(10) }),
      tx({ category: "savings", amount: 10000, date: sep(20) }),
      tx({ category: "savings", amount: 7000, date: new Date(2026, 9, 3, 12).toISOString() }) // later month
    ],
    bills: [{ name: "Rent", amount: 15000, currency: "KES", dueDay: 18 }],
    goal: { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES", deadline: new Date(2027, 3, 1).toISOString() },
    settings,
    now: new Date(2026, 8, 15), // viewing September
    today: new Date(2026, 9, 20) // while today is in October
  });
  assert.equal(s.isCurrent, false);
  assert.equal(s.income, 90000);
  assert.equal(s.goal.saved, 10000); // October's saving is not counted yet
  assert.equal(s.goal.monthsToGo, null);
  assert.equal(s.goal.required, null);
  assert.equal(s.safeToSpend, null);
  assert.equal(s.dueSoon.length, 0);
  assert.equal(s.trend.today, 30); // the whole month
  assert.ok(!s.insights.some((i) => /Pay yourself first|still unspent|due in|At this pace/.test(i.text)));
});
