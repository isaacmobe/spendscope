import { useContext, useEffect, useState } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";

/**
 * TransactionForm
 * ---------------
 * Adds or edits a transaction using Context functions:
 * - createTransaction(payload)
 * - updateTransaction(id, payload)
 *
 * Design goal:
 * - This card is allowed to stretch full height (bento side panel).
 * - Inputs stay near the top, actions stay pinned to the bottom.
 */
export default function TransactionForm() {
  const {
    createTransaction,
    editingTransaction,
    setEditingTransaction,
    updateTransaction
  } = useContext(TransactionsContext);

  // Local form state (controlled inputs)
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);

  // Local form error (separate from global error)
  const [formError, setFormError] = useState("");

  /**
   * When user clicks "Edit", editingTransaction becomes non-null.
   * We populate the form fields so the user can update them.
   */
  useEffect(() => {
    if (!editingTransaction) return;

    setTitle(editingTransaction.title || "");
    setAmount(String(editingTransaction.amount ?? ""));
    setType(editingTransaction.type || "expense");
    setCategory(editingTransaction.category || "General");
  }, [editingTransaction]);

  /**
   * clearForm()
   * -----------
   * Central place to reset fields (used after submit and on cancel).
   */
  const clearForm = () => {
    setTitle("");
    setAmount("");
    setType("expense");
    setCategory("General");
    setFormError("");
  };

  /**
   * onSubmit()
   * ----------
   * Validates user input, then:
   * - if editing => PUT update
   * - else => POST create
   */
  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Basic validation
    if (!title.trim()) return setFormError("Title is required.");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return setFormError("Amount must be a number greater than 0.");
    }

    // Payload sent to backend
    const payload = {
      title: title.trim(),
      amount: numericAmount,
      type,
      category: category.trim() || "General"
    };

    try {
      setSaving(true);

      if (editingTransaction?._id) {
        // Update mode: edit an existing transaction
        await updateTransaction(editingTransaction._id, payload);
      } else {
        // Add mode: create a new transaction
        await createTransaction(payload);
      }

      // After success, exit edit mode and reset fields
      setEditingTransaction(null);
      clearForm();
    } catch {
      setFormError("Request failed. Check server / network.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoCard
      title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      className="h-full"
    >
      {/* Full-height layout: top content + bottom actions */}
      <div className="flex h-full flex-col">
        <form onSubmit={onSubmit} className="flex flex-1 flex-col">
          {/* =========================
              TOP: Primary inputs
              ========================= */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fuel, Rent, Salary"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {/* Amount + Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {/* Local form error */}
            {formError ? <p className="text-sm text-brand-red">{formError}</p> : null}
          </div>

          {/* =========================
              MIDDLE: Quick tools area
              - gives the panel "life"
              - scrolls if needed
              ========================= */}
          <div className="mt-5 space-y-4 flex-1 overflow-auto pr-1">
            {/* Quick categories */}
            <div className="rounded-2xl ring-1 ring-black/5 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Quick categories</p>
                <span className="text-[11px] text-slate-500">Tap to fill</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {["Transport", "Food", "Rent", "Internet", "Shopping", "Salary"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={[
                      "rounded-xl px-3 py-2 text-xs font-semibold transition",
                      "ring-1 ring-black/10",
                      category === c
                        ? "bg-brand-green text-white ring-transparent"
                        : "bg-brand-cream text-slate-700 hover:bg-white"
                    ].join(" ")}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-slate-600">
                Tip: consistent categories make filtering + charts meaningful.
              </p>
            </div>

            {/* Quick amounts */}
            <div className="rounded-2xl ring-1 ring-black/5 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Quick amounts</p>
                <span className="text-[11px] text-slate-500">Expense-friendly presets</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[200, 500, 1000, 1500, 3000, 5000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className="rounded-xl px-2 py-2 text-xs font-semibold bg-brand-cream text-slate-700 ring-1 ring-black/10 hover:bg-white transition"
                  >
                    KSh {n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl ring-1 ring-black/5 bg-white p-3">
              <p className="text-xs font-semibold text-slate-700">Preview</p>

              <div className="mt-2">
                <p className="text-sm font-semibold text-slate-900">
                  {title?.trim() ? title : "Transaction title…"}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {category || "General"} • {type} •{" "}
                  <span
                    className={[
                      "font-semibold",
                      type === "income" ? "text-brand-green" : "text-brand-red"
                    ].join(" ")}
                  >
                    {amount ? `KSh ${Number(amount || 0).toLocaleString()}` : "KSh 0"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* =========================
              BOTTOM: Actions (pinned)
              ========================= */}
          <div className="pt-4 space-y-2">
            {editingTransaction ? (
              <button
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setTitle("");
                  setAmount("");
                  setType("expense");
                  setCategory("General");
                  setFormError("");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:opacity-90"
              >
                Cancel Edit
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className={[
                "w-full rounded-xl px-4 py-3 text-sm font-semibold",
                "shadow-float",
                saving
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-brand-green text-white hover:opacity-95"
              ].join(" ")}
            >
              {saving ? "Saving..." : editingTransaction ? "Update Transaction" : "Add Transaction"}
            </button>

            {/* Tiny helper line — looks polished */}
            <p className="text-[11px] text-slate-500 text-center">
              Data is saved to MongoDB instantly.
            </p>
          </div>
        </form>
      </div>
    </BentoCard>
);

}
