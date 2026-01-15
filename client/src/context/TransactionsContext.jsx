import React, { createContext, useEffect, useMemo, useState } from "react";
import { transactionsApi } from "../api/transactions";

/**
 * TransactionsContext
 * -------------------
 * This context holds:
 * - the transactions array (items)
 * - loading + error states
 * - functions that mutate data (create, remove)
 * - derived totals (income, expense, balance)
 *
 * Why Context?
 * - Multiple components (cards, list, chart, form) need the same data.
 * - Context avoids "prop drilling" and keeps your app architecture clean.
 */
export const TransactionsContext = createContext(null);

/**
 * TransactionsProvider
 * --------------------
 * Wrap your app with this so every child can access transactions state.
 */
export function TransactionsProvider({ children }) {
  // Raw transactions from the database/API
  const [items, setItems] = useState([]);

  // UI control states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Auto-load data once on mount
   * ----------------------------
   * When the provider mounts, we fetch transactions so the app starts with data.
   */
  
    /**
   * monthlyBudget
   * -------------
   * User-configurable budget for the current month.
   * We keep it in Context because multiple components will need it
   * (summary banner + future settings, etc).
   */
  const [monthlyBudget, setMonthlyBudget] = useState(20000);

    /**
   * editingTransaction
   * ------------------
   * Holds the transaction the user is currently editing.
   * If null => form is in "Add" mode.
   * If set => form is in "Edit/Update" mode.
   */
  const [editingTransaction, setEditingTransaction] = useState(null);

    /**
   * activeCategory
   * --------------
   * Controls filtering in the UI.
   * "All" means no filter (show everything).
   * Keeping this in Context allows multiple components to share it (list + chart).
   */
  const [activeCategory, setActiveCategory] = useState("All");


  /**
   * fetchAll()
   * ----------
   * Loads transactions from the backend API and updates state.
   * We keep it as a function so we can reuse it later (e.g. manual refresh).
   */
  const fetchAll = async () => {
    try {
      setError("");
      setLoading(true);

      // API returns: { success, count, data }
      const res = await transactionsApi.getAll();
      setItems(res.data || []);
    } catch (err) {
      // Make the error readable (backend error message if available)
      setError(err?.response?.data?.message || err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  /**
   * createTransaction(payload)
   * --------------------------
   * Creates a transaction in the DB via API, then updates local state.
   * We prepend the new item so the UI updates instantly.
   */
  const createTransaction = async (payload) => {
    try {
      setError("");

      const res = await transactionsApi.create(payload);

      // Add the new transaction at the top of the list (most recent first)
      setItems((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create transaction");
      throw err; // rethrow so forms can show their own errors if needed
    }
  };

    /**
   * updateTransaction(id, payload)
   * ------------------------------
   * Updates in the DB, then updates the item locally in state.
   * We replace the matching item in the items array.
   */
  const updateTransaction = async (id, payload) => {
    try {
      setError("");

      const res = await transactionsApi.update(id, payload);

      // Update local state by replacing the matching transaction
      setItems((prev) => prev.map((t) => (t._id === id ? res.data : t)));

      // After successful update, exit edit mode
      setEditingTransaction(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to update transaction");
      throw err;
    }
  };


  /**
   * removeTransaction(id)
   * ---------------------
   * Deletes a transaction in the DB via API, then removes it locally.
   */
  const removeTransaction = async (id) => {
    try {
      setError("");

      await transactionsApi.remove(id);

      // Remove locally so UI updates immediately
      setItems((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete transaction");
      throw err;
    }
  };

  /**
   * Derived values (computed from items)
   * ------------------------------------
   * useMemo prevents recomputing totals on every render unless items change.
   * This matters more as the app grows (performance + correctness).
   */
  const totals = useMemo(() => {
    // Sum income amounts
    const income = items
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Sum expense amounts
    const expense = items
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Derived business value: balance is not stored in DB
    const balance = income - expense;

    /**
     * monthExpense
     * ------------
     * Total expenses ONLY for the current month.
     * This powers budget warnings and monthly reports.
     */
    const now = new Date();
    const monthExpense = items
      .filter((t) => {
        const d = new Date(t.date); // backend stores date; parse it here
        return (
          t.type === "expense" &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    /**
     * overBudget
     * ----------
     * Simple business rule: if monthExpense > monthlyBudget, warn user.
     */
    const overBudget = monthExpense > monthlyBudget;

    return { income, expense, balance, monthExpense, overBudget };
  }, [items, monthlyBudget]);

    /**
   * categories
   * ----------
   * Creates a unique list of categories from existing transactions.
   * We include "All" at the front.
   */
  const categories = useMemo(() => {
    const set = new Set();

    for (const t of items) {
      if (t.category) set.add(t.category);
    }

    return ["All", ...Array.from(set).sort()];
  }, [items]);


    /**
   * filteredItems
   * -------------
   * This is what the UI should use to display transactions.
   * Important: We DO NOT mutate the real items array.
   * Filtering is a view concern, so we compute it from items + activeCategory.
   */
  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((t) => (t.category || "General") === activeCategory);
  }, [items, activeCategory]);

  
  useEffect(() => {
    fetchAll();
  }, []);

  /**
   * Value exposed to all components
   * -------------------------------
   * Any component can access these via useContext(TransactionsContext).
   */
  const value = {
    items,
    loading,
    error,

    // Derived values
    ...totals,

    // Budget state
    monthlyBudget,
    setMonthlyBudget,

    // Actions
    fetchAll,
    createTransaction,
    editingTransaction,
    setEditingTransaction,
    updateTransaction,
    
    // Filtering
    activeCategory,
    setActiveCategory,
    categories,
    filteredItems,
    removeTransaction
  };


  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}
