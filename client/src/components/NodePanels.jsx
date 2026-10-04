import { useState } from "react";
import AmountForm from "./AmountForm";
import { useFinance } from "../context/finance";
import { formatMoney } from "../lib/money";

const inputClass = "w-full border border-ink/60 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none";

function Label({ children }) {
  return <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{children}</span>;
}

// Progress bar: indigo, orange past 85%, salmon over 100%.
function Bar({ ratio }) {
  const color = ratio > 1 ? "bg-salmon" : ratio > 0.85 ? "bg-ember" : "bg-accent";
  return (
    <div className="h-2 w-full bg-line/60" role="presentation">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  );
}

// A list of entries (transactions) with a delete button on each.
export function EntryList({ entries, empty }) {
  const { removeTransaction } = useFinance();
  if (entries.length === 0) return <p className="py-3 text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {entries.map((t) => (
        <li key={t._id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{t.title}</p>
            <p className="font-mono text-[11px] text-ink-soft">{new Date(t.date).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">{formatMoney(t.amount, t.currency)}</span>
            <button
              type="button"
              aria-label={`Delete ${t.title}`}
              onClick={() => window.confirm(`Delete "${t.title}"?`) && removeTransaction(t._id).catch(() => {})}
              className="px-1 text-lg leading-none text-ink-soft hover:text-salmon-dark"
            >
              &times;
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Housing, Food, Transport, Lifestyle: add spending, see this month's entries. */
export function SpendPanel({ area }) {
  const { addSpending, summary } = useFinance();
  const { currency, entries } = summary;
  return (
    <div className="space-y-5">
      <section>
        <p className="font-mono text-sm">
          {formatMoney(area.spent, currency)} <span className="text-ink-soft">of {formatMoney(area.budget, currency)} planned</span>
        </p>
        <div className="mt-2"><Bar ratio={area.ratio} /></div>
        {area.budget === 0 && <p className="mt-2 text-xs text-ink-soft">Record earnings in the core to give this area a budget.</p>}
      </section>
      <AmountForm withNote submitLabel="Add" currency={currency} onSubmit={(amount, note) => addSpending(area.id, amount, note)} />
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">This month</h3>
        <EntryList entries={entries[area.id]} empty="Nothing recorded here yet." />
      </section>
    </div>
  );
}

/** Earnings history, opened from the core. */
export function EarningsPanel() {
  const { summary } = useFinance();
  return <EntryList entries={summary.incomeEntries} empty="No earnings recorded this month." />;
}

/** Bills: recurring monthly obligations with a due day. */
export function BillsPanel() {
  const { bills, addBill, removeBill, summary, toDisplay } = useFinance();
  const { currency } = summary;
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const dueDay = Number(form.dueDay);
    if (!form.name.trim()) return setError("Give the bill a name.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount above 0.");
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return setError("Due day must be 1 to 31.");
    setError("");
    setBusy(true);
    try {
      await addBill({ name: form.name.trim(), amount, dueDay });
      setForm({ name: "", amount: "", dueDay: "" });
    } catch {
      /* error banner shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="font-mono text-sm">
        {formatMoney(summary.billsTotal, currency)} <span className="text-ink-soft">committed every month</span>
      </p>
      <form onSubmit={submit} className="grid grid-cols-6 gap-2" noValidate>
        <label className="col-span-6 sm:col-span-3"><Label>Bill</Label>
          <input className={inputClass} value={form.name} maxLength={60} onChange={set("name")} placeholder="e.g. Wi-Fi" />
        </label>
        <label className="col-span-3 sm:col-span-2"><Label>Amount ({currency})</Label>
          <input className={inputClass} type="number" inputMode="decimal" step="any" min="0" value={form.amount} onChange={set("amount")} />
        </label>
        <label className="col-span-3 sm:col-span-1"><Label>Due day</Label>
          <input className={inputClass} type="number" inputMode="numeric" min="1" max="31" value={form.dueDay} onChange={set("dueDay")} />
        </label>
        <button type="submit" disabled={busy} className="col-span-6 bg-ink py-2 text-sm font-semibold uppercase tracking-wider text-paper-light hover:bg-accent disabled:opacity-50">
          Add bill
        </button>
        {error && <p role="alert" className="col-span-6 text-xs font-medium text-salmon-dark">{error}</p>}
      </form>
      {bills.length === 0 ? (
        <p className="text-sm text-ink-soft">No bills yet. Add rent, internet, loans or school fees.</p>
      ) : (
        <ul className="divide-y divide-line">
          {bills.map((b) => (
            <li key={b._id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.name}</p>
                <p className="font-mono text-[11px] text-ink-soft">due on the {b.dueDay}{ordinal(b.dueDay)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{formatMoney(toDisplay(b.amount, b.currency), currency)}</span>
                <button
                  type="button"
                  aria-label={`Delete ${b.name}`}
                  onClick={() => window.confirm(`Delete "${b.name}"?`) && removeBill(b._id).catch(() => {})}
                  className="px-1 text-lg leading-none text-ink-soft hover:text-salmon-dark"
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

// Create or edit the main goal. Values are shown and saved in the current display currency.
function GoalForm({ goal, onDone }) {
  const { saveGoal, toDisplay, summary } = useFinance();
  const { currency } = summary;
  const round = (n) => String(Math.round(n * 100) / 100);
  const [form, setForm] = useState({
    name: goal?.name ?? "Motorbike",
    targetAmount: goal ? round(toDisplay(goal.targetAmount, goal.currency)) : "",
    savedAmount: goal ? round(toDisplay(goal.savedAmount, goal.currency)) : "0",
    deadline: goal?.deadline ? goal.deadline.slice(0, 10) : ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const targetAmount = Number(form.targetAmount);
    const savedAmount = Number(form.savedAmount || 0);
    if (!form.name.trim()) return setError("Give the goal a name.");
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return setError("Enter the price you are saving for.");
    if (!Number.isFinite(savedAmount) || savedAmount < 0) return setError("Already saved cannot be negative.");
    setError("");
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), targetAmount, savedAmount };
      if (form.deadline) payload.deadline = form.deadline;
      await saveGoal(payload);
      onDone?.();
    } catch {
      /* error banner shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2" noValidate>
      <label className="col-span-2"><Label>Goal name</Label>
        <input className={inputClass} value={form.name} maxLength={60} onChange={set("name")} />
      </label>
      <label><Label>Price ({currency})</Label>
        <input className={inputClass} type="number" inputMode="decimal" step="any" min="0" value={form.targetAmount} onChange={set("targetAmount")} />
      </label>
      <label><Label>Already saved ({currency})</Label>
        <input className={inputClass} type="number" inputMode="decimal" step="any" min="0" value={form.savedAmount} onChange={set("savedAmount")} />
      </label>
      <label className="col-span-2"><Label>Buy by (optional)</Label>
        <input className={inputClass} type="date" value={form.deadline} onChange={set("deadline")} />
      </label>
      <button type="submit" disabled={busy} className="col-span-2 bg-ink py-2 text-sm font-semibold uppercase tracking-wider text-paper-light hover:bg-accent disabled:opacity-50">
        {goal ? "Save changes" : "Set goal"}
      </button>
      {error && <p role="alert" className="col-span-2 text-xs font-medium text-salmon-dark">{error}</p>}
    </form>
  );
}

/** Motorbike fund: goal setup, progress, contributions. */
export function SavingsPanel({ area }) {
  const { goal, summary, addSpending } = useFinance();
  const { currency, entries } = summary;
  const g = summary.goal;

  if (!goal) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">What are you saving for? Tell the console the price and it will work out how long it takes with your plan.</p>
        <GoalForm goal={null} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="font-mono text-sm">
          {formatMoney(g.saved, currency)} <span className="text-ink-soft">of {formatMoney(g.target, currency)}</span>
        </p>
        <div className="mt-2"><Bar ratio={g.progress} /></div>
        <p className="mt-2 text-sm">
          {g.reached
            ? `You have enough for your ${g.name}. Time to ride.`
            : g.monthsToGo == null
              ? "Record earnings and a savings share to see when you can buy it."
              : `At your plan's savings pace you reach it in ${g.monthsToGo} month${g.monthsToGo === 1 ? "" : "s"} (about ${g.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })}).`}
        </p>
      </section>
      <AmountForm withNote submitLabel="Save" currency={currency} onSubmit={(amount, note) => addSpending(area.id, amount, note || `Saved for ${g.name}`)} />
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Saved this month</h3>
        <EntryList entries={entries.savings} empty="Nothing set aside this month yet." />
      </section>
      <details className="border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Edit goal</summary>
        <div className="mt-3"><GoalForm goal={goal} /></div>
      </details>
    </div>
  );
}
