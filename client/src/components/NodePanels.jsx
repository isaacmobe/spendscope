import { useEffect, useRef, useState } from "react";
import AmountForm from "./AmountForm";
import { HexButton, HexDot, HexField, HexMeter, HexSegmented, HexStepper } from "./hx";
import { IconChevronLeft, IconChevronRight, IconTrash } from "./icons";
import { useFinance } from "../context/finance";
import { CURRENCIES, formatMoney } from "../lib/money";

const toneFor = (ratio) => (ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "ok");
const monthYear = (d) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

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
  return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-soft">{children}</h3>;
}

const newestFirst = (list) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

/** Housing, Food, Transport, Lifestyle: what is left in the envelope, add spending, recent entries. */
export function EnvelopePanel({ id }) {
  const { addSpending, ledger } = useFinance();
  const { currency } = ledger;
  const env = ledger.envelopes[id];
  const ratio = env.allocated > 0 ? env.spent / env.allocated : env.spent > 0 ? 2 : 0;
  const fresh = env.allocated === 0 && env.spent === 0;
  return (
    <div className="space-y-6">
      <section>
        <p className={`font-mono text-2xl font-semibold ${env.balance < 0 ? "text-rose-deep" : "text-accent"}`}>{formatMoney(env.balance, currency)}</p>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          left of {formatMoney(env.allocated, currency)} planned, {formatMoney(env.spent, currency)} spent
        </p>
        <HexMeter className="mt-3" ratio={ratio} tone={toneFor(ratio)} />
        {fresh && <p className="mt-3 text-xs text-ink-soft">No money is planned here yet. Plan your earnings from the centre and this envelope is filled.</p>}
        {env.balance < 0 && <p className="mt-3 text-xs text-rose-deep">This envelope is overspent. Cover it from Lifestyle in your next plan, or spend less here.</p>}
      </section>
      <AmountForm withNote submitLabel="Spend" currency={currency} onSubmit={(amount, note) => addSpending(id, amount, note)} />
      <section>
        <SectionTitle>Recent spending</SectionTitle>
        <EntryList entries={newestFirst(env.entries).slice(0, 15)} empty="Nothing spent from here yet." />
      </section>
    </div>
  );
}

/** Earnings history, opened from the core. */
export function EarningsPanel() {
  const { ledger } = useFinance();
  return (
    <div>
      <SectionTitle>Money received</SectionTitle>
      <EntryList entries={newestFirst(ledger.incomeEntries).slice(0, 30)} empty="Nothing received yet." />
    </div>
  );
}

const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

/** Bills: recurring monthly obligations with a due day. Each is charged to the Bills envelope on its due day. */
export function BillsPanel() {
  const { bills, addBill, removeBill, ledger, toDisplay } = useFinance();
  const { currency } = ledger;
  const [form, setForm] = useState({ name: "", amount: "" });
  const [dueDay, setDueDay] = useState(1);
  const [billCurrency, setBillCurrency] = useState(currency); // a bill keeps its own currency, e.g. a USD subscription
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const env = ledger.envelopes.bills;
  const covered = ledger.billsTotal > 0 ? env.balance / ledger.billsTotal : null;

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim()) return setError("Give the bill a name.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount above 0.");
    setError("");
    setBusy(true);
    try {
      await addBill({ name: form.name.trim(), amount, dueDay, currency: billCurrency });
      setForm({ name: "", amount: "" });
    } catch {
      /* the error toast shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-sm">
          {formatMoney(ledger.billsTotal, currency)} <span className="text-ink-soft">due every month</span>
        </p>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          The Bills envelope holds {formatMoney(env.balance, currency)}
          {covered != null && ` (${covered.toFixed(1)} months of bills)`}. Each bill is taken from it on its due day.
        </p>
      </section>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <HexField label="Bill" value={form.name} maxLength={60} onChange={set("name")} placeholder="e.g. Claude" />
        <HexField label={`Amount (${billCurrency})`} type="number" inputMode="decimal" step="any" min="0" value={form.amount} onChange={set("amount")} />
        <div>
          <span className="hx-label">Billed in</span>
          <HexSegmented label="Bill currency" options={CURRENCIES} value={billCurrency} onChange={setBillCurrency} />
        </div>
        <HexStepper label="Due day of the month" value={dueDay} onChange={setDueDay} min={1} max={31} format={(n) => `the ${n}${ordinal(n)}`} />
        <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
          Add bill
        </HexButton>
        {error && (
          <p role="alert" className="text-center text-[11px] font-medium text-rose-deep">
            {error}
          </p>
        )}
      </form>
      <section>
        <SectionTitle>Your bills</SectionTitle>
        {bills.length === 0 ? (
          <p className="text-sm text-ink-soft">No bills yet. Add subscriptions, internet, rent or loans.</p>
        ) : (
          <ul className="space-y-2">
            {bills.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <HexDot />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="font-mono text-[11px] text-ink-soft">
                      due on the {b.dueDay}
                      {ordinal(b.dueDay)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-right font-mono text-sm">
                    {formatMoney(toDisplay(b.amount, b.currency), currency)}
                    {b.currency !== currency && <span className="block text-[10.5px] text-ink-soft">{formatMoney(b.amount, b.currency)}</span>}
                  </span>
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
const monthsUntil = (deadline, today) => (deadline ? Math.max(0, Math.round((new Date(deadline) - today) / (30.44 * 86400000))) : 0);

// Create or edit a goal. Values are shown and saved in the current display currency.
function GoalForm({ goal, onDone }) {
  const { saveGoal, toDisplay, ledger } = useFinance();
  const { currency } = ledger;
  const [today] = useState(() => new Date());
  const round = (n) => String(Math.round(n * 100) / 100);
  const [form, setForm] = useState({
    name: goal?.name ?? "",
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
      await saveGoal(payload, goal?._id);
      onDone?.();
    } catch {
      /* the error toast shows the server message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <HexField label="Goal name" value={form.name} maxLength={60} onChange={set("name")} placeholder="e.g. Motorbike" />
      <HexField label={`Price (${currency})`} type="number" inputMode="decimal" step="any" min="0" value={form.targetAmount} onChange={set("targetAmount")} />
      <HexField label={`Already saved (${currency})`} type="number" inputMode="decimal" step="any" min="0" value={form.savedAmount} onChange={set("savedAmount")} />
      <HexStepper label="Buy it within" value={months} onChange={setMonths} min={0} max={120} format={(n) => (n === 0 ? "no deadline" : `${n} month${n === 1 ? "" : "s"}`)} />
      {deadlineDate && <p className="ml-4 text-[11px] text-ink-soft">Target date: {monthYear(deadlineDate)}</p>}
      <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
        {goal ? "Save changes" : "Add goal"}
      </HexButton>
      {error && (
        <p role="alert" className="text-center text-[11px] font-medium text-rose-deep">
          {error}
        </p>
      )}
    </form>
  );
}

/** Goals: the emergency fund first, then every goal in the order it is funded. */
export function GoalsPanel() {
  const { ledger, goals, removeGoal, moveGoal } = useFinance();
  const { currency, starter } = ledger;
  const [editing, setEditing] = useState(null); // goal id being edited, "new" while adding, or null
  const doc = (id) => goals.find((g) => g._id === id);

  return (
    <div className="space-y-7">
      <p className="text-[13px] leading-relaxed text-ink-soft">Savings fill the emergency fund first, then your goals one after another in the order shown. Use the arrows to change which goal is funded first.</p>

      {starter.target > 0 && (
        <section>
          <SectionTitle>Emergency fund</SectionTitle>
          <p className="font-mono text-sm">
            {formatMoney(starter.funded, currency)} <span className="text-ink-soft">of {formatMoney(starter.target, currency)}</span>
          </p>
          <HexMeter className="mt-2" ratio={starter.target > 0 ? starter.funded / starter.target : 0} tone="good" />
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {starter.months} month{starter.months === 1 ? "" : "s"} of bills and basic living costs. Change it in Settings.
          </p>
        </section>
      )}

      <section>
        <SectionTitle>Your goals</SectionTitle>
        {ledger.goals.length === 0 && <p className="text-sm text-ink-soft">No goals yet. What are you saving for? Add the price and the plan works out how long it takes.</p>}
        <ul className="space-y-5">
          {ledger.goals.map((g, i) => (
            <li key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    <span className="mr-2 font-mono text-[11px] text-ink-soft">#{i + 1}</span>
                    {g.name}
                  </p>
                  <p className="font-mono text-[12.5px]">
                    {formatMoney(g.saved, currency)} <span className="text-ink-soft">of {formatMoney(g.target, currency)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <HexButton size="sm" variant="ghost" aria-label={`Fund ${g.name} earlier`} disabled={i === 0} onClick={() => moveGoal(g.id, -1).catch(() => {})} className="!px-2.5">
                    <IconChevronLeft className="h-4 w-4" />
                  </HexButton>
                  <HexButton size="sm" variant="ghost" aria-label={`Fund ${g.name} later`} disabled={i === ledger.goals.length - 1} onClick={() => moveGoal(g.id, 1).catch(() => {})} className="!px-2.5">
                    <IconChevronRight className="h-4 w-4" />
                  </HexButton>
                  <HexButton size="sm" variant="ghost" onClick={() => setEditing(editing === g.id ? null : g.id)}>
                    Edit
                  </HexButton>
                  <ConfirmDelete label={g.name} onConfirm={() => removeGoal(g.id).catch(() => {})} />
                </div>
              </div>
              <HexMeter className="mt-2" ratio={g.progress} tone="good" />
              <p className="mt-1.5 text-[12px] text-ink-soft">
                {g.reached ? "Reached." : g.deadline ? `By ${monthYear(g.deadline)}: needs about ${formatMoney(g.need, currency)} a month in total savings.` : "No deadline set."}
              </p>
              {editing === g.id && doc(g.id) && (
                <div className="mt-4">
                  <GoalForm goal={doc(g.id)} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <HexButton variant="ghost" size="sm" aria-expanded={editing === "new"} onClick={() => setEditing(editing === "new" ? null : "new")}>
          {editing === "new" ? "Cancel" : "Add a goal"}
        </HexButton>
        {editing === "new" && (
          <div className="mt-4">
            <GoalForm goal={null} onDone={() => setEditing(null)} />
          </div>
        )}
      </section>
    </div>
  );
}
