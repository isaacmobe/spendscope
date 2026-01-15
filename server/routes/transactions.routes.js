import express from "express";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction
} from "../controllers/transactions.controller.js";


const router = express.Router();

/**
 * Router:
 * - Defines endpoints and maps them to controller functions.
 * - Keeps your API URL structure clean and centralized.
 */

router.get("/", getTransactions);            // GET    /api/transactions
router.post("/", createTransaction);         // POST   /api/transactions
router.delete("/:id", deleteTransaction);    // DELETE /api/transactions/:id
router.put("/:id", updateTransaction);       // PUT    /api/transactions/:id


export default router;
