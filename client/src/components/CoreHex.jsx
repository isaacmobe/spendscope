import { useId } from "react";
import AmountForm from "./AmountForm";
import { HEX_PATH_CORE } from "./hexGeometry";
import { HexChip } from "./hx";
import { useCountUp } from "../hooks/useCountUp";
import { PLAN } from "../config/plan";
import { formatMoney } from "../lib/money";
import { rgb } from "../lib/tokens";

// Mini level meter: hexagon cells, filled up to the saver level.
function LevelCells({ level, max }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="hexcell h-2.5 w-2.5 transition-colors duration-500" style={{ background: i < level ? rgb("accent") : rgb("ink", 0.14), transitionDelay: `${i * 70}ms` }} />
      ))}
    </span>
  );
}

/**
 * CoreHex
 * -------
 * The centre of the console: this month's earnings and the input where you add more.
 * Around the number sits a gauge that fills as you approach the savings target, and a
 * slowly turning tick ring. Everything else on screen is recalculated from this number.
 */
export default function CoreHex({ summary, onAdd, onHistory, desktop, pos, size = 340 }) {
  const uid = useId().replace(/:/g, "");
  const shown = useCountUp(summary.income);
  const { currency, level, maxLevel, savingsRate, isCurrent } = summary;
  const hasIncome = summary.income > 0;
  // Gauge: share of the savings target reached this month (0 to 100).
  const gauge = Math.min(100, (savingsRate / PLAN.savingsTarget) * 100);

  return (
    <div className={`anim-rise ${desktop ? "absolute" : "mx-auto w-full max-w-[340px]"}`} style={desktop ? { left: pos.x, top: pos.y, width: size } : undefined}>
      <div className="relative">
        <svg viewBox="0 0 100 115.47" className="w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`core-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="svg-face-stop-top" />
              <stop offset="1" className="svg-face-stop-bot" />
            </linearGradient>
            <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="126" rx="38" ry="5" style={{ fill: rgb("shadow", 0.24), filter: "blur(4px)" }} />
          <path d={HEX_PATH_CORE} fill={`url(#core-${uid})`} />
          <path d={HEX_PATH_CORE} fill={`url(#gloss-${uid})`} />
          <path d={HEX_PATH_CORE} fill="none" className="svg-ink" strokeWidth="0.7" />
          <path d={HEX_PATH_CORE} fill="none" className="svg-ink-soft" strokeWidth="0.35" transform="translate(4.2 4.85) scale(0.916)" />

          {/* Turning tick ring and the savings gauge. */}
          <g className="anim-spin-slow" style={{ transformOrigin: "50px 57.735px" }}>
            <circle cx="50" cy="57.735" r="44.5" fill="none" style={{ stroke: rgb("ink", 0.4) }} strokeWidth="1.1" strokeDasharray="0.35 1.65" />
          </g>
          <circle cx="50" cy="57.735" r="41" fill="none" style={{ stroke: rgb("ink", 0.08) }} strokeWidth="1.4" />
          <circle
            cx="50"
            cy="57.735"
            r="41"
            fill="none"
            style={{ stroke: rgb("accent"), transition: "stroke-dasharray 1200ms cubic-bezier(0.2,0.8,0.2,1)" }}
            strokeWidth="1.4"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${gauge} ${100 - gauge}`}
            transform="rotate(-90 50 57.735)"
          />

          {/* Dark port bars on the sides, and a pulsing dot on each corner. */}
          <rect x="-1.4" y="35" width="3.4" height="45" rx="0.8" style={{ fill: rgb("ink"), opacity: 0.9 }} />
          <rect x="98" y="35" width="3.4" height="45" rx="0.8" style={{ fill: rgb("ink"), opacity: 0.9 }} />
          {[[50, 3], [96.5, 29.8], [96.5, 85.6], [50, 112.4], [3.5, 85.6], [3.5, 29.8]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.1" style={{ fill: rgb("accent"), animationDelay: `${i * 0.35}s` }} className="anim-pulse-soft" />
          ))}
        </svg>

        <div className="absolute inset-x-[15%] bottom-[22%] top-[22%] flex flex-col items-center justify-center text-center">
          <HexChip>Earnings</HexChip>
          <p className="mt-2 font-mono text-[30px] font-semibold leading-none text-accent" aria-live="polite">
            {formatMoney(shown, currency)}
          </p>
          <p className="mt-1.5 text-[11px] text-ink-soft">{hasIncome ? "earned this month" : isCurrent ? "Add your first earning to begin" : "No earnings that month"}</p>
          <div className="mt-3 w-full" data-tour="core-input">
            <AmountForm compact submitLabel="Add" onSubmit={(amount, note) => onAdd(amount, note)} currency={currency} />
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span>Saver lv {String(level).padStart(2, "0")}</span>
            <LevelCells level={level} max={maxLevel} />
          </div>
          {hasIncome && (
            <button type="button" onClick={onHistory} className="mt-1 text-[11px] font-medium text-accent underline-offset-2 hover:underline">
              View entries ({summary.incomeEntries.length})
            </button>
          )}
        </div>
        <p className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.35em] text-ink/35">Core</p>
      </div>
    </div>
  );
}
