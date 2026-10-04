/**
 * Logo
 * ----
 * The SpendScope mark: a black hexagon with a cream inner hexagon and a dot. A thin cream rim keeps
 * it visible on dark backgrounds. The same drawing is public/favicon.svg.
 */
export default function Logo({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="SpendScope logo">
      <polygon points="32,5 55.4,18.5 55.4,45.5 32,59 8.6,45.5 8.6,18.5" fill="#111114" stroke="#111114" strokeWidth="5" strokeLinejoin="round" />
      <polygon
        points="32,5 55.4,18.5 55.4,45.5 32,59 8.6,45.5 8.6,18.5"
        fill="none"
        stroke="#f6f3ea"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinejoin="round"
        transform="translate(32 32) scale(1.075) translate(-32 -32)"
      />
      <polygon points="32,15 46.7,23.5 46.7,40.5 32,49 17.3,40.5 17.3,23.5" fill="none" stroke="#f6f3ea" strokeOpacity="0.9" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="3.4" fill="#f6f3ea" />
    </svg>
  );
}
