import { HEX_POINTS } from "./Hex";
import AmountForm from "./AmountForm";
import { useCountUp } from "../hooks/useCountUp";
import { formatMoney } from "../lib/money";

/**
 * CoreHex
 * -------
 * The centre of the console: this month's earnings, and the input where you add more.
 * Everything else on screen (budgets, plan, motorbike ETA) is recalculated from this number.
 */
export default function CoreHex({ summary, onAdd, onHistory, desktop, pos, size = 300 }) {
  const shown = useCountUp(summary.income);
  const { currency } = summary;
  const hasIncome = summary.income > 0;

  return (
    <div
      className={`animate-rise-in ${desktop ? "absolute" : "mx-auto w-full max-w-[320px]"}`}
      style={desktop ? { left: pos.x, top: pos.y, width: size } : undefined}
    >
      <div className="relative">
        <svg viewBox="0 0 100 115.47" className="w-full drop-shadow-[0_12px_24px_rgba(30,33,48,0.12)]" aria-hidden="true">
          <polygon points={HEX_POINTS} fill="#F7F6F2" />
          <polygon points={HEX_POINTS} fill="none" stroke="#1E2130" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points={HEX_POINTS} fill="none" stroke="#1E2130" strokeOpacity="0.3" strokeWidth="0.5" transform="translate(5 5.77) scale(0.9)" />
          {/* Accent corner marks, like the reference's connector ports. */}
          <polygon points="0,28.87 0,86.6 3.5,84.6 3.5,30.87" fill="#1E2130" />
          <polygon points="100,28.87 100,86.6 96.5,84.6 96.5,30.87" fill="#1E2130" />
        </svg>

        <div className="absolute inset-x-[12%] top-[24%] bottom-[24%] flex flex-col items-center justify-center text-center">
          <span className="bg-ink px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-paper-light">Earnings</span>
          <p className="mt-2 font-mono text-[28px] font-semibold leading-none text-accent" aria-live="polite">
            {formatMoney(shown, currency)}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {hasIncome ? "earned this month" : "Add your first earning to begin"}
          </p>
          <div className="mt-3 w-full">
            <AmountForm compact submitLabel="Add" onSubmit={(amount, note) => onAdd(amount, note)} currency={currency} />
          </div>
          {hasIncome && (
            <button type="button" onClick={onHistory} className="mt-1.5 text-[11px] font-medium text-accent underline-offset-2 hover:underline">
              View entries ({summary.incomeEntries.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
