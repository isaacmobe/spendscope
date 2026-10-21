import AmountForm from "./AmountForm";
import HexFrame from "./HexFrame";
import { HexButton, HexChip } from "./hx";
import { hexHeight } from "./hexGeometry";
import { useCountUp } from "../hooks/useCountUp";
import { formatMoney } from "../lib/money";
import { rgb } from "../lib/tokens";

/**
 * CoreHex
 * -------
 * The centre of the console, and the start of the flow. It always shows the next step:
 *   1. Receive: nothing has been entered yet, so it asks what you just received.
 *   2. Plan: money is waiting to be assigned, so it shows how much and offers the plan.
 *   3. Spend: everything has a job, so it shows what you can spend per day.
 * The ring around the number fills as the money received gets planned. It is drawn with the same
 * HexFrame as the envelope hexagons, so the outlines match.
 */
export default function CoreHex({ ledger, onAdd, onPlan, onEntries, size = 320, center, absolute = true }) {
  const { currency, toAssign, incomeTotal, allocatedTotal, spendingMoney, daysLeft } = ledger;
  const h = hexHeight(size);
  const over = toAssign < -0.5;
  const waiting = toAssign > 0.5;
  const step = incomeTotal <= 0 ? 1 : waiting || over ? 2 : 3;
  const perDay = spendingMoney / (daysLeft + 1);
  const headline = useCountUp(step === 3 ? perDay : Math.abs(toAssign));
  const planned = incomeTotal > 0 ? Math.min(100, (allocatedTotal / incomeTotal) * 100) : 0;
  const r1 = size * 0.41;
  const r2 = size * 0.445;
  const style = absolute && center ? { left: center.x - size / 2, top: center.y - h / 2, width: size, height: h } : { width: size, height: h };

  return (
    <div className={`anim-rise ${absolute ? "absolute" : "relative mx-auto"}`} style={style}>
      <HexFrame size={size} radius={16} portSide="both" dots tone={over ? "over" : "ok"}>
        <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} className="pointer-events-none absolute inset-0" aria-hidden="true">
          <g className="anim-spin-slow" style={{ transformOrigin: `${size / 2}px ${h / 2}px` }}>
            <circle cx={size / 2} cy={h / 2} r={r2} fill="none" style={{ stroke: rgb("ink", 0.4) }} strokeWidth="2" strokeDasharray="1 5" />
          </g>
          <circle cx={size / 2} cy={h / 2} r={r1} fill="none" style={{ stroke: rgb("ink", 0.1) }} strokeWidth="4" />
          <circle
            cx={size / 2}
            cy={h / 2}
            r={r1}
            fill="none"
            style={{ stroke: over ? rgb("rose-deep") : rgb("accent"), transition: "stroke-dasharray 1200ms cubic-bezier(0.2,0.8,0.2,1)" }}
            strokeWidth="4"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${planned} ${100 - planned}`}
            transform={`rotate(-90 ${size / 2} ${h / 2})`}
          />
        </svg>

        <div className="absolute inset-x-[15%] bottom-[20%] top-[20%] flex flex-col items-center justify-center text-center text-ink">
          <HexChip>{step === 1 ? "Step 1 · Receive" : step === 2 ? "Step 2 · Plan" : "All planned"}</HexChip>

          {step === 1 ? (
            <p className="mt-2.5 text-[15px] font-semibold leading-tight">What did you just receive?</p>
          ) : (
            <>
              <p className={`mt-2 font-mono text-[28px] font-semibold leading-none ${over ? "text-rose-deep" : "text-accent"}`} aria-live="polite">
                {formatMoney(headline, currency)}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">{over ? "planned beyond what you received" : step === 2 ? "waiting to be assigned" : "to spend each day"}</p>
            </>
          )}

          {step === 2 && (
            <HexButton variant="accent" size="sm" className="mt-2.5" onClick={onPlan} data-tour="plan-button">
              {over ? "Review plan" : "Plan this money"}
            </HexButton>
          )}

          <div className="mt-2.5 w-full" data-tour="core-input">
            <AmountForm compact submitLabel="Add" onSubmit={(amount, note) => onAdd(amount, note)} currency={currency} />
          </div>

          {incomeTotal > 0 && (
            <button type="button" onClick={onEntries} className="mt-1.5 text-[12px] font-medium text-accent underline-offset-2 hover:underline">
              View earnings ({ledger.incomeEntries.length})
            </button>
          )}
        </div>
      </HexFrame>
    </div>
  );
}
