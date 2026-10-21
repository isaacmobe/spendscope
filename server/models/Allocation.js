import mongoose from "mongoose";
import { CURRENCIES } from "./User.js";

/**
 * Allocation: money given a job. When earnings arrive the user plans them, and each line of the plan
 * is one Allocation: an amount moved into an envelope.
 *   envelope: bills | housing | food | transport | lifestyle | starter (emergency fund) | goal:<goalId>
 * An envelope's balance is its allocations minus what was spent from it (spending is a Transaction).
 */
const AllocationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    envelope: { type: String, required: true, trim: true, maxlength: 40 },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: CURRENCIES, default: "KES" },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Allocation", AllocationSchema);
