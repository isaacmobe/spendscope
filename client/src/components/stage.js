/**
 * Geometry of the desktop console, in a fixed 1200 x 740 design space that is scaled to fit.
 * Positions are the top-left corner of each hexagon. Left and right columns mirror each other,
 * and the nodes nestle against the slanted edges of the core, like the reference.
 */
export const STAGE = { width: 1200, height: 740 };
export const CORE = { x: 430, y: 170, size: 340 };
export const NODE_SIZE = 156;

export const NODES = [
  { id: "housing", side: "left", pos: { x: 352, y: 40 } },
  { id: "food", side: "left", pos: { x: 262, y: 288 } },
  { id: "transport", side: "left", pos: { x: 352, y: 512 } },
  { id: "bills", side: "right", pos: { x: 692, y: 40 } },
  { id: "lifestyle", side: "right", pos: { x: 782, y: 288 } },
  { id: "savings", side: "right", pos: { x: 692, y: 512 } }
];

// Centre of a hexagon of a given width placed at pos.
export const centerOf = (pos, size) => ({ x: pos.x + size / 2, y: pos.y + (size * 1.1547) / 2 });
