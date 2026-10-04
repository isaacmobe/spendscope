import mongoose from "mongoose";
import { defaults } from "../config/defaults.js";

export const CURRENCIES = ["KES", "USD"];

/**
 * User
 * ----
 * Account + personal settings.
 * - passwordHash: scrypt hash, never the password itself (and hidden from queries by default).
 * - recoveryHash: scrypt hash of the one-time recovery code (lets you reset a forgotten password).
 * - settings.usdToKes: user-editable exchange rate (the app can also fetch a live one).
 * - settings.allocation: how new earnings are split (needs / wants / savings), must total 100.
 * - settings.savingsApr: expected yearly growth of money you save, in percent (0 = kept as cash).
 * - settings.emergencyMonths: how many months of essential costs the emergency fund should cover.
 */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 60, default: "" },
    passwordHash: { type: String, required: true, select: false },
    recoveryHash: { type: String, select: false },
    recoveryCreatedAt: { type: Date },
    settings: {
      currency: { type: String, enum: CURRENCIES, default: defaults.currency },
      usdToKes: { type: Number, min: 1, max: 10000, default: defaults.usdToKes },
      savingsApr: { type: Number, min: 0, max: 30, default: defaults.savingsApr },
      emergencyMonths: { type: Number, min: 1, max: 12, default: defaults.emergencyMonths },
      allocation: {
        needs: { type: Number, min: 0, max: 100, default: defaults.allocation.needs },
        wants: { type: Number, min: 0, max: 100, default: defaults.allocation.wants },
        savings: { type: Number, min: 0, max: 100, default: defaults.allocation.savings }
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
