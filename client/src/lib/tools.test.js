import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickEntry } from "./quickEntry.js";
import { csvCell, transactionsToCsv } from "./exportCsv.js";
import { fetchUsdToKes, parseUsdToKes } from "./fx.js";

test("quick add understands expenses, earnings, units and currencies", () => {
  assert.deepEqual(parseQuickEntry("food 450 lunch", "KES"), { type: "expense", areaId: "food", amount: 450, currency: "KES", title: "lunch" });
  assert.deepEqual(parseQuickEntry("450 food", "KES"), { type: "expense", areaId: "food", amount: 450, currency: "KES", title: "food" });
  assert.equal(parseQuickEntry("rent 30k", "KES").amount, 30000);
  assert.equal(parseQuickEntry("rent 30k", "KES").areaId, "housing");
  assert.equal(parseQuickEntry("shopping 1,200.50", "KES").amount, 1200.5);
  assert.equal(parseQuickEntry("fare $2 boda", "KES").currency, "USD");
  assert.equal(parseQuickEntry("fare 2usd boda", "KES").currency, "USD");
  assert.equal(parseQuickEntry("fare 150", "USD").currency, "USD"); // falls back to the display currency
  assert.deepEqual(parseQuickEntry("+85000 salary", "KES"), { type: "income", amount: 85000, currency: "KES", title: "salary", areaId: null });
  assert.equal(parseQuickEntry("earned 12k gig", "KES").type, "income");
  assert.equal(parseQuickEntry("save 5000 bike", "KES").areaId, "savings");
});

test("quick add reports problems instead of guessing", () => {
  assert.match(parseQuickEntry("", "KES").error, /Type something/);
  assert.match(parseQuickEntry("lunch", "KES").error, /amount/);
  assert.match(parseQuickEntry("450 mystery", "KES").error, /Which area/);
  assert.match(parseQuickEntry("food 0", "KES").error, /amount/);
  assert.ok(parseQuickEntry("food 10 " + "x".repeat(200), "KES").title.length <= 60);
});

test("csv escapes cells and blocks spreadsheet formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+254700"), "'+254700");
  assert.equal(csvCell("@cmd"), "'@cmd");
  const csv = transactionsToCsv(
    [
      { date: new Date(2026, 9, 5, 12).toISOString(), type: "expense", category: "food", title: "Lunch, big", amount: 450, currency: "KES" },
      { date: new Date(2026, 9, 1, 12).toISOString(), type: "income", category: "earnings", title: "Salary", amount: 85000, currency: "KES" }
    ],
    (id) => id.toUpperCase()
  );
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "Date,Type,Area,Title,Amount,Currency");
  assert.equal(lines[1], "2026-10-01,income,Earnings,Salary,85000,KES"); // oldest first
  assert.equal(lines[2], '2026-10-05,expense,FOOD,"Lunch, big",450,KES');
});

test("live rate parsing accepts the feed format and rejects everything else", async () => {
  assert.equal(parseUsdToKes({ result: "success", rates: { USD: 1, KES: 129.45 } }), 129.45);
  assert.equal(parseUsdToKes({ rates: { KES: 130 } }), 130);
  assert.equal(parseUsdToKes({ result: "error" }), null);
  assert.equal(parseUsdToKes({ rates: { KES: -1 } }), null);
  assert.equal(parseUsdToKes({ rates: {} }), null);
  assert.equal(parseUsdToKes(null), null);

  const ok = await fetchUsdToKes("x", async () => ({ ok: true, json: async () => ({ result: "success", rates: { KES: 129.456 }, time_last_update_utc: "Mon" }) }));
  assert.deepEqual(ok, { rate: 129.46, updated: "Mon" });
  await assert.rejects(fetchUsdToKes("x", async () => ({ ok: false, status: 503 })), /503/);
  await assert.rejects(fetchUsdToKes("x", async () => ({ ok: true, json: async () => ({}) })), /did not return/);
});
