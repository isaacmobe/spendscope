import { test } from "node:test";
import assert from "node:assert/strict";
import { futureBalance, monthsToReach, requiredMonthly } from "./savingsMath.js";
import { convert, formatMoney } from "./money.js";
import { nextDueDate } from "./dates.js";

const NOW = new Date(2026, 9, 15); // 15 Oct 2026

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

test("nextDueDate handles month ends and rollover", () => {
  assert.equal(nextDueDate(20, NOW).getDate(), 20);
  assert.equal(nextDueDate(10, NOW).getMonth(), 10); // already passed, so November
  assert.equal(nextDueDate(31, new Date(2026, 1, 10)).getDate(), 28); // Feb clamps to 28
  assert.equal(nextDueDate(5, new Date(2026, 11, 20)).getFullYear(), 2027); // December rolls the year
});
