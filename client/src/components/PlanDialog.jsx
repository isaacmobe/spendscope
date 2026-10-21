import { useMemo, useState } from "react";
import Modal from "./Modal";
import { HexButton, HexField, HexMeter } from "./hx";
import { useFinance } from "../context/finance";
import { checkPlan, suggestPlan } from "../lib/ledger";
import { formatMoney } from "../lib/money";

const monthYear = (d) => d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}

/**
 * PlanEditor
 * ----------
 * Step 2 of the flow. Left: where this money goes, one editable amount per envelope, starting from
 * the suggested split. "Left to assign" must reach zero before you can confirm. Right: what the split
 * means, recalculated on every keystroke (when each goal is reached, whether deadlines are met, how
 * long the emergency fund takes, how far bills and spending money stretch), so you can reconsider.
 */
function PlanEditor({ onClose }) {
  const { ledger, confirmPlan } = useFinance();
  const { currency } = ledger;
  const amount = ledger.toAssign;
  const suggestion = useMemo(() => suggestPlan(ledger, amount), [ledger, amount]);
  const suggested = useMemo(() => Object.fromEntries(suggestion.lines.map((l) => [l.id, l.amount])), [suggestion]);
  const [values, setValues] = useState(() => Object.fromEntries(suggestion.lines.map((l) => [l.id, String(l.amount)])));
  const [busy, setBusy] = useState(false);
  const money = (n) => formatMoney(n, currency);

  const numeric = useMemo(() => Object.fromEntries(suggestion.lines.map((l) => [l.id, Math.max(0, Number(values[l.id]) || 0)])), [suggestion, values]);
  const check = useMemo(() => checkPlan(ledger, numeric, amount), [ledger, numeric, amount]);
  const base = useMemo(() => checkPlan(ledger, suggested, amount), [ledger, suggested, amount]);
  const invalid = suggestion.lines.some((l) => Number(values[l.id]) < 0 || Number.isNaN(Number(values[l.id])));
  const ready = !invalid && Math.abs(check.left) <= 0.5 && check.sum > 0;
  const changed = suggestion.lines.some((l) => Math.abs(numeric[l.id] - l.amount) > 0.5);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmPlan(suggestion.lines.map((l) => ({ id: l.id, amount: numeric[l.id] })).filter((l) => l.amount > 0));
      onClose();
    } catch {
      setBusy(false); // the error toast shows the reason
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Left: the plan */}
      <div className="min-w-0">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          You have <span className="font-mono font-semibold text-ink">{money(amount)}</span> to assign. This split is suggested from your bills, your goals and your minimum savings. Change any amount.
        </p>

        <ul className="mt-4 space-y-3.5" data-tour="plan-lines">
          {suggestion.lines.map((l) => (
            <li key={l.id} className="grid grid-cols-[1fr_8.5rem] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold">{l.label}</p>
                <p className="text-[11.5px] leading-snug text-ink-soft">{l.reason}</p>
              </div>
              <HexField
                size="sm"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={values[l.id]}
                onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))}
                aria-label={`${l.label} amount in ${currency}`}
              />
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-ink/15 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Left to assign</span>
          <span className={`font-mono text-lg font-semibold ${Math.abs(check.left) <= 0.5 ? "text-accent" : "text-rose-deep"}`} aria-live="polite">
            {money(check.left)}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <HexButton variant="accent" size="lg" disabled={!ready || busy} onClick={confirm} data-tour="plan-confirm">
            {busy ? "Saving..." : "Confirm plan"}
          </HexButton>
          <HexButton variant="ghost" disabled={!changed} onClick={() => setValues(Object.fromEntries(suggestion.lines.map((l) => [l.id, String(l.amount)])))}>
            Reset to suggestion
          </HexButton>
        </div>
      </div>

      {/* Right: what it means */}
      <div className="min-w-0 space-y-5" data-tour="plan-check" aria-live="polite">
        <Section title="Saving">
          <p className="font-mono text-[15px] font-semibold">
            {money(check.saveTotal)} <span className="text-[12px] font-normal text-ink-soft">{Math.round(check.rate * 100)}% of this money (minimum {Math.round(ledger.baseRate * 100)}%)</span>
          </p>
          <HexMeter className="mt-1.5" ratio={Math.min(1, check.rate / Math.max(ledger.baseRate * 2, 0.01))} tone={check.belowMin ? "warn" : "good"} cells={16} />
        </Section>

        {check.goals.map((g) => {
          const baseGoal = base.goals.find((x) => x.id === g.id);
          return (
            <Section key={g.id} title={g.name}>
              {g.reached ? (
                <p className="text-sm">Reached. Time to buy it.</p>
              ) : g.eta == null ? (
                <p className="text-sm text-rose-deep">Not reachable at this pace. Give it a share of the savings.</p>
              ) : (
                <p className="text-sm">
                  <span className="font-mono font-semibold">{monthYear(g.eta)}</span> <span className="text-ink-soft">in {plural(g.months, "month")} if you keep this pace</span>
                </p>
              )}
              {g.onTrack === true && g.deadline && <p className="mt-1 text-[12px] text-accent">On track for your {monthYear(g.deadline)} deadline.</p>}
              {g.onTrack === false && (
                <p className="mt-1 text-[12px] text-rose-deep">
                  Misses your {monthYear(g.deadline)} deadline. It needs about {money(g.needed)} a month in total savings; this pace is {money(check.pace)}.
                </p>
              )}
              {g.soonerBy && <p className="mt-1 text-[12px] text-ink-soft">Saving 5% more of your income ({money(Math.max(ledger.incomeBasis, amount) * 0.05)} a month) brings it {plural(g.soonerBy, "month")} closer.</p>}
              {changed && baseGoal && baseGoal.months != null && g.months != null && baseGoal.months !== g.months && (
                <p className="mt-1 text-[12px] text-ink-soft">
                  The suggested plan reaches it in {plural(baseGoal.months, "month")} ({g.months > baseGoal.months ? `${g.months - baseGoal.months} later with your changes` : `${baseGoal.months - g.months} sooner with your changes`}).
                </p>
              )}
            </Section>
          );
        })}
        {check.goals.length === 0 && (
          <Section title="Goals">
            <p className="text-sm text-ink-soft">You have no goals yet. Add one from the Goals hexagon and this plan will show when you can buy it.</p>
          </Section>
        )}

        {check.starter.target > 0 && (
          <Section title="Emergency fund">
            <p className="font-mono text-sm">
              {money(check.starter.funded)} <span className="text-ink-soft">of {money(check.starter.target)}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">{check.starter.monthsToFull === 0 ? "Full." : check.starter.monthsToFull == null ? "Not growing yet." : `Full in about ${plural(check.starter.monthsToFull, "month")}.`}</p>
          </Section>
        )}

        <Section title="Bills and spending">
          <ul className="space-y-1 text-[13px]">
            {check.billsMonths != null && <li>Bills are covered for {check.billsMonths.toFixed(1)} months.</li>}
            <li>
              About <span className="font-mono font-semibold">{money(check.perDay)}</span> a day to spend for the rest of this month.
            </li>
          </ul>
        </Section>

        {check.warnings.length > 0 && (
          <ul className="space-y-1.5">
            {check.warnings.map((w) => (
              <li key={w.text} className="text-[12.5px] leading-snug text-rose-deep">
                {w.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The plan popup (a wide Modal). Its content is rebuilt each time it opens, so it always starts from the suggestion. */
export default function PlanDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} extraWide title="Plan this money" subtitle="Step 2: give every shilling a job, then confirm">
      <PlanEditor onClose={onClose} />
    </Modal>
  );
}
