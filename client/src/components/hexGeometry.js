/**
 * Hex geometry shared by the core and the nodes.
 * Pointy-top hexagon drawn in a 100 x 115.47 box (height = width * 2 / sqrt(3)),
 * with softly rounded corners so nothing looks sharp.
 */
export const HEX_RATIO = 115.47 / 100;
const VERTICES = [
  [50, 0],
  [100, 28.87],
  [100, 86.6],
  [50, 115.47],
  [0, 86.6],
  [0, 28.87]
];
const SIDE = 57.735;

// Builds a hexagon path whose corners are rounded with quadratic curves of the given radius.
export function roundedHexPath(radius) {
  const t = radius / SIDE;
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const n = VERTICES.length;
  let d = "";
  VERTICES.forEach((v, i) => {
    const prev = VERTICES[(i + n - 1) % n];
    const next = VERTICES[(i + 1) % n];
    const [sx, sy] = lerp(v, prev, t);
    const [ex, ey] = lerp(v, next, t);
    d += `${i === 0 ? "M" : "L"}${sx.toFixed(2)} ${sy.toFixed(2)} Q${v[0]} ${v[1]} ${ex.toFixed(2)} ${ey.toFixed(2)} `;
  });
  return `${d}Z`;
}

export const HEX_PATH = roundedHexPath(5);
export const HEX_PATH_CORE = roundedHexPath(7);

// Vertical centre of the hexagon, used to rotate things about the middle.
export const HEX_CENTER = { x: 50, y: 57.735 };

// Points string of a small pointy-top hexagon centred at (cx, cy), for icon badges.
export const hexPoints = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
