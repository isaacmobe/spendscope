import { rgb } from "../lib/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { CENTER, POS, RING1, RING2, STAGE, at } from "./stage";

/**
 * Circuit
 * -------
 * The wiring behind the honeycomb: pale pipes with flowing dashes from the core to each area, a
 * short link to the cells above and below the core, and faint hairlines from each outer cell to the
 * area it relates to. Mirror-symmetric about the vertical centre line.
 */
export default function Circuit({ locked, leadId, pinned }) {
  const reduced = useReducedMotion();
  const lead = leadId ? POS[leadId] : null;
  const ring1 = Object.fromEntries(RING1.map((n) => [n.id, at(n.dx, n.dy)]));
  const dash = locked ? rgb("ink", 0.2) : rgb("accent", 0.55);

  return (
    <svg className="pointer-events-none absolute inset-0" width={STAGE.width} height={STAGE.height} aria-hidden="true">
      {RING1.map((n) => {
        const p = ring1[n.id];
        return (
          <g key={n.id}>
            <line x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y} style={{ stroke: rgb("ink", 0.05) }} strokeWidth="18" strokeLinecap="round" />
            <line x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y} style={{ stroke: dash }} strokeWidth="1.3" strokeDasharray="6 6" className={locked ? "" : "anim-flow"} />
          </g>
        );
      })}

      {/* Core to the cells above and below it */}
      {[-1, 1].map((dir) => (
        <line key={dir} x1={CENTER.x} y1={CENTER.y + dir * 190} x2={CENTER.x} y2={CENTER.y + dir * 262} style={{ stroke: dash }} strokeWidth="1.3" strokeDasharray="5 5" className={locked ? "" : "anim-flow"} />
      ))}

      {/* Hairlines from outer cells to the area they relate to */}
      {RING2.filter((c) => c.link !== "core").map((c) => {
        const a = at(c.dx, c.dy);
        const b = ring1[c.link];
        return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: rgb("ink", 0.14) }} strokeWidth="1" strokeDasharray="2 5" />;
      })}

      {/* Lead line: while a hexagon is hovered or pinned, a glowing line runs from it to the core, behind both. */}
      {lead && (
        <g key={leadId}>
          <line x1={CENTER.x} y1={CENTER.y} x2={lead.x} y2={lead.y} style={{ stroke: rgb("accent", 0.28) }} strokeWidth={pinned ? 26 : 20} strokeLinecap="round" className="anim-preview" />
          <line x1={CENTER.x} y1={CENTER.y} x2={lead.x} y2={lead.y} style={{ stroke: rgb("accent"), filter: `drop-shadow(0 0 6px ${rgb("accent")})` }} strokeWidth={pinned ? 3.5 : 2.5} strokeDasharray="10 7" strokeLinecap="round" className={reduced ? "" : "anim-flow"} />
          <circle cx={lead.x} cy={lead.y} r="6" style={{ fill: rgb("accent") }} />
          {!reduced && (
            <circle r="5" style={{ fill: rgb("sel-top"), filter: `drop-shadow(0 0 6px ${rgb("accent")})` }}>
              <animateMotion dur="1.2s" repeatCount="indefinite" path={`M${lead.x} ${lead.y} L${CENTER.x} ${CENTER.y}`} />
            </circle>
          )}
        </g>
      )}
    </svg>
  );
}
