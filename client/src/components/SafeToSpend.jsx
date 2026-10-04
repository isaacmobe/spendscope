import { useCountUp } from "../hooks/useCountUp";
import { HexSlab } from "./hx";

// One small fact in the card: label above, value below, so every row lines up.
function Fact({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-[13px]">{value}</p>
    </div>
  );
}

/**
 * SafeToSpend
 * -----------
 * The number most budgeting apps put first: how much you can spend today without breaking the month.
 * It is the unspent living budget (needs + wants) divided by the days left, today included.
 * For a past month it becomes a closing summary instead.
 */
export default function SafeToSpend({ summary, money, bare = false }) {
  const { safeToSpend, isCurrent, totalSpent, livingPool, groupSpent, income, savingsRate, trend } = summary;
  const perDay = safeToSpend ? safeToSpend.perDay : 0;
  const shown = useCountUp(Math.round(perDay));
  const over = safeToSpend && safeToSpend.remaining < 0;
  const Wrap = bare ? "div" : HexSlab; // inside a popup it is drawn bare
  const avg = trend.today > 0 ? totalSpent / trend.today : 0;

  return (
    <Wrap data-tour="safe" className="h-full">
      <div className={`flex h-full flex-col items-center justify-center text-center ${bare ? "" : "px-12 py-6"}`}>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-soft">{isCurrent ? "Safe to spend today" : "Month summary"}</h3>

        {isCurrent ? (
          income <= 0 ? (
            <p className="py-8 text-sm text-ink-soft">Add this month's earnings and your daily allowance appears here.</p>
          ) : (
            <>
              <p className={`mt-3 font-mono text-[34px] font-semibold leading-none ${over ? "text-rose-deep" : "text-accent"}`} aria-live="polite">
                {over ? "-" : ""}
                {money(Math.abs(shown))}
              </p>
              <p className="mt-2 max-w-[230px] text-[12px] leading-snug text-ink-soft">
                {over
                  ? `You are ${money(Math.abs(safeToSpend.remaining))} over the living budget. Pause non-essential spending.`
                  : `${money(safeToSpend.remaining)} left in your living budget for ${safeToSpend.days} day${safeToSpend.days === 1 ? "" : "s"}, today included.`}
              </p>
              <div className="mt-5 grid w-full max-w-[300px] grid-cols-3 gap-3">
                <Fact label="Spent" value={money(totalSpent)} />
                <Fact label="Budget" value={money(livingPool)} />
                <Fact label="Daily avg" value={money(avg)} />
              </div>
            </>
          )
        ) : (
          <>
            <p className="mt-3 font-mono text-[26px] font-semibold leading-none text-accent">{Math.round(savingsRate * 100)}%</p>
            <p className="mt-2 text-[12px] text-ink-soft">of earnings saved</p>
            <div className="mt-5 grid w-full max-w-[300px] grid-cols-3 gap-3">
              <Fact label="Earned" value={money(income)} />
              <Fact label="Spent" value={money(totalSpent)} />
              <Fact label="Saved" value={money(groupSpent.savings)} />
            </div>
          </>
        )}
      </div>
    </Wrap>
  );
}
