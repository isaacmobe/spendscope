import { useReducedMotion } from "../hooks/useReducedMotion";
import { rgb } from "../lib/tokens";
import { CENTER, CORE_W, STAGE } from "./stage";
import { hexHeight } from "./hexGeometry";

// Turn a list of points into a path whose corners are rounded with radius r.
function roundedPath(points, r = 16) {
  const pts = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.5);
  if (pts.length < 3) return `M${pts[0].x} ${pts[0].y} L${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const la = Math.hypot(a.x - b.x, a.y - b.y);
    const lc = Math.hypot(c.x - b.x, c.y - b.y);
    const rr = Math.min(r, la / 2, lc / 2);
    const p1 = { x: b.x + ((a.x - b.x) / la) * rr, y: b.y + ((a.y - b.y) / la) * rr };
    const p2 = { x: b.x + ((c.x - b.x) / lc) * rr, y: b.y + ((c.y - b.y) / lc) * rr };
    d += ` L${p1.x} ${p1.y} Q${b.x} ${b.y} ${p2.x} ${p2.y}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x} ${last.y}`;
}

/**
 * route(node)
 * -----------
 * The points of a wire from the core to a cell, using only horizontal and vertical runs, like a
 * circuit trace. A cell off to the side gets a horizontal-vertical-horizontal route from the core's
 * side port to the cell's facing side; a cell above or below gets a vertical-horizontal-vertical
 * route from the core's top or bottom point. Works wherever the cell has been dragged.
 */
function route(node) {
  const dx = node.x - CENTER.x;
  const dy = node.y - CENTER.y;
  const nodeHalfH = hexHeight(node.w) / 2;
  if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    const s = Math.sign(dx) || 1;
    const a = { x: CENTER.x + (s * CORE_W) / 2, y: CENTER.y };
    const b = { x: node.x - (s * node.w) / 2, y: node.y };
    const mx = (a.x + b.x) / 2;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  const s = Math.sign(dy) || 1;
  const a = { x: CENTER.x, y: CENTER.y + (s * hexHeight(CORE_W)) / 2 };
  const b = { x: node.x, y: node.y - s * nodeHalfH };
  const my = (a.y + b.y) / 2;
  return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
}

/**
 * Circuit
 * -------
 * The wiring behind the console. Each of the six spending areas has a faint trace to the core. When
 * a hexagon is hovered or pinned, its trace lights up and a bright dot runs along it toward the core.
 * Everything is drawn behind the hexagons, and follows them when they are dragged.
 *   nodes: { id: { x, y, w } } current centres and widths of the outer hexagons
 */
export default function Circuit({ nodes, areaIds, locked, leadId, pinned }) {
  const reduced = useReducedMotion();
  const lead = leadId && nodes[leadId] ? roundedPath([...route(nodes[leadId])].reverse()) : null;
  const leadToCore = leadId && nodes[leadId] ? roundedPath(route(nodes[leadId])) : null;
  const base = locked ? rgb("ink", 0.18) : rgb("ink", 0.3);

  return (
    <svg className="pointer-events-none absolute inset-0" width={STAGE.width} height={STAGE.height} aria-hidden="true">
      {areaIds.map((id) => (
        <path key={id} d={roundedPath(route(nodes[id]))} fill="none" style={{ stroke: base }} strokeWidth="1.3" strokeDasharray="2 6" strokeLinecap="round" />
      ))}

      {/* The traced wire for the hovered or pinned hexagon, with a dot travelling toward the core. */}
      {leadToCore && (
        <g key={leadId}>
          <path d={leadToCore} fill="none" style={{ stroke: rgb("accent", 0.25) }} strokeWidth={pinned ? 14 : 10} strokeLinecap="round" strokeLinejoin="round" className="anim-preview" />
          <path d={leadToCore} fill="none" style={{ stroke: rgb("accent"), filter: `drop-shadow(0 0 5px ${rgb("accent")})` }} strokeWidth={pinned ? 3 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={nodes[leadId].x} cy={nodes[leadId].y} r="5" style={{ fill: rgb("accent") }} />
          {!reduced && lead && (
            <circle r="5" style={{ fill: rgb("sel-top"), filter: `drop-shadow(0 0 6px ${rgb("accent")})` }}>
              <animateMotion dur="1.3s" repeatCount="indefinite" path={lead} />
            </circle>
          )}
        </g>
      )}
    </svg>
  );
}
