import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOUR_STEPS } from "../config/tour";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { rgb } from "../lib/tokens";
import { HexButton, HexSlab } from "./hx";

const PAD = 10; // space between the target and the cut-out edge
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 270; // estimate used only to decide above or below

// Elongated-hexagon polygon for the cut-out around a target.
function holePoints({ x, y, w, h }) {
  const c = Math.min(26, w / 5, h / 2);
  return [[x + c, y], [x + w - c, y], [x + w, y + h / 2], [x + w - c, y + h], [x + c, y + h], [x, y + h / 2]].map((p) => p.join(",")).join(" ");
}

/**
 * Tour
 * ----
 * A guided walkthrough. It dims the page, cuts a hexagon-shaped spotlight around the control being
 * explained and shows a popover next to it with Back / Next / Skip. Steps come from config/tour.js.
 * Keyboard: Right/Enter next, Left back, Esc closes. On phones the popover becomes a bottom sheet.
 */
export default function Tour({ open, onClose }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const popRef = useRef(null);

  // Steps whose target is on screen right now (read when the tour renders open).
  const steps = open ? TOUR_STEPS.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)) : [];
  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const step = steps[safeIndex];
  const last = safeIndex >= steps.length - 1;
  const mobile = view.w > 0 && view.w < 640;

  const targetId = step?.target;
  const next = () => (last ? onClose() : setIndex(safeIndex + 1));
  const back = () => setIndex(Math.max(0, safeIndex - 1));

  // Bring the target into view when the step changes.
  useEffect(() => {
    if (!open || !targetId) return;
    const el = document.querySelector(`[data-tour="${targetId}"]`);
    el?.scrollIntoView({ block: window.innerWidth < 640 ? "start" : "center", behavior: reduced ? "auto" : "smooth" });
  }, [open, targetId, reduced]);

  // Follow the target every frame while open (it may be scrolling, animating or resizing).
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const tick = () => {
      setView((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      if (targetId) {
        const el = document.querySelector(`[data-tour="${targetId}"]`);
        const r = el?.getBoundingClientRect();
        setRect((prev) => {
          if (!r || (r.width === 0 && r.height === 0)) return prev === null ? prev : null;
          const next = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
          return prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next;
        });
      } else {
        setRect((prev) => (prev === null ? prev : null));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, targetId]);

  // Keyboard control.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Move focus to the popover so keyboard users land on it.
  useEffect(() => {
    if (open) popRef.current?.focus();
  }, [open, safeIndex]);

  if (!open || !step) return null;

  // Popover position: below the target if it fits, else above, else centred; a bottom sheet on phones.
  let popStyle;
  if (mobile) {
    popStyle = { left: 12, right: 12, bottom: 12, width: "auto" };
  } else if (rect) {
    const below = view.h - (rect.y + rect.h);
    const left = Math.min(Math.max(12, rect.x + rect.w / 2 - POPOVER_WIDTH / 2), view.w - POPOVER_WIDTH - 12);
    if (below >= POPOVER_HEIGHT + 16) popStyle = { left, top: rect.y + rect.h + 14, width: POPOVER_WIDTH };
    else if (rect.y >= POPOVER_HEIGHT + 16) popStyle = { left, bottom: view.h - rect.y + 14, width: POPOVER_WIDTH };
    // Target is nearly the whole screen: park the popover in the bottom-right corner.
    else popStyle = { left: Math.max(12, view.w - POPOVER_WIDTH - 24), bottom: 24, width: POPOVER_WIDTH };
  } else {
    popStyle = { left: "50%", top: "50%", width: POPOVER_WIDTH, transform: "translate(-50%, -50%)" };
  }

  const dim = rgb("shadow", 0.62);
  // Rendered on document.body: an ancestor that is mid-animation (transform) would otherwise become the
  // containing block of "fixed" and push the popover far off screen.
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="presentation">
      {/* Dimmed page with a hexagon-shaped hole. The overlay swallows clicks so nothing behind is triggered by accident. */}
      <svg className="absolute inset-0 h-full w-full" width={view.w} height={view.h} aria-hidden="true">
        <path
          fillRule="evenodd"
          style={{ fill: dim, transition: "d 0.3s" }}
          d={`M0 0H${view.w}V${view.h}H0Z${rect ? `M${holePoints(rect).replaceAll(" ", "L").replaceAll(",", " ")}Z` : ""}`}
        />
        {rect && <polygon points={holePoints(rect)} fill="none" strokeWidth="2" strokeLinejoin="round" className="anim-pulse-soft" style={{ stroke: rgb("accent-soft") }} />}
      </svg>

      <div ref={popRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tour-title" className="anim-tour absolute outline-none" style={popStyle} key={step.id}>
        <HexSlab pc={22}>
          <div className="px-9 pb-6 pt-7 sm:px-11">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              Step {safeIndex + 1} of {steps.length}
            </p>
            <h2 id="tour-title" className="mt-1.5 text-[15px] font-semibold">
              {step.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{step.body}</p>

            <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span key={s.id} className="hexcell h-2 w-2 transition-colors duration-300" style={{ background: i === safeIndex ? rgb("accent") : rgb("ink", 0.18) }} />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <HexButton size="sm" variant="ghost" onClick={back} disabled={safeIndex === 0}>
                Back
              </HexButton>
              <HexButton size="sm" variant="ghost" onClick={onClose}>
                {last ? "Close" : "Skip"}
              </HexButton>
              <HexButton size="sm" variant={last ? "accent" : "solid"} onClick={next}>
                {last ? "Done" : "Next"}
              </HexButton>
            </div>
          </div>
        </HexSlab>
      </div>
    </div>,
    document.body
  );
}
