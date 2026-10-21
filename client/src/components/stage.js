/**
 * Geometry of the console, in a fixed design space that is scaled to fit the window. All offsets are
 * from the centre of the core hexagon. The layout is mirror-symmetric: every hexagon on the left has
 * a twin at the same height on the right (their float animations are paired).
 *
 * Six envelope hexagons surround the core: Housing, Food and Transport on the left, Bills, Lifestyle
 * and Goals on the right. Their order is fixed and never changes.
 */
export const STAGE = { width: 800, height: 690 };
export const CENTER = { x: 400, y: 345 };
export const CORE_W = 320;
export const RING_W = 164;

export const RING = [
  { id: "housing", dx: -172, dy: -238, port: "right" },
  { id: "food", dx: -266, dy: 0, port: "right" },
  { id: "transport", dx: -172, dy: 238, port: "right" },
  { id: "bills", dx: 172, dy: -238, port: "left" },
  { id: "lifestyle", dx: 266, dy: 0, port: "left" },
  { id: "goals", dx: 172, dy: 238, port: "left" }
];

// Absolute stage position of an offset from the core centre.
export const at = (dx, dy) => ({ x: CENTER.x + dx, y: CENTER.y + dy });

// Float timing groups: hexagons at the same height (mirror twins) share one.
export const pairOf = (dy) => Math.round(Math.abs(dy) / 124) % 4;
