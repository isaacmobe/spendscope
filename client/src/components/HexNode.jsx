import { useId, useRef } from "react";
import { rgb } from "../lib/tokens";
import { HEX_PATH } from "./hexGeometry";
import { IconLock } from "./icons";

// Fill colours by state: healthy, close to the limit, over budget, goal progress.
const TONES = { ok: rgb("accent"), warn: rgb("ember"), over: rgb("rose"), good: rgb("good"), muted: rgb("ink", 0.25) };

/**
 * HexNode
 * -------
 * One spending area, drawn like the reference console: a thin double-outlined hexagon with a
 * dark port bar facing the core and vertical micro text. A liquid level rises inside it as the
 * area's spending (or the goal's progress) grows, and the colour shifts from indigo to orange
 * to rose as it nears and passes its budget. Hover, focus or an open popup turns it into the
 * solid indigo "selected" state of the reference. Locked nodes show a padlock until earnings exist.
 *
 * Symmetry: mirrored nodes (same `pair`) share the same float timing, so the left and right
 * columns always move together. The hover tilt is applied to an inner layer only.
 */
export default function HexNode({ index, pair, name, side, locked, fill, tone, detail, highlight, selected, onOpen, desktop, pos, size = 156, delay = 0, tourId }) {
  const uid = useId().replace(/:/g, "");
  const tilt = useRef(null);
  const level = locked ? 0 : Math.max(0, Math.min(1, fill));
  const number = String(index + 1).padStart(2, "0");
  const color = TONES[locked ? "muted" : tone];
  const active = selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";
  const textActive = selected ? "text-white" : "group-hover:text-white group-focus-visible:text-white";

  const wrapperStyle = desktop ? { left: pos.x, top: pos.y, width: size, animationDelay: `${delay}ms` } : { animationDelay: `${delay}ms` };
  // Core-facing side gets the port bar and micro text.
  const inner = side === "left" ? "right" : "left";

  // Tilt toward the pointer (up to 9 degrees). Written straight to the DOM, so no re-render per move.
  const onMove = (e) => {
    if (locked || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.transform = `perspective(520px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (tilt.current) tilt.current.style.transform = "";
  };

  return (
    <div className={`anim-rise ${desktop ? "absolute" : "mx-auto w-full max-w-[160px]"}`} style={wrapperStyle} data-tour={tourId}>
      <div>
        <div className="anim-float" style={{ animationDelay: `${-pair * 1.3}s`, animationDuration: `${5.2 + pair * 0.6}s` }}>
          <button
            type="button"
            onClick={onOpen}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onBlur={onLeave}
            disabled={locked}
            aria-label={locked ? `${name} (locked until you record earnings)` : `${name}: open`}
            className={`group relative block w-full outline-none ${locked ? "cursor-not-allowed" : ""}`}
          >
            <div ref={tilt} className="relative transition-transform duration-300 ease-out will-change-transform">
              <svg viewBox="0 0 100 115.47" className="w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id={`face-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="svg-face-stop-top" />
                    <stop offset="1" className="svg-face-stop-bot" />
                  </linearGradient>
                  <linearGradient id={`act-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0" style={{ stopColor: rgb("accent-soft") }} />
                    <stop offset="1" style={{ stopColor: rgb("accent") }} />
                  </linearGradient>
                  <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
                    <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                  <clipPath id={`clip-${uid}`}>
                    <path d={HEX_PATH} />
                  </clipPath>
                </defs>

                {/* Ground shadow: sells the floating depth. */}
                <ellipse cx="50" cy="124" rx="32" ry="4.5" style={{ fill: rgb("shadow", 0.22), filter: "blur(3px)" }} />

                <path d={HEX_PATH} fill={`url(#face-${uid})`} />

                {/* Liquid level with a moving wave on top. */}
                {!locked && level > 0 && (
                  <g clipPath={`url(#clip-${uid})`}>
                    <g style={{ transform: `translateY(${(1 - level) * 115.47}px)`, transition: "transform 1100ms cubic-bezier(0.2,0.8,0.2,1)" }}>
                      <path className="anim-wave" d="M-50 4 Q-37.5 -1.5 -25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 V130 H-50 Z" style={{ fill: color, opacity: 0.34 }} />
                      <path className="anim-wave" style={{ fill: color, opacity: 0.2, animationDuration: "7s", animationDirection: "reverse" }} d="M-50 6 Q-37.5 1 -25 6 T0 6 T25 6 T50 6 T75 6 T100 6 T125 6 T150 6 V130 H-50 Z" />
                    </g>
                  </g>
                )}

                <path d={HEX_PATH} fill={`url(#gloss-${uid})`} />
                {/* Selected state: solid indigo glass. */}
                <path d={HEX_PATH} fill={`url(#act-${uid})`} className={`transition-opacity duration-500 ${active}`} />
                <path d={HEX_PATH} fill={`url(#gloss-${uid})`} className={`transition-opacity duration-500 ${active}`} />

                <path d={HEX_PATH} fill="none" className="svg-ink" strokeWidth="1" />
                <path d={HEX_PATH} fill="none" className="svg-ink-soft" strokeWidth="0.5" transform="translate(6.5 7.5) scale(0.87)" />

                {/* A soft ring that expands whenever the value changes (the key restarts it). */}
                {!locked && <path key={`${Math.round(fill * 100)}-${tone}`} d={HEX_PATH} fill="none" strokeWidth="1.1" className="anim-ping" style={{ stroke: color, transformOrigin: "50px 57.735px" }} />}

                {/* Dark port bar facing the core. */}
                <rect x={inner === "right" ? 99 : -4.5} y="34" width="5.5" height="47" rx="1.2" style={{ fill: rgb("ink"), opacity: locked ? 0.25 : 0.85 }} />

                {locked && (
                  <>
                    <line x1="20" y1="38" x2="80" y2="78" className="svg-ink-soft" strokeWidth="0.6" />
                    <line x1="80" y1="38" x2="20" y2="78" className="svg-ink-soft" strokeWidth="0.6" />
                  </>
                )}
              </svg>

              <span className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-ink transition-colors duration-300 ${textActive}`}>
                {locked ? (
                  <IconLock className="h-7 w-7 opacity-60" />
                ) : (
                  <>
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-60">Area</span>
                    <span className="font-mono text-[34px] font-light leading-none">{number}</span>
                    <span className="mt-1 font-mono text-[10px] opacity-60">{Math.round(fill * 100)}%</span>
                  </>
                )}
              </span>
            </div>

            {desktop && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-[24%] font-mono text-[7px] uppercase tracking-[0.3em] text-ink/35"
                style={{ [inner]: -17, writingMode: "vertical-rl" }}
              >
                Spend link {number}
              </span>
            )}
          </button>

          {/* Label: beside the hexagon (toward the screen edge) on desktop, under it on mobile. Same width on both sides. */}
          <div
            className={
              desktop
                ? `absolute top-[38px] w-[224px] ${side === "left" ? "right-[calc(100%+18px)] text-right" : "left-[calc(100%+18px)] text-left"}`
                : "mt-2 text-center"
            }
          >
            <p className="text-[15px] font-semibold leading-tight">
              {side === "right" && desktop && <span className="mr-2 font-mono text-[10px] font-normal text-ink-soft">{number}</span>}
              {name}
              {(side === "left" || !desktop) && <span className="ml-2 font-mono text-[10px] font-normal text-ink-soft">{number}</span>}
            </p>
            <div
              className={`my-1.5 h-px ${desktop ? "w-full" : "mx-auto w-16"}`}
              style={{ background: `linear-gradient(to ${side === "left" || !desktop ? "left" : "right"}, ${rgb("accent")}, ${rgb("ink", 0.12)})` }}
            />
            <p className="text-[12.5px] leading-snug text-ink-soft">
              {detail}
              {highlight && <span className="mt-0.5 block font-semibold text-ember">{highlight}</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
