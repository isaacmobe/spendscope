/**
 * Geometry of the honeycomb console, in a fixed 1240 x 860 design space that is scaled to fit the
 * window. All offsets are from the centre of the core. The layout is mirror-symmetric: every cell
 * on the left has a twin at the same height on the right (their float animations are paired).
 *
 *   ring 1   the six spending areas around the core
 *   ring 2   information cells: top and bottom of the core, and a zigzag column on each side
 */
export const STAGE = { width: 1240, height: 860 };
export const CENTER = { x: 620, y: 430 };
export const CORE_W = 320;
export const RING1_W = 164;
export const RING2_W = 130;

// Spending areas, in AREAS order (they are numbered 01 to 06 from this order).
export const RING1 = [
  { id: "housing", side: "left", dx: -172, dy: -238, port: "right" },
  { id: "food", side: "left", dx: -266, dy: 0, port: "right" },
  { id: "transport", side: "left", dx: -172, dy: 238, port: "right" },
  { id: "bills", side: "right", dx: 172, dy: -238, port: "left" },
  { id: "lifestyle", side: "right", dx: 266, dy: 0, port: "left" },
  { id: "savings", side: "right", dx: 172, dy: 238, port: "left" }
];

// Information cells. `link` names the ring-1 cell its hairline connects to.
export const RING2 = [
  { id: "safe", dx: 0, dy: -330, link: "core" },
  { id: "goal", dx: 0, dy: 330, link: "core" },
  { id: "needs", dx: -440, dy: -248, link: "housing" },
  { id: "wants", dx: -514, dy: -124, link: "food" },
  { id: "pool", dx: -440, dy: 0, link: "food" },
  { id: "after", dx: -514, dy: 124, link: "food" },
  { id: "left", dx: -440, dy: 248, link: "transport" },
  { id: "pace", dx: 440, dy: -248, link: "bills" },
  { id: "advice", dx: 514, dy: -124, link: "lifestyle" },
  { id: "level", dx: 440, dy: 0, link: "lifestyle" },
  { id: "net", dx: 514, dy: 124, link: "lifestyle" },
  { id: "quick", dx: 440, dy: 248, link: "savings" }
];

// Absolute stage position of an offset from the core centre.
export const at = (dx, dy) => ({ x: CENTER.x + dx, y: CENTER.y + dy });

// Float timing groups: cells at the same height (mirror twins) share one.
export const pairOf = (dy) => Math.round(Math.abs(dy) / 124) % 4;

// Centre of every outer hexagon by id (areas and information cells share one id space).
export const POS = Object.fromEntries([...RING1, ...RING2].map((n) => [n.id, at(n.dx, n.dy)]));
