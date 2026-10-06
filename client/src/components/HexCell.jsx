import { useRef } from "react";
import HexFrame from "./HexFrame";
import { hexHeight } from "./hexGeometry";
import { IconLock } from "./icons";
import { rgb } from "../lib/tokens";

// Tiny line chart inside a cell (cumulative spending through the month).
function Spark({ values, max, color }) {
  if (!values || values.length < 2) return <span className="h-[14px]" />;
  const w = 64;
  const h = 14;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1 overflow-visible" aria-hidden="true">
      <polyline points={pts} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color }} />
    </svg>
  );
}

/**
 * HexCell
 * -------
 * One hexagon of the honeycomb: a spending area (large, with the text inside) or an information
 * cell (smaller). It is a real button: click opens the matching popup. Hover or keyboard focus
 * gives the solid indigo "selected" look and a small 3D tilt toward the pointer; when its value
 * changes a ring pulses once. Mirrored cells share the same float timing (`pair`) so the two sides
 * of the console always move together.
 *   Every colour comes from theme variables, and text sits on a surface that sets its own colour.
 */
export default function HexCell({ size, kicker, title, value, caption, tone = "ok", level = 0, icon: Icon, locked, selected, port, spark, sparkMax, onOpen, onPreview, label, center, delay = 0, pair = 0, tourId, absolute = true, dim = false }) {
  const tilt = useRef(null);
  const h = hexHeight(size);
  const big = size >= 150;
  const hoverText = selected ? "text-white" : "group-hover:text-white group-focus-visible:text-white";
  const soft = selected ? "text-white/85" : "text-ink-soft group-hover:text-white/85 group-focus-visible:text-white/85";

  const onMove = (e) => {
    if (locked || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.transform = `perspective(560px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (tilt.current) tilt.current.style.transform = "";
    onPreview?.(false);
  };
  // Mouse hover and keyboard focus preview the cell in the centre; a touch is handled by the click.
  const onEnter = (e) => {
    if (e.pointerType !== "touch" && !locked) onPreview?.(true);
  };

  const wrapper = absolute && center ? { left: center.x - size / 2, top: center.y - h / 2, width: size, height: h, animationDelay: `${delay}ms` } : { width: size, height: h, animationDelay: `${delay}ms` };

  return (
    <div className={`anim-rise ${absolute ? "absolute" : "relative shrink-0"} ${dim ? "opacity-80" : ""}`} style={wrapper} data-tour={tourId}>
      <div className="anim-float" style={{ animationDelay: `${-pair * 1.3}s`, animationDuration: `${5.2 + pair * 0.6}s` }}>
        <button
          type="button"
          onClick={onOpen}
          onPointerEnter={onEnter}
          onPointerMove={onMove}
          onFocus={() => !locked && onPreview?.(true)}
          onPointerLeave={onLeave}
          onBlur={onLeave}
          disabled={locked}
          aria-label={label}
          className={`group relative block outline-none ${locked ? "cursor-not-allowed" : ""}`}
          style={{ width: size, height: h }}
        >
          <div ref={tilt} className="transition-transform duration-300 ease-out will-change-transform">
            <HexFrame size={size} radius={big ? 12 : 10} tone={tone} level={level} locked={locked} selected={selected} portSide={port} pingKey={`${value}-${tone}`}>
              <span className={`pointer-events-none absolute inset-x-[10%] bottom-[16%] top-[19%] flex flex-col items-center justify-center text-center text-ink ${hoverText}`}>
                {locked ? (
                  <>
                    <IconLock className="h-6 w-6 opacity-70" />
                    <span className={`mt-1 text-[11.5px] font-medium ${soft}`}>{title || kicker}</span>
                    <span className={`text-[11px] ${soft}`}>Locked</span>
                  </>
                ) : (
                  <>
                    {kicker && <span className={`font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] ${soft}`}>{kicker}</span>}
                    {Icon && <Icon className="my-0.5 h-5 w-5" />}
                    {title && <span className={`${big ? "text-[15px]" : "text-[13px]"} font-semibold leading-tight`}>{title}</span>}
                    <span className={`font-mono ${big ? "text-[14px]" : "text-[14px]"} mt-0.5 font-semibold leading-tight`}>{value}</span>
                    {caption && <span className={`mt-0.5 text-[11.5px] leading-tight ${soft}`}>{caption}</span>}
                    {spark && <Spark values={spark} max={sparkMax} color={tone === "over" ? rgb("rose-deep") : rgb("accent")} />}
                  </>
                )}
              </span>
            </HexFrame>
          </div>
        </button>
      </div>
    </div>
  );
}
