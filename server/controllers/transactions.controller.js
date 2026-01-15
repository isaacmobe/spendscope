import Transaction from "../models/Transaction.js";

/**
 * Controller functions:
 * - Each function handles ONE type of request.
 * - Routes call these functions.
 * - This separation makes code maintainable and interview-friendly.
 */

// GET /api/transactions
// Returns all transactions sorted by most recent first
export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });

    // Return consistent API shape (easy for frontend)
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    // next(error) forwards error to centralized error middleware
    next(error);
  }
};

// POST /api/transactions
// Creates a new transaction
export const createTransaction = async (req, res, next) => {
  try {
    const { title, amount, type, category, date } = req.body;

    // Minimal manual validation to provide nicer API errors
    // (Schema also validates, but this gives clearer messages early)
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a number > 0." });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be income or expense." });
    }

    const created = await Transaction.create({
      title: title.trim(),
      amount: numericAmount,
      type,
      category: category?.trim() || "General",
      date: date ? new Date(date) : Date.now()
    });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/transactions/:id
// Deletes one transaction by Mongo _id
export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Transaction.findById(id);

    // If the id exists but no document found, return 404
    if (!existing) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    await existing.deleteOne();

    res.status(200).json({
      success: true,
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/transactions/:id
// Updates an existing transaction by Mongo _id
export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    /**
     * findByIdAndUpdate:
     * - first arg: id of the document
     * - second arg: fields to update (from req.body)
     * - options:
     *   - new: true => return the updated document (not the old one)
     *   - runValidators: true => ensure schema validation runs on updates too
     */
    const updated = await Transaction.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    // If no transaction matches that id, return 404
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found."
      });
    }

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error); // sends error to centralized error middleware
  }
};
