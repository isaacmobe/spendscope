/**
 * BentoCard
 * ---------
 * A reusable "card" layout container.
 * Why: A consistent design system makes the UI look professional fast.
 */
export default function BentoCard({ title, children, className = "" }) {
  return (
    <section
       className={[
        "rounded-2xl bg-white p-4",
        // Soft border/ring improves separation on light backgrounds
        "ring-1 ring-black/5",
        // Floaty shadow + smooth transitions
        "shadow-lg shadow-black/5",
        "transition-all duration-200",
        // Subtle hover lift (feels interactive but not gimmicky)
        "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10",
        className
      ].join(" ")}
    >
      {/* Optional title (small label) */}
      {title ? <h2 className="text-sm font-semibold text-gray-600 mb-3">{title}</h2> : null}

      {/* Card content */}
      {children}
    </section>
  );
}
