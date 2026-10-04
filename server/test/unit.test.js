import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpError, date, int, num, objectId, oneOf, parseBody, str } from "../utils/validate.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateRecoveryCode, normalizeRecoveryCode } from "../utils/recovery.js";
import { defaults } from "../config/defaults.js";

const throws400 = (fn) => assert.throws(fn, (e) => e instanceof HttpError && e.status === 400);

test("str trims, enforces type and length", () => {
  assert.equal(str("  hi ", "t", { max: 5 }), "hi");
  throws400(() => str({ $ne: 1 }, "t"));
  throws400(() => str("toolong", "t", { max: 3 }));
  throws400(() => str("   ", "t", { required: true }));
});

test("num and int enforce finite numbers and ranges", () => {
  assert.equal(num("12.5", "n"), 12.5);
  throws400(() => num("", "n"));
  throws400(() => num("abc", "n"));
  throws400(() => num(Infinity, "n"));
  throws400(() => num(0, "n", { exclusiveMin: true }));
  throws400(() => num(-1, "n"));
  throws400(() => num([5], "n"));
  assert.equal(int("5", "d", { min: 1, max: 31 }), 5);
  throws400(() => int(1.5, "d"));
});

test("oneOf, date, objectId", () => {
  assert.equal(oneOf("KES", "c", ["KES", "USD"]), "KES");
  throws400(() => oneOf("EUR", "c", ["KES", "USD"]));
  assert.ok(date("2026-01-05", "d") instanceof Date);
  throws400(() => date("nope", "d"));
  throws400(() => date({}, "d"));
  assert.equal(objectId("507f1f77bcf86cd799439011"), "507f1f77bcf86cd799439011");
  throws400(() => objectId("abc"));
  throws400(() => objectId({ $ne: 1 }));
});

test("parseBody whitelists fields and supports partial updates", () => {
  const spec = { name: [(v) => str(v, "name", { required: true }), true], n: [(v) => num(v, "n"), false] };
  assert.deepEqual(parseBody({ name: "a", n: 1, admin: true, $set: { x: 1 } }, spec), { name: "a", n: 1 });
  throws400(() => parseBody({ n: 1 }, spec));
  assert.deepEqual(parseBody({ n: 2 }, spec, { partial: true }), { n: 2 });
  throws400(() => parseBody({ admin: true }, spec, { partial: true }));
  throws400(() => parseBody(null, spec));
  throws400(() => parseBody([], spec));
});

test("password hashing is salted and verifies correctly", async () => {
  const a = await hashPassword("correct horse");
  const b = await hashPassword("correct horse");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("correct horse", a), true);
  assert.equal(await verifyPassword("wrong horse", a), false);
  assert.equal(await verifyPassword("x", "malformed"), false);
});

test("recovery codes are unique, well formed and tolerant when typed back", async () => {
  const code = generateRecoveryCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
  assert.notEqual(code, generateRecoveryCode());
  // Casing, spaces and dashes do not matter when the user types it in.
  assert.equal(normalizeRecoveryCode(code.toLowerCase().replaceAll("-", " ")), normalizeRecoveryCode(code));
  const hash = await hashPassword(normalizeRecoveryCode(code));
  assert.equal(await verifyPassword(normalizeRecoveryCode(code), hash), true);
  assert.equal(await verifyPassword(normalizeRecoveryCode(generateRecoveryCode()), hash), false);
});

test("new-account defaults are valid and add up", () => {
  const a = defaults.allocation;
  assert.equal(a.needs + a.wants + a.savings, 100);
  assert.ok(defaults.usdToKes >= 1);
  assert.ok(["KES", "USD"].includes(defaults.currency));
});
