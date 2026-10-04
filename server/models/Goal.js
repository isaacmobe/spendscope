import mongoose from "mongoose";
import { CURRENCIES } from "./User.js";

/** Goal: a savings target such as "Motorbike". savedAmount grows as the user contributes. */
const GoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    savedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: "KES" },
    deadline: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Goal", GoalSchema);
