import { useAuth } from "../context/auth";
import { useTheme } from "../context/theme";
import { CURRENCIES } from "../lib/money";
import { HexButton, HexSegmented } from "./hx";
import { IconBolt, IconGear, IconHelp, IconMoon, IconPower, IconSun } from "./icons";
import Logo from "./Logo";

/**
 * TopBar
 * ------
 * A game-style HUD header: a dark brand block with an orange notch on the left, an optional
 * centre slot (the month selector on desktop), and one glass control cluster with cut corners on
 * the right. A thin glowing rail runs under all of it. Every action is the same icon-sized hexagon
 * so the row is even; names live in tooltips and screen-reader labels. On phones the three parts
 * wrap into tidy rows.
 */
export default function TopBar({ onSettings, onQuickAdd, onTour, center }) {
  const { user, updateSettings, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const current = user.settings.currency;

  const action = (label, onClick, icon, tour) => (
    <HexButton size="icon" onClick={onClick} aria-label={label} title={label} data-tour={tour}>
      {icon}
    </HexButton>
  );

  return (
    <header className="relative px-3 pt-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div style={{ filter: "drop-shadow(0 8px 10px rgb(var(--c-shadow) / 0.3))" }} className="shrink-0">
          <div className="hud-brand relative flex h-12 items-center gap-3 pl-6 pr-8">
            <span className="absolute inset-y-3 left-0 w-1 bg-ember" aria-hidden />
            <Logo size={26} />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold uppercase tracking-[0.3em]">SpendScope</p>
              <p className="max-w-[150px] truncate font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">Operator {user.name || user.email}</p>
            </div>
          </div>
        </div>

        {center && <div className="order-last flex basis-full justify-center md:order-none md:basis-auto">{center}</div>}

        <div style={{ filter: "drop-shadow(0 8px 12px rgb(var(--c-shadow) / 0.2))" }}>
          <div className="hud-edge">
            <div className="hud-face flex flex-wrap items-center gap-3 px-4 py-2">
              <div data-tour="currency">
                <HexSegmented label="Display currency" options={CURRENCIES} value={current} onChange={(c) => updateSettings({ currency: c }).catch(() => {})} />
              </div>
              <span className="hidden h-6 w-px bg-ink/25 sm:block" aria-hidden />
              <div className="flex items-center gap-2">
                {action("Quick add (Ctrl K)", onQuickAdd, <IconBolt className="h-4 w-4" />, "quick-add")}
                {action("Tutorial", onTour, <IconHelp className="h-4 w-4" />, "tutorial")}
                {action(dark ? "Switch to light mode" : "Switch to dark mode", toggle, dark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />, "theme")}
                {action("Settings", onSettings, <IconGear className="h-4 w-4" />, "settings")}
                {action("Log out", logout, <IconPower className="h-4 w-4" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hud-rail mt-3" aria-hidden />
    </header>
  );
}
