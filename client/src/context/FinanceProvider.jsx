import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { billsApi, goalsApi, transactionsApi } from "../api";
import { errorMessage } from "../api/http";
import { PLAN } from "../config/plan";
import { AREA_BY_ID, INCOME_CATEGORY } from "../lib/areas";
import { buildSummary } from "../lib/finance";
import { convert, formatMoney } from "../lib/money";
import { pulse } from "../scene/events";
import { useAuth } from "./auth";
import { FinanceContext } from "./finance";
import { useToast } from "./toast";

const sortByDateDesc = (list) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

/**
 * FinanceProvider
 * ---------------
 * Loads the signed-in user's transactions, bills and goal, exposes simple actions,
 * and recomputes the whole plan (buildSummary) whenever the data, settings or viewed month change.
 * Every action: call the API, update local state from the response, play a scene pulse.
 * Deletes can be undone from a toast, and passing a goal milestone shows a celebration.
 */
export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const settings = user.settings;

  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // "today" is refreshed when the tab becomes visible again, so a tab left open overnight stays correct.
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && setToday(new Date());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  // Which month the dashboard shows. null = the current month.
  const [viewOffset, setViewOffset] = useState(0); // 0 = this month, -1 = last month, ...
  const viewDate = useMemo(() => (viewOffset === 0 ? today : new Date(today.getFullYear(), today.getMonth() + viewOffset, 15, 12)), [viewOffset, today]);
  const isCurrent = viewOffset === 0;

  // Failures are shown as a toast (also visible inside popups) rather than a banner behind them.
  const fail = useCallback((text) => toast.push({ tone: "warn", text, ttl: 7000 }), [toast]);

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
      .catch((err) => active && fail(errorMessage(err, "Could not load your data.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user.id, fail]);

  // Oldest month with data limits how far back the month arrows go.
  const earliestOffset = useMemo(() => {
    if (transactions.length === 0) return 0;
    const oldest = transactions.reduce((min, t) => Math.min(min, new Date(t.date).getTime()), Infinity);
    const d = new Date(oldest);
    return Math.min(0, (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth()));
  }, [transactions, today]);

  const shiftMonth = useCallback((delta) => setViewOffset((v) => Math.min(0, Math.max(earliestOffset, v + delta))), [earliestOffset]);
  const goToToday = useCallback(() => setViewOffset(0), []);

  // Run an API action; surface failures as a toast and rethrow so forms can react.
  const run = useCallback(
    async (fn, fallback) => {
      try {
        return await fn();
      } catch (err) {
        fail(errorMessage(err, fallback));
        throw err;
      }
    },
    [fail]
  );

  // Entries added while viewing a past month are dated the last day of that month.
  const entryDate = useCallback(() => (viewOffset === 0 ? undefined : new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 12).toISOString()), [viewOffset, viewDate]);

  const create = useCallback(
    (payload) =>
      transactionsApi.create(payload).then((res) => {
        setTransactions((prev) => sortByDateDesc([res.data, ...prev]));
        return res.data;
      }),
    []
  );

  // Earnings are income entries; everything else is an expense in one of the six areas.
  const addEarning = useCallback(
    (amount, title, currency) =>
      run(async () => {
        await create({ title: title || "Earnings", amount, type: "income", category: INCOME_CATEGORY, currency: currency || settings.currency, date: entryDate() });
        pulse("income");
      }, "Could not save the earning."),
    [run, create, settings.currency, entryDate]
  );

  const addSpending = useCallback(
    (areaId, amount, title, currency) =>
      run(async () => {
        await create({ title: title || AREA_BY_ID[areaId].label, amount, type: "expense", category: areaId, currency: currency || settings.currency, date: entryDate() });
        pulse(areaId === "savings" ? "save" : "spend");
      }, "Could not save the spending."),
    [run, create, settings.currency, entryDate]
  );

  const removeTransaction = useCallback(
    (id) =>
      run(async () => {
        const gone = transactions.find((t) => t._id === id);
        await transactionsApi.remove(id);
        setTransactions((prev) => prev.filter((t) => t._id !== id));
        if (gone) {
          toast.push({
            text: `Deleted "${gone.title}"`,
            action: {
              label: "Undo",
              run: () => create({ title: gone.title, amount: gone.amount, type: gone.type, category: gone.category, currency: gone.currency, date: gone.date }).catch((err) => fail(errorMessage(err, "Could not restore the entry."))),
            },
          });
        }
      }, "Could not delete the entry."),
    [run, transactions, create, toast, fail]
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
        const gone = bills.find((b) => b._id === id);
        await billsApi.remove(id);
        setBills((prev) => prev.filter((b) => b._id !== id));
        if (gone) {
          toast.push({
            text: `Deleted bill "${gone.name}"`,
            action: {
              label: "Undo",
              run: () =>
                billsApi
                  .create({ name: gone.name, amount: gone.amount, dueDay: gone.dueDay, category: gone.category, currency: gone.currency })
                  .then((res) => setBills((prev) => [...prev, res.data].sort((a, b) => a.dueDay - b.dueDay)))
                  .catch((err) => fail(errorMessage(err, "Could not restore the bill."))),
            },
          });
        }
      }, "Could not delete the bill."),
    [run, bills, toast, fail]
  );

  // There is one main goal (the motorbike): create it the first time, update it after.
  const goal = goals[0] ?? null;
  const saveGoal = useCallback(
    (payload) =>
      run(async () => {
        const body = { ...payload, currency: settings.currency };
        const res = goal ? await goalsApi.update(goal._id, body) : await goalsApi.create(body);
        setGoals([res.data]);
        pulse("save");
      }, "Could not save the goal."),
    [run, goal, settings.currency]
  );

  // The whole plan, recomputed only when inputs change.
  const summary = useMemo(
    () => buildSummary({ transactions, bills, goal, settings, now: viewDate, today }),
    [transactions, bills, goal, settings, viewDate, today]
  );

  // Celebrate crossing a goal milestone (25, 50, 75, 100%). The first reading after load is only a baseline.
  const lastMilestone = useRef(null);
  const progress = summary.goal?.progress ?? null;
  const goalName = summary.goal?.name;
  useEffect(() => {
    if (loading || progress == null || !isCurrent) return;
    const reached = PLAN.milestones.filter((m) => progress >= m - 1e-9).length;
    if (lastMilestone.current != null && reached > lastMilestone.current) {
      const level = PLAN.milestones[reached - 1];
      toast.push({
        tone: "good",
        text: level >= 1 ? `Goal reached: you can buy your ${goalName}.` : `${Math.round(level * 100)}% of your ${goalName} is saved.`,
        ttl: 7000
      });
      pulse("milestone");
    }
    lastMilestone.current = reached;
  }, [loading, progress, isCurrent, goalName, toast]);

  // Convert a stored amount into the currency currently shown on screen.
  const toDisplay = useCallback(
    (amount, from) => convert(amount, from || "KES", settings.currency, settings.usdToKes),
    [settings.currency, settings.usdToKes]
  );
  const money = useCallback((amount) => formatMoney(amount, settings.currency), [settings.currency]);

  const value = {
    loading,
    toDisplay,
    money,
    transactions,
    bills,
    goal,
    summary,
    // Month browsing
    isCurrent,
    viewDate,
    canGoPrev: viewOffset > earliestOffset,
    shiftMonth,
    goToToday,
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
