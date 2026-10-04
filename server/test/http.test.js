import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.js";

/**
 * HTTP-level tests that never touch the database: they cover everything the API
 * must reject or enforce BEFORE a query runs (auth gate, validation, limits, headers).
 */
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.CLIENT_ORIGIN = "http://localhost:5290";

let server, base;
before(() => {
  server = buildApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const send = (method, path, body, headers = {}) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });

test("every data route requires login", async () => {
  for (const p of ["/api/transactions", "/api/goals", "/api/bills"]) {
    assert.equal((await send("GET", p)).status, 401, p);
    assert.equal((await send("POST", p, { name: "x" })).status, 401, p);
  }
  assert.equal((await send("GET", "/api/auth/me")).status, 401);
  assert.equal((await send("PATCH", "/api/auth/settings", {})).status, 401);
});

test("forged or tampered tokens are rejected", async () => {
  const none = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEifQ.";
  assert.equal((await send("GET", "/api/transactions", undefined, { cookie: `token=${none}` })).status, 401);
  assert.equal((await send("GET", "/api/transactions", undefined, { cookie: "token=garbage" })).status, 401);
});

test("register and login validate input before the database", async () => {
  const bad = [
    { email: "not-an-email", password: "longenough1" },
    { email: "a@b.co", password: "short" },
    { email: { $ne: "" }, password: "longenough1" },
    { email: "a@b.co", password: { $gt: "" } },
    []
  ];
  for (const body of bad) {
    assert.equal((await send("POST", "/api/auth/register", body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await send("POST", "/api/auth/login", { email: "a@b.co", password: { $ne: 1 } })).status, 400);
});

test("malformed, oversized and unknown requests get safe JSON errors", async () => {
  const malformed = await send("POST", "/api/auth/login", "{bad");
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, "Malformed JSON body.");
  assert.equal((await send("POST", "/api/auth/login", { a: "x".repeat(20000) })).status, 413);
  const nf = await send("GET", "/api/nope");
  assert.equal(nf.status, 404);
  assert.equal((await nf.json()).success, false);
});

test("CORS allow-list and security headers", async () => {
  const evil = await send("GET", "/api/auth/me", undefined, { origin: "https://evil.example" });
  // The API only ever advertises the configured origin, so a browser on any other origin is blocked.
  assert.equal(evil.headers.get("access-control-allow-origin"), "http://localhost:5290");
  assert.notEqual(evil.headers.get("access-control-allow-origin"), "https://evil.example");
  const good = await send("GET", "/api/auth/me", undefined, { origin: "http://localhost:5290" });
  assert.equal(good.headers.get("access-control-allow-origin"), "http://localhost:5290");
  assert.equal(good.headers.get("access-control-allow-credentials"), "true");
  assert.equal(good.headers.get("x-content-type-options"), "nosniff");
  assert.equal(good.headers.get("x-powered-by"), null);
  assert.ok(good.headers.get("content-security-policy"));
});

test("recovery and account endpoints validate input or require login before touching the database", async () => {
  // Recovery is public but must reject malformed input.
  for (const body of [{}, { email: "a@b.co", recoveryCode: "x" }, { email: "a@b.co", recoveryCode: "AAAA", newPassword: "short" }, { email: { $ne: 1 }, recoveryCode: "AAAA", newPassword: "longenough1" }]) {
    assert.equal((await send("POST", "/api/auth/recover", body)).status, 400, JSON.stringify(body));
  }
  // These need a logged-in session.
  assert.equal((await send("POST", "/api/auth/password", { currentPassword: "a", newPassword: "longenough1" })).status, 401);
  assert.equal((await send("POST", "/api/auth/recovery-code", { password: "a" })).status, 401);
  assert.equal((await send("DELETE", "/api/auth/account", { password: "a" })).status, 401);
});

test("login endpoint is rate limited", async () => {
  let last;
  for (let i = 0; i < 25; i++) last = await send("POST", "/api/auth/login", { email: "x@y.co", password: { $ne: 1 } });
  assert.equal(last.status, 429);
});
