import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLedger, checkPlan, goalEnvelope, suggestPlan } from "./ledger.js";
import { dueCount } from "./dates.js";

const NOW = new Date(2026, 9, 15, 12); // 15 Oct 2026
const settings = { currency: "KES", usdToKes: 100, allocation: { needs: 50, wants: 30, savings: 20 }, starterMonths: 0, savingsApr: 0 };
const income = (amount, over = {}) => ({ type: "income", category: "earnings", title: "Pay", amount, currency: "KES", date: NOW.toISOString(), ...over });
const spend = (category, amount, over = {}) => ({ type: "expense", category, title: category, amount, currency: "KES", date: NOW.toISOString(), ...over });
const alloc = (envelope, amount, over = {}) => ({ envelope, amount, currency: "KES", date: NOW.toISOString(), ...over });
const ledger = (over = {}) => buildLedger({ transactions: [], allocations: [], bills: [], goals: [], settings, now: NOW, ...over });
const sum = (plan) => plan.lines.reduce((s, l) => s + l.amount, 0);
const line = (plan, id) => plan.lines.find((l) => l.id === id).amount;

test("bills fall due on the right days, counted from the day they were added", () => {
  assert.equal(dueCount(5, new Date(2026, 9, 10), new Date(2026, 9, 21)), 0); // added after this month's due day
  assert.equal(dueCount(5, new Date(2026, 9, 3), new Date(2026, 9, 21)), 1);
  assert.equal(dueCount(31, new Date(2026, 0, 15), new Date(2026, 2, 31)), 3); // Jan 31, Feb 28, Mar 31
  assert.equal(dueCount(5, new Date(2026, 7, 20), new Date(2026, 9, 21)), 2); // Sep 5 and Oct 5
});

test("to assign = all earnings minus everything allocated, across currencies", () => {
  const l = ledger({ transactions: [income(50000), income(500, { currency: "USD" })], allocations: [alloc("housing", 30000), alloc("food", 10, { currency: "USD" })] });
  assert.equal(l.incomeTotal, 100000); // 500 USD at 100
  assert.equal(l.allocatedTotal, 31000);
  assert.equal(l.toAssign, 69000);
});

test("envelopes carry their balance forward and show overspending as a negative", () => {
  const l = ledger({
    transactions: [income(100000), spend("food", 3000), spend("food", 2000, { date: new Date(2026, 8, 20).toISOString() }), spend("lifestyle", 9000), spend("Mystery", 500)],
    allocations: [alloc("food", 10000, { date: new Date(2026, 8, 1).toISOString() }), alloc("lifestyle", 5000)]
  });
  assert.equal(l.envelopes.food.balance, 5000); // 10,000 - 3,000 - 2,000 (last month's spending counts too)
  assert.equal(l.envelopes.lifestyle.spent, 9500); // the unknown category falls into lifestyle
  assert.equal(l.envelopes.lifestyle.balance, -4500);
  assert.equal(l.spendingMoney, 5000); // overspent envelopes count as zero, not as a debt
});

test("bills are charged only after the Bills envelope is funded, on their due days", () => {
  const bills = [{ name: "Wi-Fi", amount: 3000, currency: "KES", dueDay: 5, createdAt: new Date(2026, 8, 1).toISOString() }];
  const before = ledger({ bills });
  assert.equal(before.billsTotal, 3000);
  assert.equal(before.envelopes.bills.spent, 0); // nothing charged before any funding
  assert.equal(before.envelopes.bills.balance, 0);

  const funded = ledger({ bills, allocations: [alloc("bills", 9000, { date: new Date(2026, 9, 1).toISOString() })] });
  assert.equal(funded.envelopes.bills.spent, 3000); // Oct 5 has passed; Sep 5 was before funding began
  assert.equal(funded.envelopes.bills.balance, 6000);
});

test("goals gain from allocations; the starter fund target follows bills and living costs", () => {
  const goals = [{ _id: "g1", name: "Motorbike", targetAmount: 100000, savedAmount: 10000, currency: "KES" }];
  const l = ledger({ transactions: [income(100000)], goals, allocations: [alloc(goalEnvelope("g1"), 15000), alloc("starter", 5000)], settings: { ...settings, starterMonths: 1 }, bills: [{ name: "Rent", amount: 20000, currency: "KES", dueDay: 1, createdAt: NOW.toISOString() }] });
  assert.equal(l.goals[0].saved, 25000);
  assert.equal(l.goals[0].remaining, 75000);
  // Starter target = 1 month of (20,000 bills + 0.625 * 80,000 free * 0.8) = 60,000.
  assert.equal(l.starter.target, 60000);
  assert.equal(l.starter.funded, 5000);
  assert.equal(l.starter.remaining, 55000);
});

test("suggested plan: bills first, minimum savings, then living money by the needs:wants ratio", () => {
  const l = ledger({ transactions: [income(100000)], bills: [{ name: "Rent", amount: 4000, currency: "KES", dueDay: 1, createdAt: NOW.toISOString() }] });
  const plan = suggestPlan(l, 100000);
  assert.equal(line(plan, "bills"), 4000);
  assert.equal(line(plan, "starter"), 20000); // no goal and no starter target: the 20% minimum waits here
  // Living money 76,000: needs 62.5% = 47,500 shared 50% / 31.25% / 18.75%; the rest is lifestyle.
  assert.equal(line(plan, "housing"), 23750);
  assert.equal(line(plan, "food"), 14844);
  assert.equal(line(plan, "transport"), 8906);
  assert.equal(line(plan, "lifestyle"), 28500);
  assert.equal(sum(plan), 100000); // every shilling has a job
});

test("a deadline raises savings above the minimum, but never past the living-money cap", () => {
  const goals = [{ _id: "g1", name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES", deadline: new Date(2027, 3, 15).toISOString() }]; // 6 months
  const l = ledger({ transactions: [income(100000)], goals });
  const plan = suggestPlan(l, 100000);
  assert.ok(Math.abs(line(plan, goalEnvelope("g1")) - Math.round(250000 / 6)) <= 1); // 41,667 a month
  assert.equal(sum(plan), 100000);

  // 3 months asks for 83,333, but only 65% of the 80,000 left after bills may be saved.
  const tight = ledger({ transactions: [income(100000)], goals: [{ ...goals[0], deadline: new Date(2026, 11, 15).toISOString() }], bills: [{ name: "Rent", amount: 20000, currency: "KES", dueDay: 1, createdAt: NOW.toISOString() }] });
  const p2 = suggestPlan(tight, 100000);
  assert.equal(line(p2, "bills"), 20000);
  assert.equal(line(p2, goalEnvelope("g1")), 52000);
  const c = checkPlan(tight, Object.fromEntries(p2.lines.map((x) => [x.id, x.amount])), 100000);
  assert.equal(c.goals[0].onTrack, false); // 52,000 goes in now; 198,000 more at 52,000 a month is 3.8 -> 4 months, past the 3-month deadline
  assert.equal(c.goals[0].months, 4);
  assert.ok(c.warnings.some((w) => w.text.includes("deadline")));
});

test("savings already set aside this month reduce what the next payment saves", () => {
  const l = ledger({ transactions: [income(100000)], allocations: [alloc("starter", 15000)] });
  // Month target is 20% of 100,000 = 20,000; 15,000 is done, so only 5,000 more is suggested.
  assert.equal(line(suggestPlan(l, 100000), "starter"), 5000);
});

test("savings fill the starter fund first, then goals in priority order", () => {
  const goals = [
    { _id: "a", name: "Bike", targetAmount: 30000, savedAmount: 0, currency: "KES", priority: 0 },
    { _id: "b", name: "Laptop", targetAmount: 90000, savedAmount: 0, currency: "KES", priority: 1 }
  ];
  const l = ledger({ transactions: [income(100000)], goals, settings: { ...settings, starterMonths: 1 } });
  // Starter target = 0.625 * 100,000 * 0.8 = 50,000. The 20,000 saved goes entirely to it.
  const first = suggestPlan(l, 100000);
  assert.equal(line(first, "starter"), 20000);
  assert.equal(line(first, goalEnvelope("a")), 0);

  // With the starter fund already full, the first goal is filled before the second.
  const full = ledger({ transactions: [income(100000)], goals, allocations: [alloc("starter", 50000, { date: new Date(2026, 8, 1).toISOString() })], settings: { ...settings, starterMonths: 1 } });
  const next = suggestPlan(full, 100000);
  assert.equal(line(next, "starter"), 0);
  assert.equal(line(next, goalEnvelope("a")), 20000); // Bike needs 30,000, so all 20,000 goes to it
  assert.equal(line(next, goalEnvelope("b")), 0);
});

test("USD amounts round to cents and still add up exactly", () => {
  const usd = { ...settings, currency: "USD", usdToKes: 100 };
  const l = buildLedger({ transactions: [{ type: "income", category: "earnings", title: "Pay", amount: 333.33, currency: "USD", date: NOW.toISOString() }], allocations: [], bills: [], goals: [], settings: usd, now: NOW });
  const plan = suggestPlan(l, 333.33);
  assert.equal(Math.round(sum(plan) * 100), 33333);
  assert.ok(plan.lines.every((x) => x.amount >= 0 && Math.abs(x.amount * 100 - Math.round(x.amount * 100)) < 1e-6)); // whole cents only
});

test("checkPlan: unassigned money, savings below the minimum, and the projection by priority", () => {
  const goals = [{ _id: "g1", name: "Bike", targetAmount: 120000, savedAmount: 0, currency: "KES" }];
  const l = ledger({ transactions: [income(100000)], goals });
  const amounts = { bills: 0, starter: 0, [goalEnvelope("g1")]: 10000, housing: 40000, food: 20000, transport: 10000, lifestyle: 10000 };
  const c = checkPlan(l, amounts, 100000);
  assert.equal(c.left, 10000);
  assert.equal(c.rate, 0.1);
  assert.equal(c.belowMin, true);
  // The same 10,000 a month (10% of income) fills 120,000 in 12 months, with this payment included as month one.
  assert.equal(c.goals[0].months, 11); // 110,000 left after this payment, at 10,000 a month
  assert.ok(c.warnings.some((w) => w.text.includes("not assigned")));
  assert.ok(c.warnings.some((w) => w.text.includes("minimum")) === false); // the minimum warning waits until everything is assigned
  const fixed = checkPlan(l, { ...amounts, lifestyle: 20000 }, 100000);
  assert.equal(fixed.left, 0);
  assert.ok(fixed.warnings.some((w) => w.text.includes("below your 20% minimum")));
});

test("what-if: 5% more of income saved brings a goal sooner", () => {
  const goals = [{ _id: "g1", name: "Bike", targetAmount: 250000, savedAmount: 0, currency: "KES" }];
  const l = ledger({ transactions: [income(100000)], goals });
  const amounts = { [goalEnvelope("g1")]: 20000 };
  const c = checkPlan(l, amounts, 100000);
  assert.equal(c.goals[0].months, 12); // 230,000 left after this payment at 20,000 a month = 11.5 -> 12
  assert.equal(c.goals[0].soonerBy, 2); // at 25,000 a month: 230,000 / 25,000 = 9.2 -> 10 months, which is 2 sooner
});
