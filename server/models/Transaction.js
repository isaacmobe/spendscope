import mongoose from "mongoose";
import { CURRENCIES } from "./User.js";

/**
 * Transaction: one earning (income) or spending (expense) entry.
 * `user` ties every row to its owner; all queries filter by it.
 * `category` is the spending area (e.g. Housing, Food, Transport).
 * `currency` is the currency the amount was entered in (KES or USD).
 */
const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: [60, "Title must be 60 characters or less"] },
    amount: { type: Number, required: [true, "Amount is required"], min: [0.01, "Amount must be greater than 0"] },
    currency: { type: String, enum: CURRENCIES, default: "KES" },
    type: { type: String, required: [true, "Type is required"], enum: ["income", "expense"] },
    category: { type: String, default: "General", trim: true, maxlength: [30, "Category must be 30 characters or less"] },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);
