import { layerShift } from "../hooks/useParallax";
import { CORE, NODES, NODE_SIZE, STAGE, centerOf } from "./stage";

// Points of a small pointy-top hexagon, for the icon badges.
const hexPoints = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/**
 * Circuit
 * -------
 * The decorative wiring of the console, in stage coordinates: pale pipes with animated data
 * dashes from the core to each node, a funnel above the core, and falling chevrons below it
 * that lead the eye down to the plan, like the reference.
 */
export default function Circuit({ locked }) {
  const core = centerOf(CORE, CORE.size);
  const line = "#2a2a31";

  return (
    <svg className="pointer-events-none absolute inset-0" width={STAGE.width} height={STAGE.height} style={layerShift(-4, -3)} aria-hidden="true">
      {NODES.map((n) => {
        const c = centerOf(n.pos, NODE_SIZE);
        return (
          <g key={n.id}>
            <line x1={core.x} y1={core.y} x2={c.x} y2={c.y} stroke="rgba(42,42,49,0.05)" strokeWidth="18" strokeLinecap="round" />
            <line
              x1={core.x}
              y1={core.y}
              x2={c.x}
              y2={c.y}
              stroke={locked ? "rgba(42,42,49,0.2)" : "#5e62c4"}
              strokeOpacity={locked ? 1 : 0.55}
              strokeWidth="1.3"
              strokeDasharray="6 6"
              className={locked ? "" : "anim-flow"}
            />
          </g>
        );
      })}

      {/* Funnel above the core with a hexagon badge. */}
      <g fill="none" stroke={line} strokeOpacity="0.55" strokeWidth="1.2" strokeLinejoin="round">
        <path d={`M ${core.x - 66} 14 L ${core.x - 20} 108 L ${core.x - 20} 160`} />
        <path d={`M ${core.x + 66} 14 L ${core.x + 20} 108 L ${core.x + 20} 160`} />
        <polygon points={hexPoints(core.x, 104, 13)} fill="#faf8f3" />
        <polygon points={hexPoints(core.x, 104, 7)} strokeOpacity="0.4" />
        <circle cx={core.x} cy="104" r="1.8" fill="#5e62c4" stroke="none" className="anim-pulse-soft" />
      </g>

      {/* Chevrons that fall toward the plan below. */}
      <g fill="none" stroke={line} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${core.x - 16} ${600 + i * 24} L ${core.x} ${612 + i * 24} L ${core.x + 16} ${600 + i * 24}`} className="anim-chevron" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
        <polygon points={hexPoints(core.x, 700, 15)} strokeOpacity="0.55" fill="#faf8f3" />
        <path d={`M ${core.x} 693 L ${core.x} 707 M ${core.x - 5} 702 L ${core.x} 707 L ${core.x + 5} 702`} strokeOpacity="0.7" />
      </g>
    </svg>
  );
}
