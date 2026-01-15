/**
 * Header
 * ------
 * Simple top header for branding + explanation.
 * This helps the project feel like a product, not a demo.
 */
export default function Header() {
  return (
    <header className="flex items-start justify-between gap-4">
      {/* Left side: Logo + Text */}
      <div className="flex items-start gap-3">
        {/* Logo (served from /public) */}
        <img
          src="/dollar.svg"
          alt="SpendScope logo"
          className="h-10 w-10 shrink-0"
        />

        {/* Text stays EXACTLY as you wrote it */}
        <div>
          <h1 className="text-2xl font-bold leading-tight">SpendScope</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track income & expenses, view trends, and stay under budget.
          </p>
        </div>
      </div>

      {/* Small badge - adds product vibe */}
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-900 text-white">
        MVP
      </span>
    </header>
  );
}
