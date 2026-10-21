import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allocationsApi, billsApi, goalsApi, transactionsApi } from "../api";
import { errorMessage } from "../api/http";
import { PLAN } from "../config/plan";
import { AREA_BY_ID, INCOME_CATEGORY } from "../lib/areas";
import { buildLedger } from "../lib/ledger";
import { convert, formatMoney } from "../lib/money";
import { pulse } from "../scene/events";
import { useAuth } from "./auth";
import { FinanceContext } from "./finance";
import { useToast } from "./toast";

const sortByDateDesc = (list) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
const byPriority = (list) => [...list].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || new Date(a.createdAt) - new Date(b.createdAt));

/**
 * FinanceProvider
 * ---------------
 * Loads the signed-in user's transactions, bills, goals and plans (allocations), exposes simple
 * actions, and recomputes the whole ledger (buildLedger) whenever data or settings change.
 * Every action: call the API, update local state from the response, play a scene pulse.
 * Deletes and confirmed plans can be undone from a toast, and crossing a goal milestone celebrates.
 */
export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const settings = user.settings;

  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // "today" is refreshed when the tab becomes visible again, so a tab left open overnight stays correct.
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && setToday(new Date());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  // Failures are shown as a toast (also visible inside popups) rather than a banner behind them.
  const fail = useCallback((text) => toast.push({ tone: "warn", text, ttl: 7000 }), [toast]);

  // Load everything once per signed-in user.
  useEffect(() => {
    let active = true;
    Promise.all([transactionsApi.list(), billsApi.list(), goalsApi.list(), allocationsApi.list()])
      .then(([t, b, g, a]) => {
        if (!active) return;
        setTransactions(t.data);
        setBills(b.data);
        setGoals(byPriority(g.data));
        setAllocations(a.data);
      })
      .catch((err) => active && fail(errorMessage(err, "Could not load your data.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user.id, fail]);

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

  const create = useCallback(
    (payload) =>
      transactionsApi.create(payload).then((res) => {
        setTransactions((prev) => sortByDateDesc([res.data, ...prev]));
        return res.data;
      }),
    []
  );

  // Earnings are income entries; they appear as "to assign" until you plan them.
  const addEarning = useCallback(
    (amount, title, currency) =>
      run(async () => {
        await create({ title: title || "Earnings", amount, type: "income", category: INCOME_CATEGORY, currency: currency || settings.currency });
        pulse("income");
      }, "Could not save the earning."),
    [run, create, settings.currency]
  );

  // Spending draws down the envelope it belongs to.
  const addSpending = useCallback(
    (areaId, amount, title, currency) =>
      run(async () => {
        await create({ title: title || AREA_BY_ID[areaId].label, amount, type: "expense", category: areaId, currency: currency || settings.currency });
        pulse("spend");
      }, "Could not save the spending."),
    [run, create, settings.currency]
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
              run: () => create({ title: gone.title, amount: gone.amount, type: gone.type, category: gone.category, currency: gone.currency, date: gone.date }).catch((err) => fail(errorMessage(err, "Could not restore the entry.")))
            }
          });
        }
      }, "Could not delete the entry."),
    [run, transactions, create, toast, fail]
  );

  const addBill = useCallback(
    (payload) =>
      run(async () => {
        const res = await billsApi.create({ currency: settings.currency, ...payload });
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
                  .catch((err) => fail(errorMessage(err, "Could not restore the bill.")))
            }
          });
        }
      }, "Could not delete the bill."),
    [run, bills, toast, fail]
  );

  // Goals: any number, funded in priority order (lowest number first). New goals go to the end.
  const saveGoal = useCallback(
    (payload, id) =>
      run(async () => {
        const body = { currency: settings.currency, ...payload };
        if (id) {
          const res = await goalsApi.update(id, body);
          setGoals((prev) => byPriority(prev.map((g) => (g._id === id ? res.data : g))));
        } else {
          const res = await goalsApi.create({ ...body, priority: goals.length });
          setGoals((prev) => byPriority([...prev, res.data]));
        }
        pulse("save");
      }, "Could not save the goal."),
    [run, goals.length, settings.currency]
  );

  const removeGoal = useCallback(
    (id) =>
      run(async () => {
        await goalsApi.remove(id);
        setGoals((prev) => prev.filter((g) => g._id !== id));
        // The server also removes the money planned into this goal, so it returns to "to assign".
        setAllocations((prev) => prev.filter((a) => a.envelope !== `goal:${id}`));
      }, "Could not delete the goal."),
    [run]
  );

  // Swap a goal's priority with its neighbour (direction -1 = fund earlier, +1 = later).
  const moveGoal = useCallback(
    (id, direction) =>
      run(async () => {
        const index = goals.findIndex((g) => g._id === id);
        const other = goals[index + direction];
        if (index < 0 || !other) return;
        const [a, b] = [goals[index], other];
        const [pa, pb] = [index + direction, index];
        const [ra, rb] = await Promise.all([goalsApi.update(a._id, { priority: pa }), goalsApi.update(b._id, { priority: pb })]);
        setGoals((prev) => byPriority(prev.map((g) => (g._id === a._id ? ra.data : g._id === b._id ? rb.data : g))));
      }, "Could not change the order."),
    [run, goals]
  );

  // Confirm a plan: save every line at once (all or nothing). The toast offers to undo it.
  const confirmPlan = useCallback(
    (lines) =>
      run(async () => {
        const res = await allocationsApi.create({ lines: lines.map((l) => ({ envelope: l.id, amount: l.amount })), currency: settings.currency });
        setAllocations((prev) => [...res.data, ...prev]);
        pulse("save");
        toast.push({
          text: "Plan saved. Every shilling has a job.",
          tone: "good",
          action: {
            label: "Undo",
            run: async () => {
              try {
                await Promise.all(res.data.map((a) => allocationsApi.remove(a._id)));
                const ids = new Set(res.data.map((a) => a._id));
                setAllocations((prev) => prev.filter((a) => !ids.has(a._id)));
              } catch (err) {
                fail(errorMessage(err, "Could not undo the plan."));
              }
            }
          }
        });
      }, "Could not save the plan."),
    [run, settings.currency, toast, fail]
  );

  // The whole ledger, recomputed only when inputs change.
  const ledger = useMemo(() => buildLedger({ transactions, allocations, bills, goals, settings, now: today }), [transactions, allocations, bills, goals, settings, today]);

  // Celebrate crossing a goal milestone (25, 50, 75, 100%). The first reading after load is only a baseline.
  const lastMilestones = useRef(null);
  useEffect(() => {
    if (loading) return;
    const reached = Object.fromEntries(ledger.goals.map((g) => [g.id, PLAN.milestones.filter((m) => g.progress >= m - 1e-9).length]));
    if (lastMilestones.current) {
      for (const g of ledger.goals) {
        const before = lastMilestones.current[g.id];
        if (before != null && reached[g.id] > before) {
          const level = PLAN.milestones[reached[g.id] - 1];
          toast.push({ tone: "good", text: level >= 1 ? `Goal reached: you can buy your ${g.name}.` : `${Math.round(level * 100)}% of your ${g.name} is saved.`, ttl: 7000 });
          pulse("milestone");
        }
      }
    }
    lastMilestones.current = reached;
  }, [loading, ledger.goals, toast]);

  // Convert a stored amount into the currency currently shown on screen.
  const toDisplay = useCallback((amount, from) => convert(amount, from || "KES", settings.currency, settings.usdToKes), [settings.currency, settings.usdToKes]);
  const money = useCallback((amount) => formatMoney(amount, settings.currency), [settings.currency]);

  const value = {
    loading,
    toDisplay,
    money,
    transactions,
    bills,
    goals,
    allocations,
    ledger,
    addEarning,
    addSpending,
    removeTransaction,
    addBill,
    removeBill,
    saveGoal,
    removeGoal,
    moveGoal,
    confirmPlan
  };
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
