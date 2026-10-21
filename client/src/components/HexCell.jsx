import { useRef } from "react";
import HexFrame from "./HexFrame";
import { hexHeight } from "./hexGeometry";
import { IconLock } from "./icons";

/**
 * HexCell
 * -------
 * One envelope hexagon, with its text inside. It is a real button: click opens the matching popup.
 * Hover or keyboard focus gives the solid indigo "selected" look and a small 3D tilt toward the
 * pointer; when its value changes a ring pulses once. Mirrored cells share the same float timing (`pair`) so the two sides
 * of the console always move together.
 *   Every colour comes from theme variables, and text sits on a surface that sets its own colour.
 */
export default function HexCell({ size, kicker, title, value, caption, tone = "ok", level = 0, icon: Icon, locked, selected, port, onOpen, label, center, delay = 0, pair = 0, tourId, absolute = true }) {
  const tilt = useRef(null);
  const h = hexHeight(size);
  const big = size >= 150;
  const soft = "hc-soft";

  const onMove = (e) => {
    if (locked || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.transform = `perspective(560px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (tilt.current) tilt.current.style.transform = "";
  };
  const wrapper = absolute && center ? { left: center.x - size / 2, top: center.y - h / 2, width: size, height: h, animationDelay: `${delay}ms` } : { width: size, height: h, animationDelay: `${delay}ms` };

  return (
    <div className={`anim-rise ${absolute ? "absolute" : "relative shrink-0"}`} style={wrapper} data-tour={tourId}>
      <div className="anim-float" style={{ animationDelay: `${-pair * 1.3}s`, animationDuration: `${5.2 + pair * 0.6}s` }}>
        <button
          type="button"
          onClick={onOpen}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onBlur={onLeave}
          disabled={locked}
          aria-label={label}
          data-selected={Boolean(selected)}
          className={`group relative block outline-none ${locked ? "cursor-not-allowed" : ""}`}
          style={{ width: size, height: h }}
        >
          <div ref={tilt} className="transition-transform duration-300 ease-out will-change-transform">
            <HexFrame size={size} radius={big ? 12 : 10} tone={tone} level={level} locked={locked} selected={selected} portSide={port} pingKey={`${value}-${tone}`}>
              <span className={`pointer-events-none absolute inset-x-[10%] bottom-[16%] top-[19%] flex flex-col items-center justify-center text-center hc-text`}>
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
