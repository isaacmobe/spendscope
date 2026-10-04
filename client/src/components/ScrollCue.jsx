import { useReducedMotion } from "../hooks/useReducedMotion";
import { hexPoints } from "./hexGeometry";
import { IconArrowDown } from "./icons";

/**
 * ScrollCue
 * ---------
 * The hexagon arrow below the core. It is a real button: it scrolls smoothly to the plan section
 * (instantly when the user prefers reduced motion). Positioned by the dashboard in stage
 * coordinates on desktop, and shown inline under the areas on mobile.
 */
export default function ScrollCue({ style, className = "" }) {
  const reduced = useReducedMotion();
  const go = () => document.getElementById("plan")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  return (
    <button
      type="button"
      onClick={go}
      aria-label="Scroll to this month's plan"
      title="Scroll to this month's plan"
      className={`group grid h-[64px] w-[56px] place-items-center transition-transform duration-300 hover:translate-y-1 focus-visible:translate-y-1 ${className}`}
      style={style}
    >
      <svg viewBox="-20 -21 40 42" className="col-start-1 row-start-1 h-full w-full overflow-visible" aria-hidden="true">
        <polygon points={hexPoints(0, 0, 18)} strokeWidth="1.2" strokeLinejoin="round" className="fill-cream-light stroke-ink/55 transition-colors duration-300 group-hover:stroke-accent group-focus-visible:stroke-accent" />
      </svg>
      <IconArrowDown className="pointer-events-none col-start-1 row-start-1 h-5 w-5 text-ink transition-colors group-hover:text-accent group-focus-visible:text-accent" />
    </button>
  );
}
