import { HEX_POINTS, HEX_RATIO, Padlock } from "./Hex";

// Fill colours by state: healthy, close to the limit, over budget.
const TONES = { ok: "#5558C8", warn: "#E2793F", over: "#E88B84", muted: "#C9C8C2" };

/**
 * HexNode
 * -------
 * One spending area. The hexagon fills from the bottom as the area's spending (or the
 * goal's progress) rises; the colour shifts from indigo to orange to salmon as it nears
 * and passes its budget. A text label sits beside it, like the reference console.
 * Locked nodes show a padlock until earnings exist, so the flow starts at the core.
 */
export default function HexNode({ index, name, side, locked, fill, tone, detail, highlight, onOpen, desktop, pos, size = 150, delay = 0 }) {
  const level = locked ? 0 : Math.max(0, Math.min(1, fill));
  const number = String(index + 1).padStart(2, "0");
  const color = TONES[locked ? "muted" : tone];

  const wrapperStyle = desktop
    ? { left: pos.x, top: pos.y, width: size, animationDelay: `${delay}ms` }
    : { animationDelay: `${delay}ms` };

  return (
    <div className={`animate-rise-in ${desktop ? "absolute" : "mx-auto w-full max-w-[150px]"}`} style={wrapperStyle}>
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        aria-label={locked ? `${name} (locked until you record earnings)` : `${name}: open`}
        className={`group relative block w-full outline-none transition-transform duration-300 ${locked ? "cursor-not-allowed" : "hover:scale-105 focus-visible:scale-105"}`}
      >
        <svg viewBox="0 0 100 115.47" className={`w-full ${locked ? "" : "animate-breathe"}`} aria-hidden="true">
          <defs>
            <clipPath id={`clip-${index}`}>
              <polygon points={HEX_POINTS} />
            </clipPath>
          </defs>
          <polygon points={HEX_POINTS} fill="#F7F6F2" />
          {/* Fill level: a full-size rectangle slid up from the bottom by CSS transform. */}
          <g clipPath={`url(#clip-${index})`}>
            <rect
              x="0"
              y="0"
              width="100"
              height="115.47"
              fill={color}
              opacity={locked ? 0.25 : 0.3}
              style={{ transform: `translateY(${(1 - level) * 100 * HEX_RATIO}px)`, transition: "transform 900ms cubic-bezier(0.2,0.8,0.2,1), fill 400ms" }}
            />
          </g>
          <polygon points={HEX_POINTS} fill="none" strokeWidth="1.6" strokeLinejoin="round" className="stroke-ink transition-all group-focus-visible:stroke-accent group-focus-visible:[stroke-width:3.5]" />
          <polygon points={HEX_POINTS} fill="none" stroke="#1E2130" strokeOpacity="0.25" strokeWidth="0.8" transform="translate(7 8) scale(0.86)" />
          {locked && (
            <>
              <line x1="22" y1="40" x2="78" y2="76" stroke="#1E2130" strokeOpacity="0.15" />
              <line x1="78" y1="40" x2="22" y2="76" stroke="#1E2130" strokeOpacity="0.15" />
            </>
          )}
        </svg>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-ink">
          {locked ? (
            <Padlock className="h-7 w-7 text-ink/70" />
          ) : (
            <>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">Area</span>
              <span className="font-mono text-3xl font-semibold leading-none">{number}</span>
              <span className="mt-1 font-mono text-[11px] text-ink-soft">{Math.round(fill * 100)}%</span>
            </>
          )}
        </span>
      </button>

      {/* Label: outside the hexagon on desktop (toward the screen edge), under it on mobile. */}
      <div
        className={
          desktop
            ? `absolute top-[34px] w-[230px] ${side === "left" ? "right-[calc(100%+14px)] text-right" : "left-[calc(100%+14px)] text-left"}`
            : "mt-2 text-center"
        }
      >
        <p className="text-base font-semibold leading-tight">
          {side === "right" && desktop && <span className="mr-1.5 font-mono text-[11px] text-ink-soft">{number}</span>}
          {name}
          {(side === "left" || !desktop) && <span className="ml-1.5 font-mono text-[11px] text-ink-soft">{number}</span>}
        </p>
        <div className={`my-1 h-px bg-accent/80 ${desktop ? "w-full" : "mx-auto w-16"}`} />
        <p className="text-[13px] leading-snug text-ink-soft">
          {detail}
          {highlight && <span className="font-semibold text-ember"> {highlight}</span>}
        </p>
      </div>
    </div>
  );
}
