import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import { transactionsRouter, goalsRouter, billsRouter } from "./routes/resource.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

/**
 * buildApp()
 * ----------
 * Creates the Express app WITHOUT connecting to a database or listening on a port,
 * so tests can import it directly. index.js adds the DB connection and listen().
 */
export function buildApp() {
  const app = express();

  // Security headers (CSP, no MIME sniffing, hides X-Powered-By, etc.)
  app.use(helmet());

  // Only the configured browser origin may call the API, with cookies.
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));

  // Small body limit: transactions are tiny, large payloads are abuse.
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  // General rate limit for the whole API (auth routes add a stricter one).
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: "draft-7", legacyHeaders: false }));

  app.get("/", (req, res) => res.send("API running..."));
  app.use("/api/auth", authRoutes);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/bills", billsRouter);

  // Unknown API routes get a JSON 404 instead of an HTML page.
  app.use((req, res) => res.status(404).json({ success: false, message: "Not found." }));

  // Error handling middleware (always last)
  app.use(errorHandler);
  return app;
}
