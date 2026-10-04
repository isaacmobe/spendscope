import mongoose from "mongoose";

export const CURRENCIES = ["KES", "USD"];

/**
 * User
 * ----
 * Account + personal settings.
 * - passwordHash: scrypt hash, never the password itself (and hidden from queries by default).
 * - settings.usdToKes: user-editable exchange rate (no external FX service needed).
 * - settings.allocation: how new earnings are split (needs / wants / savings), must total 100.
 */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 60, default: "" },
    passwordHash: { type: String, required: true, select: false },
    settings: {
      currency: { type: String, enum: CURRENCIES, default: "KES" },
      usdToKes: { type: Number, min: 1, max: 10000, default: 129 },
      allocation: {
        needs: { type: Number, min: 0, max: 100, default: 50 },
        wants: { type: Number, min: 0, max: 100, default: 30 },
        savings: { type: Number, min: 0, max: 100, default: 20 }
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
