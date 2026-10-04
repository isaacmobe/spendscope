import { useCallback, useEffect, useMemo, useState } from "react";
import { billsApi, goalsApi, transactionsApi } from "../api";
import { errorMessage } from "../api/http";
import { AREA_BY_ID, INCOME_CATEGORY } from "../lib/areas";
import { buildSummary } from "../lib/finance";
import { convert } from "../lib/money";
import { pulse } from "../scene/events";
import { useAuth } from "./auth";
import { FinanceContext } from "./finance";

/**
 * FinanceProvider
 * ---------------
 * Loads the signed-in user's transactions, bills and goal, exposes simple actions,
 * and recomputes the whole plan (buildSummary) whenever the data or settings change.
 * Every action: call the API, update local state from the response, play a scene pulse.
 */
export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const settings = user.settings;

  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load everything once per signed-in user.
  useEffect(() => {
    let active = true;
    Promise.all([transactionsApi.list(), billsApi.list(), goalsApi.list()])
      .then(([t, b, g]) => {
        if (!active) return;
        setTransactions(t.data);
        setBills(b.data);
        setGoals(g.data);
      })
      .catch((err) => active && setError(errorMessage(err, "Could not load your data.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user.id]);

  // Run an API action; surface failures as a visible message and rethrow so forms can react.
  const run = useCallback(async (fn, fallback) => {
    try {
      setError("");
      return await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
      throw err;
    }
  }, []);

  // Earnings are income entries; everything else is an expense in one of the six areas.
  const addEarning = useCallback(
    (amount, title) =>
      run(async () => {
        const res = await transactionsApi.create({
          title: title || "Earnings",
          amount,
          type: "income",
          category: INCOME_CATEGORY,
          currency: settings.currency
        });
        setTransactions((prev) => [res.data, ...prev]);
        pulse("income");
      }, "Could not save the earning."),
    [run, settings.currency]
  );

  const addSpending = useCallback(
    (areaId, amount, title) =>
      run(async () => {
        const res = await transactionsApi.create({
          title: title || AREA_BY_ID[areaId].label,
          amount,
          type: "expense",
          category: areaId,
          currency: settings.currency
        });
        setTransactions((prev) => [res.data, ...prev]);
        pulse(areaId === "savings" ? "save" : "spend");
      }, "Could not save the spending."),
    [run, settings.currency]
  );

  const removeTransaction = useCallback(
    (id) =>
      run(async () => {
        await transactionsApi.remove(id);
        setTransactions((prev) => prev.filter((t) => t._id !== id));
      }, "Could not delete the entry."),
    [run]
  );

  const addBill = useCallback(
    (payload) =>
      run(async () => {
        const res = await billsApi.create({ ...payload, currency: settings.currency });
        setBills((prev) => [...prev, res.data].sort((a, b) => a.dueDay - b.dueDay));
        pulse("spend");
      }, "Could not save the bill."),
    [run, settings.currency]
  );

  const removeBill = useCallback(
    (id) =>
      run(async () => {
        await billsApi.remove(id);
        setBills((prev) => prev.filter((b) => b._id !== id));
      }, "Could not delete the bill."),
    [run]
  );

  // There is one main goal (the motorbike): create it the first time, update it after.
  const goal = goals[0] ?? null;
  const saveGoal = useCallback(
    (payload) =>
      run(async () => {
        const body = { ...payload, currency: settings.currency };
        if (goal) {
          const res = await goalsApi.update(goal._id, body);
          setGoals([res.data]);
        } else {
          const res = await goalsApi.create(body);
          setGoals([res.data]);
        }
        pulse("save");
      }, "Could not save the goal."),
    [run, goal, settings.currency]
  );

  // The whole plan, recomputed only when inputs change.
  const summary = useMemo(
    () => buildSummary({ transactions, bills, goal, settings }),
    [transactions, bills, goal, settings]
  );

  // Convert a stored amount into the currency currently shown on screen.
  const toDisplay = useCallback(
    (amount, from) => convert(amount, from || "KES", settings.currency, settings.usdToKes),
    [settings.currency, settings.usdToKes]
  );

  const value = {
    loading,
    toDisplay,
    error,
    clearError: () => setError(""),
    transactions,
    bills,
    goal,
    summary,
    // Actions
    addEarning,
    addSpending,
    removeTransaction,
    addBill,
    removeBill,
    saveGoal
  };
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
