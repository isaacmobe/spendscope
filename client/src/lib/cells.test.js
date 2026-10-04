import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCells } from "./cells.js";
import { buildSummary } from "./finance.js";
import { formatMoneyFit } from "./money.js";

const NOW = new Date(2026, 9, 15);
const settings = { currency: "KES", usdToKes: 100, allocation: { needs: 50, wants: 30, savings: 20 } };
const tx = (over) => ({ amount: 0, currency: "KES", type: "expense", category: "food", date: new Date(2026, 9, 3).toISOString(), ...over });
const cells = (extra = {}) => {
  const s = buildSummary({ transactions: [tx({ type: "income", category: "earnings", amount: 100000 })], bills: [], goal: null, settings, now: NOW, ...extra });
  return Object.fromEntries(buildCells(s).map((c) => [c.id, c]));
};

test("money fits small cells: full when short, compact when long", () => {
  assert.equal(formatMoneyFit(42500, "KES"), "KES 42,500");
  assert.equal(formatMoneyFit(1200000, "KES"), "KES 1.2M");
  assert.equal(formatMoneyFit(340000, "KES"), "KES 340,000"); // 11 characters still fits
  assert.equal(formatMoneyFit(3400000, "KES"), "KES 3.4M");
  assert.equal(formatMoneyFit(123456789, "KES"), "KES 123.5M");
  assert.equal(formatMoneyFit(-2500000, "KES"), "-KES 2.5M");
  assert.equal(formatMoneyFit(1234.5, "USD"), "$1,234.5");
});

test("every cell has a kicker, a value, a caption and explanation text", () => {
  const all = Object.values(cells());
  assert.equal(all.length, 12);
  for (const c of all) {
    assert.ok(c.kicker && c.value && c.caption, c.id);
    assert.ok(c.info?.title && c.info?.explain, c.id);
    assert.ok(c.level >= 0 && c.level <= 1, `${c.id} level ${c.level}`);
  }
});

test("plan cells show the pools and how much of each is used", () => {
  const c = cells({ transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "housing", amount: 45000 })] });
  assert.equal(c.needs.value, "KES 50,000");
  assert.equal(c.needs.caption, "used 90%");
  assert.equal(c.needs.tone, "warn");
  assert.equal(c.wants.caption, "used 0%");
  assert.equal(c.pool.value, "KES 20,000");
  assert.equal(c.after.value, "KES 80,000");
  assert.equal(c.left.value, "KES 55,000");
});

test("overspending turns cells rose and shows a negative remainder", () => {
  const c = cells({ transactions: [tx({ type: "income", category: "earnings", amount: 10000 }), tx({ category: "food", amount: 20000 })] });
  assert.equal(c.left.tone, "over");
  assert.match(c.left.value, /^-KES/);
  assert.equal(c.safe.tone, "over");
  assert.equal(c.needs.tone, "over");
});

test("goal cell: unset, on track, behind, reached", () => {
  assert.equal(cells().goal.value, "Set goal");
  const goal = { name: "Motorbike", targetAmount: 250000, savedAmount: 0, currency: "KES" };
  const ok = cells({ goal });
  assert.match(ok.goal.value, /^ETA /);
  assert.equal(ok.goal.tone, "ok");
  const late = cells({ goal: { ...goal, deadline: new Date(2026, 11, 15).toISOString() } });
  assert.equal(late.goal.value, "Behind");
  assert.equal(late.goal.tone, "over");
  assert.equal(cells({ goal: { ...goal, targetAmount: 100, savedAmount: 200 } }).goal.value, "Reached");
});

test("without earnings the cells are quiet instead of showing NaN", () => {
  const s = buildSummary({ transactions: [], bills: [], goal: null, settings, now: NOW });
  const c = Object.fromEntries(buildCells(s).map((x) => [x.id, x]));
  assert.equal(c.safe.value, "--");
  assert.equal(c.pace.value, "--");
  for (const x of Object.values(c)) assert.ok(!/NaN|Infinity/.test(`${x.value} ${x.caption} ${x.kicker}`), x.id);
});

test("advice cell counts tips and warnings", () => {
  const c = cells({ transactions: [tx({ type: "income", category: "earnings", amount: 100000 }), tx({ category: "housing", amount: 90000 })] });
  assert.ok(c.advice.tone === "warn");
  assert.match(c.advice.caption, /warning/);
});
