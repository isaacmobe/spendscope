import { buildApp } from "../server/app.js";
import { assertConfig } from "../server/config/check.js";
import { connectOnce } from "../server/config/db.js";

/**
 * Vercel serverless entry. Every /api/* request is rewritten here (see vercel.json).
 * The Express app is built once per warm function instance and reused; the database
 * connection is reused too (connectOnce), so cold starts pay the cost and warm calls do not.
 * Locally you do not use this file: `npm run dev` in server/ runs the same app with listen().
 */
const app = buildApp();

const fail = (res, status, message) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ success: false, message }));
};

export default async function handler(req, res) {
  try {
    assertConfig();
  } catch (err) {
    console.error("Configuration error:", err.message);
    return fail(res, 500, "Server is not configured.");
  }
  try {
    await connectOnce();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    return fail(res, 503, "Database unavailable. Try again shortly.");
  }
  return app(req, res);
}
