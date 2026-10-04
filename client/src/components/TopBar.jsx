import { useAuth } from "../context/auth";
import { CURRENCIES } from "../lib/money";

/**
 * TopBar
 * ------
 * Brand block, currency switch (KES / USD), settings and logout.
 * Switching currency re-displays everything instantly using your exchange rate.
 */
export default function TopBar({ onSettings }) {
  const { user, updateSettings, logout } = useAuth();
  const current = user.settings.currency;

  return (
    <header className="flex items-stretch justify-between gap-3 px-3 pt-3 sm:px-6">
      <div className="flex items-center gap-3 bg-ink px-4 py-2 text-paper-light">
        <span className="h-5 w-1 bg-ember" aria-hidden="true" />
        <div className="leading-tight">
          <p className="text-sm font-semibold uppercase tracking-[0.25em]">SpendScope</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper-light/60">Link status: normal</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden max-w-[160px] truncate text-sm text-ink-soft sm:block">{user.name || user.email}</span>
        <div role="group" aria-label="Display currency" className="flex border border-ink">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === current}
              onClick={() => c !== current && updateSettings({ currency: c }).catch(() => {})}
              className={`px-3 py-1.5 font-mono text-xs font-semibold ${c === current ? "bg-ink text-paper-light" : "bg-paper-light hover:bg-white"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <button type="button" onClick={onSettings} className="border border-ink bg-paper-light whitespace-nowrap px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider hover:bg-white sm:px-3 sm:text-xs">
          Settings
        </button>
        <button type="button" onClick={logout} className="border border-ink bg-paper-light whitespace-nowrap px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider hover:bg-white sm:px-3 sm:text-xs">
          Log out
        </button>
      </div>
    </header>
  );
}
