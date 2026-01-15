import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import transactionsRoutes from "./routes/transactions.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Allow frontend requests
app.use(cors());

// ✅ THIS is the health-check route
app.get("/", (req, res) => {
  res.send("API running...");
});

/**
 * 👇 ADD THIS DIRECTLY AFTER THE HEALTH-CHECK ROUTE
 * Any request that starts with /api/transactions
 * will be forwarded to transactions.routes.js
 */
app.use("/api/transactions", transactionsRoutes);

// Error handling middleware (always last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
