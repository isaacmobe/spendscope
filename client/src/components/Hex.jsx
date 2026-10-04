/**
 * Hex geometry shared by the core and the nodes.
 * Pointy-top hexagon drawn in a 100 x 115.47 box (height = width * 2 / sqrt(3)).
 */
export const HEX_POINTS = "50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87";
export const HEX_RATIO = 115.47 / 100;

// Padlock drawn in the same 100-wide space, used for locked nodes.
export function Padlock({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
