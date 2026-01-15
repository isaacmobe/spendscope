import BentoCard from "./BentoCard";

/**
 * Footer
 * ------
 * Bento-style footer that reinforces branding and tech stack.
 * Keeps the app feeling like a real product, not a demo page.
 */
export default function Footer() {
  return (
    <BentoCard className="md:col-span-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Left: Brand */}
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-brand-green">SpendScope</span>
        </p>

        {/* Center: Stack */}
        <p className="text-xs text-slate-500">
          MERN Stack • MongoDB • Express • React • Node • Tailwind
        </p>

        {/* Right: Purpose */}
        <p className="text-xs text-slate-500">
          Personal Finance Dashboard MVP
        </p>
      </div>
    </BentoCard>
  );
}
