import { formatMoney } from "../lib/money";

// One of the three plan cards: what this month's earnings allot, and how much is used.
function PlanCard({ label, percent, pool, used, currency, kind }) {
  const ratio = pool > 0 ? used / pool : 0;
  const bar = kind === "savings" ? "bg-accent" : ratio > 1 ? "bg-salmon" : ratio > 0.85 ? "bg-ember" : "bg-accent";
  return (
    <div className="border border-ink/70 bg-paper-light p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</h3>
        <span className="font-mono text-xs text-ink-soft">{percent}%</span>
      </div>
      <p className="mt-2 font-mono text-lg font-semibold">{formatMoney(pool, currency)}</p>
      <div className="mt-2 h-1.5 w-full bg-line/60">
        <div className={`h-full ${bar} transition-all duration-700`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">
        {kind === "savings" ? "Saved" : "Used"} {formatMoney(used, currency)}
      </p>
    </div>
  );
}

/**
 * PlanPanel
 * ---------
 * The "how to distribute your earnings" part: the needs / wants / savings split of this
 * month's income, a status bar with the motorbike projection, and plain-language advice.
 */
export default function PlanPanel({ summary, allocation, onOpenGoal }) {
  const { currency, pools, groupSpent, goal, insights, leftover, income } = summary;

  // Status bar text and colour (salmon when behind, indigo when fine, ink when waiting for input).
  let status = "Set your motorbike goal to see your ETA";
  let style = "bg-ink text-paper-light";
  if (goal) {
    if (goal.reached) {
      status = `Goal reached: you can buy your ${goal.name}`;
      style = "bg-accent text-white";
    } else if (goal.monthsToGo == null) {
      status = "Add earnings and a savings share to project your ETA";
      style = "bg-salmon text-ink";
    } else if (goal.onTrack === false) {
      status = `Behind pace: needs ${formatMoney(goal.required, currency)} a month, plan saves ${formatMoney(pools.savings, currency)}`;
      style = "bg-salmon text-ink";
    } else {
      status = `${goal.name} ETA ${goal.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })} (${goal.monthsToGo} month${goal.monthsToGo === 1 ? "" : "s"})`;
      style = "bg-accent text-white";
    }
  }

  return (
    <section aria-label="Plan" className="mx-auto mt-6 max-w-4xl animate-rise-in px-4 pb-16" style={{ animationDelay: "500ms" }}>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <h2 className="bg-ink px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-paper-light">This month's plan</h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PlanCard label="Needs" percent={allocation.needs} pool={pools.needs} used={groupSpent.needs} currency={currency} kind="needs" />
        <PlanCard label="Wants" percent={allocation.wants} pool={pools.wants} used={groupSpent.wants} currency={currency} kind="wants" />
        <PlanCard label="Savings" percent={allocation.savings} pool={pools.savings} used={groupSpent.savings} currency={currency} kind="savings" />
      </div>

      <button type="button" onClick={onOpenGoal} className={`mt-3 flex w-full items-center justify-center gap-3 px-4 py-3 text-sm font-semibold transition hover:brightness-95 ${style}`}>
        {status}
      </button>

      {income > 0 && (
        <p className="mt-3 text-center font-mono text-xs text-ink-soft">
          Left after spending and saving: <span className={leftover < 0 ? "text-salmon-dark" : "text-ink"}>{formatMoney(leftover, currency)}</span>
        </p>
      )}

      {insights.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-l-2 border-accent pl-4 text-sm">
          {insights.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
