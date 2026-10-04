import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { buildApp } from "../app.js";

/**
 * Integration tests: real Express app + in-memory MongoDB, driven over HTTP.
 * Run with: npm test
 */
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.CLIENT_ORIGIN = "http://localhost:5290";

let mongod, server, base;
let dbReady = false;

before(async () => {
  try {
    // Use a real database when MONGO_TEST_URI is set, otherwise start an in-memory one.
    // The in-memory server downloads a mongod binary on first use (needs internet access).
    const uri = process.env.MONGO_TEST_URI || (mongod = await MongoMemoryServer.create()).getUri();
    await mongoose.connect(uri);
    dbReady = true;
  } catch (err) {
    console.warn(`Database tests skipped: ${err.message.split("\n")[0]}`);
  }
  server = buildApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  if (dbReady) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// Every test in this file needs MongoDB; skip (not fail) when none is available.
const dbTest = (name, fn) => test(name, async (t) => {
  if (!dbReady) return t.skip("no MongoDB available");
  await fn(t);
});

// Small fetch wrapper that keeps a cookie jar per "client".
const client = () => {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(cookie && { cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
};

dbTest("data routes require login", async () => {
  const api = client();
  assert.equal((await api("GET", "/api/transactions")).status, 401);
});

dbTest("register, me, logout flow and cookie flags", async () => {
  const api = client();
  const r = await api("POST", "/api/auth/register", { email: "A@Test.com", password: "longenough1", name: "Ann" });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.email, "a@test.com");
  assert.equal(r.body.data.passwordHash, undefined);
  const flags = r.headers.get("set-cookie");
  assert.match(flags, /HttpOnly/i);
  assert.match(flags, /SameSite=Lax/i);
  assert.equal((await api("GET", "/api/auth/me")).body.data.email, "a@test.com");
  assert.equal((await api("POST", "/api/auth/register", { email: "a@test.com", password: "longenough1" })).status, 409);
});

dbTest("login rejects bad credentials with a generic message", async () => {
  const api = client();
  await api("POST", "/api/auth/register", { email: "b@test.com", password: "longenough1" });
  const bad = await client()("POST", "/api/auth/login", { email: "b@test.com", password: "wrongpass99" });
  const unknown = await client()("POST", "/api/auth/login", { email: "nobody@test.com", password: "wrongpass99" });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.message, unknown.body.message);
  assert.equal((await client()("POST", "/api/auth/login", { email: "b@test.com", password: "longenough1" })).status, 200);
});

dbTest("transactions: validation, whitelist and operator injection", async () => {
  const api = client();
  await api("POST", "/api/auth/register", { email: "c@test.com", password: "longenough1" });

  const ok = await api("POST", "/api/transactions", { title: " Salary ", amount: "50000", type: "income", currency: "KES", isAdmin: true, user: "x" });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.title, "Salary");
  assert.equal(ok.body.data.isAdmin, undefined);

  assert.equal((await api("POST", "/api/transactions", { title: { $ne: 1 }, amount: 5, type: "expense" })).status, 400);
  assert.equal((await api("POST", "/api/transactions", { title: "x", amount: -5, type: "expense" })).status, 400);
  assert.equal((await api("POST", "/api/transactions", { title: "x", amount: 5, type: "expense", date: "nope" })).status, 400);

  const id = ok.body.data._id;
  // Operators and unknown fields in an update are ignored or rejected, never applied.
  assert.equal((await api("PUT", `/api/transactions/${id}`, { $set: { amount: 1 } })).status, 400);
  const upd = await api("PUT", `/api/transactions/${id}`, { amount: 60000, createdAt: "2000-01-01", __proto__: { polluted: true } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.amount, 60000);
  assert.notEqual(upd.body.data.createdAt, "2000-01-01T00:00:00.000Z");
  assert.equal(({}).polluted, undefined);

  assert.equal((await api("PUT", "/api/transactions/abc", { amount: 1 })).status, 400);
  assert.equal((await api("DELETE", "/api/transactions/abc")).status, 400);
});

dbTest("users cannot read or change each other's data", async () => {
  const alice = client();
  const eve = client();
  await alice("POST", "/api/auth/register", { email: "alice@test.com", password: "longenough1" });
  await eve("POST", "/api/auth/register", { email: "eve@test.com", password: "longenough1" });
  const g = await alice("POST", "/api/goals", { name: "Motorbike", targetAmount: 250000 });
  const id = g.body.data._id;
  assert.equal((await eve("GET", "/api/goals")).body.count, 0);
  assert.equal((await eve("PUT", `/api/goals/${id}`, { savedAmount: 1 })).status, 404);
  assert.equal((await eve("DELETE", `/api/goals/${id}`)).status, 404);
  assert.equal((await alice("GET", "/api/goals")).body.count, 1);
});

dbTest("bills and settings", async () => {
  const api = client();
  await api("POST", "/api/auth/register", { email: "d@test.com", password: "longenough1" });
  assert.equal((await api("POST", "/api/bills", { name: "Rent", amount: 15000, dueDay: 5 })).status, 201);
  assert.equal((await api("POST", "/api/bills", { name: "Rent", amount: 15000, dueDay: 40 })).status, 400);
  assert.equal((await api("PATCH", "/api/auth/settings", { allocation: { needs: 60, wants: 30, savings: 20 } })).status, 400);
  const s = await api("PATCH", "/api/auth/settings", { currency: "USD", usdToKes: 130, allocation: { needs: 50, wants: 20, savings: 30 } });
  assert.equal(s.status, 200);
  assert.equal(s.body.data.settings.currency, "USD");
  assert.equal(s.body.data.settings.allocation.savings, 30);
  const grow = await api("PATCH", "/api/auth/settings", { savingsApr: 12.5, emergencyMonths: 6 });
  assert.equal(grow.body.data.settings.savingsApr, 12.5);
  assert.equal(grow.body.data.settings.emergencyMonths, 6);
  assert.equal((await api("PATCH", "/api/auth/settings", { savingsApr: 99 })).status, 400);
  assert.equal((await api("PATCH", "/api/auth/settings", { emergencyMonths: 2.5 })).status, 400);
});


dbTest("recovery code resets a forgotten password and is single-use", async () => {
  const api = client();
  const reg = await api("POST", "/api/auth/register", { email: "rec@test.com", password: "originalpass1" });
  assert.equal(reg.status, 201);
  assert.match(reg.body.recoveryCode, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  assert.equal(reg.body.data.hasRecoveryCode, true);

  const other = client();
  assert.equal((await other("POST", "/api/auth/recover", { email: "rec@test.com", recoveryCode: "AAAA-AAAA-AAAA-AAAA", newPassword: "brandnewpass1" })).status, 401);
  const ok = await other("POST", "/api/auth/recover", { email: "rec@test.com", recoveryCode: reg.body.recoveryCode.toLowerCase(), newPassword: "brandnewpass1" });
  assert.equal(ok.status, 200);
  assert.notEqual(ok.body.recoveryCode, reg.body.recoveryCode);
  // Old password is gone, new one works, and the used code no longer works.
  assert.equal((await client()("POST", "/api/auth/login", { email: "rec@test.com", password: "originalpass1" })).status, 401);
  assert.equal((await client()("POST", "/api/auth/login", { email: "rec@test.com", password: "brandnewpass1" })).status, 200);
  assert.equal((await client()("POST", "/api/auth/recover", { email: "rec@test.com", recoveryCode: reg.body.recoveryCode, newPassword: "anotherpass12" })).status, 401);
});

dbTest("change password, new recovery code and account deletion need the current password", async () => {
  const api = client();
  await api("POST", "/api/auth/register", { email: "pw@test.com", password: "originalpass1" });
  await api("POST", "/api/transactions", { title: "x", amount: 5, type: "expense" });

  assert.equal((await api("POST", "/api/auth/password", { currentPassword: "wrongwrong1", newPassword: "changedpass12" })).status, 403);
  assert.equal((await api("POST", "/api/auth/password", { currentPassword: "originalpass1", newPassword: "changedpass12" })).status, 200);
  assert.equal((await client()("POST", "/api/auth/login", { email: "pw@test.com", password: "changedpass12" })).status, 200);

  assert.equal((await api("POST", "/api/auth/recovery-code", { password: "nope12345" })).status, 403);
  const fresh = await api("POST", "/api/auth/recovery-code", { password: "changedpass12" });
  assert.equal(fresh.status, 200);
  assert.ok(fresh.body.recoveryCode);

  assert.equal((await api("DELETE", "/api/auth/account", { password: "wrongwrong1" })).status, 403);
  assert.equal((await api("DELETE", "/api/auth/account", { password: "changedpass12" })).status, 200);
  assert.equal((await client()("POST", "/api/auth/login", { email: "pw@test.com", password: "changedpass12" })).status, 401);
});
