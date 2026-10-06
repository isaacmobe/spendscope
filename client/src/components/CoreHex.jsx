import AmountForm from "./AmountForm";
import HexFrame from "./HexFrame";
import { HexButton, HexChip, HexMeter } from "./hx";
import { useCountUp } from "../hooks/useCountUp";
import { PLAN } from "../config/plan";
import { formatMoney } from "../lib/money";
import { rgb } from "../lib/tokens";
import { hexHeight } from "./hexGeometry";

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

// Colour of the big preview number by tone.
const VALUE_TONE = { ok: "text-accent", warn: "text-ember", over: "text-rose-deep", good: "text-good", muted: "text-ink-soft" };

// The centre while an outer hexagon is previewed: its name, number, a short explanation and the buttons.
function Preview({ preview, pinned, onOpen, onBack, onCommand, currency }) {
  return (
    <div key={preview.id} className="anim-preview absolute inset-x-[15%] bottom-[19%] top-[19%] flex flex-col items-center justify-center text-center text-ink" aria-live="polite">
      <HexChip>{preview.kicker}</HexChip>
      <p className="mt-2 text-[16px] font-semibold leading-tight">{preview.title}</p>
      <p className={`mt-1 font-mono text-[26px] font-semibold leading-none ${VALUE_TONE[preview.tone] || VALUE_TONE.ok}`}>{preview.value}</p>
      <p className="mt-1 text-[12px] text-ink-soft">{preview.caption}</p>
      {preview.meter && <HexMeter ratio={preview.level} tone={preview.tone === "muted" ? "ok" : preview.tone} cells={12} className="mt-2 w-full justify-center" />}
      {preview.command ? (
        // The command line: type an amount for this area and press Add, right in the centre.
        <div className="mt-2.5 w-full" data-tour="core-command">
          <AmountForm key={String(pinned)} compact submitLabel="Add" currency={currency} autoFocus={pinned} onSubmit={(amount) => onCommand(preview.id, amount)} />
        </div>
      ) : (
        <p className="mt-2 text-[12px] leading-snug text-ink-soft">{preview.text}</p>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <HexButton size="sm" variant="accent" onClick={onOpen}>
          {preview.action}
        </HexButton>
        {pinned && (
          <HexButton size="sm" variant="ghost" onClick={onBack}>
            Back
          </HexButton>
        )}
      </div>
    </div>
  );
}

/**
 * CoreHex
 * -------
 * The centre of the console: this month's earnings and the input where you add more. It is drawn
 * with the same HexFrame as every other hexagon, so its outline matches theirs exactly. Around the
 * number sit a gauge that fills as you approach the savings target and a slowly turning tick ring.
 */
export default function CoreHex({ summary, onAdd, onHistory, size = 320, center, absolute = true, preview = null, pinned = false, onOpenPreview, onBack, onPointerEnter, onPointerLeave, onCommand, onEngage }) {
  const shown = useCountUp(summary.income);
  const { currency, level, maxLevel, savingsRate, isCurrent } = summary;
  const hasIncome = summary.income > 0;
  const h = hexHeight(size);
  const gauge = Math.min(100, (savingsRate / PLAN.savingsTarget) * 100);
  const r1 = size * 0.41; // gauge radius
  const r2 = size * 0.445; // tick ring radius

  const style = absolute && center ? { left: center.x - size / 2, top: center.y - h / 2, width: size, height: h } : { width: size, height: h };

  return (
    <div className={`anim-rise ${absolute ? "absolute" : "relative mx-auto"}`} style={style} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onFocusCapture={preview ? onEngage : undefined}>
      <HexFrame size={size} radius={16} portSide="both" dots tone="ok">
        {/* Turning tick ring and the savings gauge, in px so they stay crisp at any size */}
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
            style={{ stroke: rgb("accent"), transition: "stroke-dasharray 1200ms cubic-bezier(0.2,0.8,0.2,1)" }}
            strokeWidth="4"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${gauge} ${100 - gauge}`}
            transform={`rotate(-90 ${size / 2} ${h / 2})`}
          />
        </svg>

        {preview && <Preview key={preview.id} preview={preview} pinned={pinned} onOpen={onOpenPreview} onBack={onBack} onCommand={onCommand} currency={currency} />}

        <div className={`absolute inset-x-[15%] bottom-[22%] top-[22%] flex flex-col items-center justify-center text-center text-ink ${preview ? "pointer-events-none invisible" : "anim-preview"}`} aria-hidden={Boolean(preview)}>
          <HexChip>Earnings</HexChip>
          <p className="mt-2 font-mono text-[30px] font-semibold leading-none text-accent" aria-live="polite">
            {formatMoney(shown, currency)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">{hasIncome ? "earned this month" : isCurrent ? "Add your first earning to begin" : "No earnings that month"}</p>
          <div className="mt-3 w-full" data-tour="core-input">
            <AmountForm compact submitLabel="Add" onSubmit={(amount, note) => onAdd(amount, note)} currency={currency} />
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            <span>Saver lv {String(level).padStart(2, "0")}</span>
            <LevelCells level={level} max={maxLevel} />
          </div>
          {hasIncome && (
            <button type="button" onClick={onHistory} className="mt-1 text-[12px] font-medium text-accent underline-offset-2 hover:underline">
              View entries ({summary.incomeEntries.length})
            </button>
          )}
        </div>
      </HexFrame>
    </div>
  );
}
