import { useEffect, useRef, useState } from "react";
import AmountForm from "./AmountForm";
import { HexButton, HexDot, HexField, HexMeter, HexStepper } from "./hx";
import { IconTrash } from "./icons";
import { useFinance } from "../context/finance";
import { formatMoney } from "../lib/money";

const toneFor = (ratio) => (ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "ok");

// Delete button that asks twice: the first click turns it into "Sure?", the second deletes.
function ConfirmDelete({ onConfirm, label }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const click = () => {
    if (armed) return onConfirm();
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
  };

  return (
    <HexButton size="sm" variant={armed ? "rose" : "ghost"} aria-label={armed ? `Confirm delete ${label}` : `Delete ${label}`} onClick={click} className="!px-3">
      {armed ? "Sure?" : <IconTrash className="h-4 w-4" />}
    </HexButton>
  );
}

// A list of entries (transactions) with a delete button on each.
export function EntryList({ entries, empty }) {
  const { removeTransaction } = useFinance();
  if (entries.length === 0) return <p className="py-3 text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-2">
      {entries.map((t) => (
        <li key={t._id} className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <HexDot />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <p className="font-mono text-[11px] text-ink-soft">{new Date(t.date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-sm">{formatMoney(t.amount, t.currency)}</span>
            <ConfirmDelete label={t.title} onConfirm={() => removeTransaction(t._id).catch(() => {})} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }) {
  return <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-soft">{children}</h3>;
}

/** Housing, Food, Transport, Lifestyle: add spending, see this month's entries. */
export function SpendPanel({ area }) {
  const { addSpending, summary } = useFinance();
  const { currency, entries } = summary;
  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-sm">
          {formatMoney(area.spent, currency)} <span className="text-ink-soft">of {formatMoney(area.budget, currency)} planned</span>
        </p>
        <HexMeter className="mt-2" ratio={area.ratio} tone={toneFor(area.ratio)} />
        {area.budget === 0 && <p className="mt-2 text-xs text-ink-soft">Record earnings in the core to give this area a budget.</p>}
        {area.projected != null && area.budget > 0 && (
          <p className="mt-2 text-xs text-ink-soft">At this pace the month ends near {formatMoney(area.projected, currency)}.</p>
        )}
      </section>
      <AmountForm withNote submitLabel="Add" currency={currency} onSubmit={(amount, note) => addSpending(area.id, amount, note)} />
      <section>
        <SectionTitle>This month</SectionTitle>
        <EntryList entries={entries[area.id]} empty="Nothing recorded here yet." />
      </section>
    </div>
  );
}

/** Earnings history, opened from the core. */
export function EarningsPanel() {
  const { summary } = useFinance();
  return (
    <div>
      <SectionTitle>Earnings this month</SectionTitle>
      <EntryList entries={summary.incomeEntries} empty="No earnings recorded this month." />
    </div>
  );
}

const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

/** Bills: recurring monthly obligations with a due day. */
export function BillsPanel() {
  const { bills, addBill, removeBill, summary, toDisplay } = useFinance();
  const { currency } = summary;
  const [form, setForm] = useState({ name: "", amount: "" });
  const [dueDay, setDueDay] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim()) return setError("Give the bill a name.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount above 0.");
    setError("");
    setBusy(true);
    try {
      await addBill({ name: form.name.trim(), amount, dueDay });
      setForm({ name: "", amount: "" });
    } catch {
      /* error banner shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="font-mono text-sm">
        {formatMoney(summary.billsTotal, currency)} <span className="text-ink-soft">committed every month</span>
      </p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <HexField label="Bill" value={form.name} maxLength={60} onChange={set("name")} placeholder="e.g. Wi-Fi" />
        <HexField label={`Amount (${currency})`} type="number" inputMode="decimal" step="any" min="0" value={form.amount} onChange={set("amount")} />
        <HexStepper label="Due day of the month" value={dueDay} onChange={setDueDay} min={1} max={31} format={(n) => `the ${n}${ordinal(n)}`} />
        <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
          Add bill
        </HexButton>
        {error && <p role="alert" className="text-center text-[11px] font-medium text-rose-deep">{error}</p>}
      </form>
      <section>
        <SectionTitle>Your bills</SectionTitle>
        {bills.length === 0 ? (
          <p className="text-sm text-ink-soft">No bills yet. Add rent, internet, loans or school fees.</p>
        ) : (
          <ul className="space-y-2">
            {bills.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <HexDot />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="font-mono text-[11px] text-ink-soft">due on the {b.dueDay}{ordinal(b.dueDay)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm">{formatMoney(toDisplay(b.amount, b.currency), currency)}</span>
                  <ConfirmDelete label={b.name} onConfirm={() => removeBill(b._id).catch(() => {})} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Whole months between today and a deadline (0 when there is none), for the stepper.
const monthsUntil = (deadline, today) =>
  deadline ? Math.max(0, Math.round((new Date(deadline) - today) / (30.44 * 86400000))) : 0;

// Create or edit the main goal. Values are shown and saved in the current display currency.
function GoalForm({ goal }) {
  const { saveGoal, toDisplay, summary } = useFinance();
  const { currency } = summary;
  const [today] = useState(() => new Date());
  const round = (n) => String(Math.round(n * 100) / 100);
  const [form, setForm] = useState({
    name: goal?.name ?? "Motorbike",
    targetAmount: goal ? round(toDisplay(goal.targetAmount, goal.currency)) : "",
    savedAmount: goal ? round(toDisplay(goal.savedAmount, goal.currency)) : "0"
  });
  const [months, setMonths] = useState(() => monthsUntil(goal?.deadline, today));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const deadlineDate = months > 0 ? new Date(today.getFullYear(), today.getMonth() + months, today.getDate()) : null;

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
      if (deadlineDate) payload.deadline = deadlineDate.toISOString();
      await saveGoal(payload);
    } catch {
      /* error banner shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <HexField label="Goal name" value={form.name} maxLength={60} onChange={set("name")} />
      <HexField label={`Price (${currency})`} type="number" inputMode="decimal" step="any" min="0" value={form.targetAmount} onChange={set("targetAmount")} />
      <HexField label={`Already saved (${currency})`} type="number" inputMode="decimal" step="any" min="0" value={form.savedAmount} onChange={set("savedAmount")} />
      <HexStepper
        label="Buy it within"
        value={months}
        onChange={setMonths}
        min={0}
        max={120}
        format={(n) => (n === 0 ? "no deadline" : `${n} month${n === 1 ? "" : "s"}`)}
      />
      {deadlineDate && <p className="ml-4 text-[11px] text-ink-soft">Target date: {deadlineDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>}
      <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
        {goal ? "Save changes" : "Set goal"}
      </HexButton>
      {error && <p role="alert" className="text-center text-[11px] font-medium text-rose-deep">{error}</p>}
    </form>
  );
}

/** Motorbike fund: goal setup, progress, contributions. */
export function SavingsPanel({ area }) {
  const { goal, summary, addSpending } = useFinance();
  const { currency, entries } = summary;
  const [editing, setEditing] = useState(false);
  const g = summary.goal;

  if (!goal) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">What are you saving for? Tell the console the price and it works out how long it takes with your plan.</p>
        <GoalForm goal={null} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-sm">
          {formatMoney(g.saved, currency)} <span className="text-ink-soft">of {formatMoney(g.target, currency)}</span>
        </p>
        <HexMeter className="mt-2" ratio={g.progress} tone="good" />
        <p className="mt-3 text-sm">
          {g.reached
            ? `You have enough for your ${g.name}. Time to ride.`
            : g.monthsToGo == null
              ? "Record earnings and a savings share to see when you can buy it."
              : `At your plan's savings pace you reach it in ${g.monthsToGo} month${g.monthsToGo === 1 ? "" : "s"} (about ${g.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })}).`}
        </p>
        {g.soonerBy && <p className="mt-1 text-xs text-ink-soft">Saving 5% more of your earnings would bring that {g.soonerBy} month{g.soonerBy === 1 ? "" : "s"} closer.</p>}
      </section>
      <AmountForm withNote submitLabel="Save" currency={currency} onSubmit={(amount, note) => addSpending(area.id, amount, note || `Saved for ${g.name}`)} />
      <section>
        <SectionTitle>Saved this month</SectionTitle>
        <EntryList entries={entries.savings} empty="Nothing set aside this month yet." />
      </section>
      <section>
        <HexButton variant="ghost" size="sm" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          {editing ? "Hide goal settings" : "Edit goal"}
        </HexButton>
        {editing && (
          <div className="mt-4">
            <GoalForm goal={goal} />
          </div>
        )}
      </section>
    </div>
  );
}
