import mongoose from "mongoose";

/**
 * TransactionSchema
 * - Defines the shape of a "transaction" document in MongoDB.
 * - Mongoose uses this to validate data before saving.
 * - This is your single source of truth for what "valid data" is.
 */
const TransactionSchema = new mongoose.Schema(
  {
    // Short human-friendly label: "Fuel", "Rent", "Salary"
    title: {
      type: String,
      required: [true, "Title is required"], // Custom error message
      trim: true, // Removes extra spaces
      maxlength: [60, "Title must be 60 characters or less"]
    },

    // Amount stored as Number for easy sums/aggregations and charts
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"]
    },

    // We keep it explicit: income vs expense
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["income", "expense"] // Only allow these two values
    },

    // Optional, but helpful for analysis later
    category: {
      type: String,
      default: "General",
      trim: true,
      maxlength: [30, "Category must be 30 characters or less"]
    },

    // When the transaction occurred (defaults to "now")
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    // Adds createdAt + updatedAt automatically
    timestamps: true
  }
);

// Export the model:
// - Mongo collection will be named "transactions" (pluralized by Mongoose)
export default mongoose.model("Transaction", TransactionSchema);
