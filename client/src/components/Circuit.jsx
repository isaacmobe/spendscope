import { rgb } from "../lib/tokens";
import { hexPoints } from "./hexGeometry";
import { CORE, NODES, NODE_SIZE, STAGE, centerOf } from "./stage";

/**
 * Circuit
 * -------
 * The decorative wiring of the console, in stage coordinates: pale pipes with animated data
 * dashes from the core to each node, a funnel above the core, and falling chevrons below it
 * that lead the eye down to the plan, like the reference. Everything here is mirror-symmetric
 * about the vertical centre line of the stage.
 */
export default function Circuit({ locked }) {
  const core = centerOf(CORE, CORE.size);
  const line = rgb("ink");

  return (
    <svg className="pointer-events-none absolute inset-0" width={STAGE.width} height={STAGE.height} aria-hidden="true">
      {NODES.map((n) => {
        const c = centerOf(n.pos, NODE_SIZE);
        return (
          <g key={n.id}>
            <line x1={core.x} y1={core.y} x2={c.x} y2={c.y} style={{ stroke: rgb("ink", 0.05) }} strokeWidth="18" strokeLinecap="round" />
            <line
              x1={core.x}
              y1={core.y}
              x2={c.x}
              y2={c.y}
              style={{ stroke: locked ? rgb("ink", 0.2) : rgb("accent", 0.55) }}
              strokeWidth="1.3"
              strokeDasharray="6 6"
              className={locked ? "" : "anim-flow"}
            />
          </g>
        );
      })}

      {/* Funnel above the core with a hexagon badge. */}
      <g fill="none" style={{ stroke: line, strokeOpacity: 0.55 }} strokeWidth="1.2" strokeLinejoin="round">
        <path d={`M ${core.x - 66} 14 L ${core.x - 20} 108 L ${core.x - 20} 160`} />
        <path d={`M ${core.x + 66} 14 L ${core.x + 20} 108 L ${core.x + 20} 160`} />
        <polygon points={hexPoints(core.x, 104, 13)} style={{ fill: rgb("surface") }} />
        <polygon points={hexPoints(core.x, 104, 7)} strokeOpacity="0.4" />
        <circle cx={core.x} cy="104" r="1.8" style={{ fill: rgb("accent") }} stroke="none" className="anim-pulse-soft" />
      </g>

      {/* Chevrons that fall toward the plan below (the clickable arrow is a real button, see ScrollCue). */}
      <g fill="none" style={{ stroke: line }} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${core.x - 16} ${596 + i * 24} L ${core.x} ${608 + i * 24} L ${core.x + 16} ${596 + i * 24}`} className="anim-chevron" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </g>
    </svg>
  );
}
