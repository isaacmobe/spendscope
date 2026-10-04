/**
 * HexCard
 * -------
 * A tall hexagon-shaped card with two back plates and layered shadows, so it floats above the
 * page. Used for popups and the login panel. Content is padded away from the pointed sides.
 */
export default function HexCard({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <div style={{ filter: "drop-shadow(0 34px 38px rgb(var(--c-shadow) / 0.3)) drop-shadow(0 8px 10px rgb(var(--c-shadow) / 0.16))" }}>
        {/* Back plates give the stacked, floating look. */}
        <div aria-hidden className="panel-shape absolute inset-0 translate-x-3 translate-y-3 bg-cream-dark" />
        <div aria-hidden className="panel-shape absolute inset-0 translate-x-1.5 translate-y-1.5 bg-cream-deep" />
        <div className="panel-shape relative bg-ink/70 p-[1.5px]">
          <div className="panel-shape overflow-hidden bg-gradient-to-b from-cream-light to-cream" style={{ "--pc": "33px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
