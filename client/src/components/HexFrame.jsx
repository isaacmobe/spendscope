import { useId } from "react";
import { rgb } from "../lib/tokens";
import { HEX_STROKE, hexHeight, hexPathPx } from "./hexGeometry";

// Liquid colours by state: healthy, close to the limit, over budget, goal progress.
const TONES = { ok: rgb("accent"), warn: rgb("ember"), over: rgb("rose"), good: rgb("good"), muted: rgb("ink", 0.25) };

/**
 * HexFrame
 * --------
 * The one hexagon every cell in the console is drawn with, so they all match the core: the same
 * pixel stroke widths, the same double outline, the same soft ground shadow and gloss. Optional:
 * a rising liquid level, dark port bars on the sides, corner dots, a "selected" glass state and a
 * ring that pulses when its value changes. Children are laid over it as normal HTML (text, icons).
 * Put it inside an element with the Tailwind class `group` to get the hover/focus "selected" look.
 */
export default function HexFrame({
  size,
  radius = 10,
  tone = "ok",
  level = 0,
  locked = false,
  selected = false,
  portSide = null, // "left" | "right" | "both" | null
  dots = false,
  pingKey,
  className = "",
  children
}) {
  const uid = useId().replace(/:/g, "");
  const h = hexHeight(size);
  const k = size / 100; // unit scale for the (fill-only) wave paths
  const color = TONES[locked ? "muted" : tone];
  const lvl = locked ? 0 : Math.max(0, Math.min(1, level));
  const outer = hexPathPx(size, radius);
  const inner = hexPathPx(size, radius, (size / 2 - HEX_STROKE.inset) / (size / 2));
  const active = selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";
  const barH = h * 0.4;
  const barY = (h - barH) / 2;
  const barW = Math.max(5, size * 0.022);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: h }}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} className="absolute inset-0 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`face-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="svg-face-stop-top" />
            <stop offset="1" className="svg-face-stop-bot" />
          </linearGradient>
          <linearGradient id={`act-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" style={{ stopColor: rgb("sel-top") }} />
            <stop offset="1" style={{ stopColor: rgb("sel-bot") }} />
          </linearGradient>
          <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${uid}`}>
            <path d={outer} />
          </clipPath>
        </defs>

        {/* Ground shadow */}
        <ellipse cx={size / 2} cy={h + 9} rx={size * 0.32} ry={Math.max(4, size * 0.03)} style={{ fill: rgb("shadow", 0.22), filter: "blur(3px)" }} />

        <path d={outer} fill={`url(#face-${uid})`} />

        {/* Liquid level with a moving wave on top */}
        {!locked && lvl > 0 && (
          <g clipPath={`url(#clip-${uid})`}>
            <g style={{ transform: `translateY(${(1 - lvl) * h}px)`, transition: "transform 1100ms cubic-bezier(0.2,0.8,0.2,1)" }}>
              <g transform={`scale(${k})`}>
                <path className="anim-wave" d="M-50 4 Q-37.5 -1.5 -25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 V160 H-50 Z" style={{ fill: color, opacity: 0.34 }} />
                <path className="anim-wave" style={{ fill: color, opacity: 0.2, animationDuration: "7s", animationDirection: "reverse" }} d="M-50 6 Q-37.5 1 -25 6 T0 6 T25 6 T50 6 T75 6 T100 6 T125 6 T150 6 V160 H-50 Z" />
              </g>
            </g>
          </g>
        )}

        <path d={outer} fill={`url(#gloss-${uid})`} />
        {/* Selected state: solid indigo glass */}
        <path d={outer} fill={`url(#act-${uid})`} className={`transition-opacity duration-500 ${active}`} />
        <path d={outer} fill={`url(#gloss-${uid})`} className={`transition-opacity duration-500 ${active}`} />

        {/* The same two outlines on every hexagon */}
        <path d={outer} fill="none" className="svg-ink" strokeWidth={HEX_STROKE.outer} strokeLinejoin="round" />
        <path d={inner} fill="none" className="svg-ink-soft" strokeWidth={HEX_STROKE.inner} strokeLinejoin="round" />

        {pingKey != null && !locked && <path key={pingKey} d={outer} fill="none" strokeWidth="1.5" className="anim-ping" style={{ stroke: color, transformOrigin: `${size / 2}px ${h / 2}px` }} />}

        {(portSide === "left" || portSide === "both") && <rect x={-barW / 2} y={barY} width={barW} height={barH} rx={barW / 3} style={{ fill: rgb("ink"), opacity: locked ? 0.25 : 0.85 }} />}
        {(portSide === "right" || portSide === "both") && <rect x={size - barW / 2} y={barY} width={barW} height={barH} rx={barW / 3} style={{ fill: rgb("ink"), opacity: locked ? 0.25 : 0.85 }} />}

        {dots &&
          [[0.5, 0.025], [0.965, 0.26], [0.965, 0.74], [0.5, 0.975], [0.035, 0.74], [0.035, 0.26]].map(([fx, fy], i) => (
            <circle key={i} cx={size * fx} cy={h * fy} r="2.4" className="anim-pulse-soft" style={{ fill: rgb("accent"), animationDelay: `${i * 0.35}s` }} />
          ))}

        {locked && (
          <>
            <line x1={size * 0.2} y1={h * 0.34} x2={size * 0.8} y2={h * 0.66} className="svg-ink-soft" strokeWidth="1" />
            <line x1={size * 0.8} y1={h * 0.34} x2={size * 0.2} y2={h * 0.66} className="svg-ink-soft" strokeWidth="1" />
          </>
        )}
      </svg>
      {children}
    </div>
  );
}
