import { useTheme } from "../context/theme";
import { useAuth } from "../context/auth";
import { CURRENCIES } from "../lib/money";
import { HexButton, HexSegmented } from "./hx";
import { IconBolt, IconGear, IconHelp, IconMoon, IconPower, IconSun } from "./icons";
import Logo from "./Logo";

const arrowEnd = "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%)";

/**
 * TopBar
 * ------
 * Like the reference: a dark arrow-ended brand bar on the left (with the orange notch and the
 * black-hexagon logo) and a long pale striped bar holding the controls. Every action is the same
 * icon-sized hexagon so the row is even; names live in tooltips and screen-reader labels.
 * On phones it wraps into two rows: brand + actions, then the currency switch.
 */
export default function TopBar({ onSettings, onQuickAdd, onTour }) {
  const { user, updateSettings, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const current = user.settings.currency;

  const action = (label, onClick, icon, tour) => (
    <HexButton size="icon" onClick={onClick} aria-label={label} title={label} data-tour={tour}>
      {icon}
    </HexButton>
  );

  return (
    <header className="px-3 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-y-3 md:flex-nowrap">
        <div style={{ filter: "drop-shadow(0 8px 10px rgb(var(--c-shadow) / 0.25))" }} className="relative z-10 shrink-0">
          <div className="bar-surface relative flex h-12 items-center gap-3 pl-5 pr-9" style={{ clipPath: arrowEnd }}>
            <span className="absolute inset-y-0 left-0 w-1.5 bg-ember" aria-hidden />
            <Logo size={26} />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold uppercase tracking-[0.3em]">SpendScope</p>
              <p className="hidden font-mono text-[9px] uppercase tracking-[0.2em] opacity-55 sm:block">Link status: normal</p>
            </div>
          </div>
        </div>

        <div className="stripe-bar">
          <span className="mr-auto hidden max-w-[170px] truncate pl-1 text-[13px] text-ink-soft lg:block">{user.name || user.email}</span>
          <div className="order-last flex basis-full justify-center md:order-none md:basis-auto" data-tour="currency">
            <HexSegmented label="Display currency" options={CURRENCIES} value={current} onChange={(c) => updateSettings({ currency: c }).catch(() => {})} />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {action("Quick add (Ctrl K)", onQuickAdd, <IconBolt className="h-4 w-4" />, "quick-add")}
            {action("Tutorial", onTour, <IconHelp className="h-4 w-4" />, "tutorial")}
            {action(dark ? "Switch to light mode" : "Switch to dark mode", toggle, dark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />, "theme")}
            {action("Settings", onSettings, <IconGear className="h-4 w-4" />, "settings")}
            {action("Log out", logout, <IconPower className="h-4 w-4" />)}
          </div>
        </div>
      </div>
    </header>
  );
}
