import mongoose from "mongoose";
import { CURRENCIES } from "./User.js";

/** Bill: a recurring monthly obligation (rent, internet, loan) due on a day of the month. */
const BillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: CURRENCIES, default: "KES" },
    dueDay: { type: Number, required: true, min: 1, max: 31 },
    category: { type: String, default: "Bills", trim: true, maxlength: 30 }
  },
  { timestamps: true }
);

export default mongoose.model("Bill", BillSchema);
