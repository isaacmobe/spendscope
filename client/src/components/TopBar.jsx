import { HexButton, HexSegmented } from "./hx";
import { IconChevronLeft, IconGear, IconPower } from "./icons";
import { useAuth } from "../context/auth";
import { CURRENCIES } from "../lib/money";

const arrowEnd = "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%)";
const hexEnds = "polygon(20px 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0 50%)";

/**
 * TopBar
 * ------
 * Like the reference: a dark arrow-ended brand bar on the left (with the orange notch) and a
 * long pale striped bar holding the controls. Switching currency re-displays every amount
 * instantly using your exchange rate.
 */
export default function TopBar({ onSettings }) {
  const { user, updateSettings, logout } = useAuth();
  const current = user.settings.currency;

  return (
    <header className="flex items-center px-3 pt-4 sm:px-6">
      <div style={{ filter: "drop-shadow(0 8px 10px rgba(42,42,49,0.25))" }} className="relative z-10 shrink-0">
        <div className="relative flex h-12 items-center gap-3 bg-gradient-to-b from-[#3d3d46] to-[#232329] pl-6 pr-10 text-cream-light" style={{ clipPath: arrowEnd }}>
          <span className="absolute inset-y-0 left-0 w-1.5 bg-ember" aria-hidden />
          <IconChevronLeft className="h-5 w-5 opacity-80" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold uppercase tracking-[0.3em]">SpendScope</p>
            <p className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-cream-light/55 sm:block">Link status: normal</p>
          </div>
        </div>
      </div>

      <div className="-ml-5 flex-1" style={{ filter: "drop-shadow(0 6px 8px rgba(42,42,49,0.12))" }}>
        <div
          className="flex h-10 items-center justify-end gap-2 pl-10 pr-5 sm:gap-3"
          style={{
            clipPath: hexEnds,
            background: "repeating-linear-gradient(125deg, rgba(42,42,49,0.06) 0 5px, transparent 5px 11px), linear-gradient(180deg,#f9f7f1,#ebe7db)"
          }}
        >
          <span className="hidden max-w-[150px] truncate text-[13px] text-ink-soft md:block">{user.name || user.email}</span>
          <HexSegmented label="Display currency" options={CURRENCIES} value={current} onChange={(c) => updateSettings({ currency: c }).catch(() => {})} />
          <HexButton size="sm" onClick={onSettings} aria-label="Settings">
            <IconGear className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </HexButton>
          <HexButton size="sm" onClick={logout} aria-label="Log out">
            <IconPower className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </HexButton>
        </div>
      </div>
    </header>
  );
}
