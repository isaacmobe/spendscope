import { useId } from "react";
import { rgb } from "../lib/tokens";
import { IconMinus, IconPlus } from "./icons";

/**
 * hx.jsx: the hexagon control kit.
 * No native-looking inputs, buttons or switches anywhere in the app: each is an elongated
 * hexagon (see the .hx rules in index.css) with depth, a glow on focus and a sheen on hover.
 * Sizes are fixed per size name, so every button of a kind has the same height and padding.
 */

const SIZES = {
  sm: { h: "h-8", text: "text-[10.5px]", pad: "px-4", c: "10px" },
  md: { h: "h-10", text: "text-xs", pad: "px-6", c: "14px" },
  lg: { h: "h-12", text: "text-[13px]", pad: "px-8", c: "16px" },
  // Square-ish icon button: same height as sm, fixed width, so icon rows line up.
  icon: { h: "h-8", text: "text-[10.5px]", pad: "w-10 px-0", c: "9px" }
};

export function HexButton({ variant = "wash", size = "md", plain = false, className = "", children, style, ...props }) {
  const s = SIZES[size];
  return (
    <button type="button" {...props} className={`hx hx--btn hx--${variant} ${className}`} style={{ "--c": s.c, ...style }}>
      <span className="hx__edge">
        <span className={`hx__face ${s.h} ${s.pad} ${s.text} font-semibold ${plain ? "" : "uppercase tracking-[0.16em]"}`}>{children}</span>
      </span>
    </button>
  );
}

// A labelled text or number field inside a hexagon frame.
export function HexField({ label, id, className = "", size = "md", ...input }) {
  const uid = useId();
  const fieldId = id || uid;
  const s = SIZES[size];
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="hx-label">
          {label}
        </label>
      )}
      <span className="hx block w-full" style={{ "--c": s.c }}>
        <span className="hx__edge">
          <span className={`hx__face ${s.h} ${size === "sm" ? "text-[13px]" : "text-sm"}`}>
            <input id={fieldId} className="hx-input" {...input} />
          </span>
        </span>
      </span>
    </div>
  );
}

// A static hexagon pill for showing a value.
export function HexPill({ variant = "wash", size = "sm", className = "", children, title }) {
  const s = SIZES[size];
  return (
    <span className={`hx hx--${variant} ${className}`} style={{ "--c": s.c }} title={title}>
      <span className="hx__edge">
        <span className={`hx__face ${s.h} px-4 ${s.text} font-semibold`}>{children}</span>
      </span>
    </span>
  );
}

// [-] value [+] control, replacing number spinners and date pickers.
export function HexStepper({ value, onChange, min = 0, max = 100, step = 1, format = String, label, className = "" }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));
  return (
    <div className={className}>
      {label && <span className="hx-label">{label}</span>}
      <div className="flex items-center gap-2">
        <HexButton size="icon" aria-label={`Decrease ${label || ""}`} onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
          <IconMinus className="h-4 w-4" />
        </HexButton>
        <HexPill size="md" className="min-w-[124px]">
          <span className="font-mono text-sm tabular-nums">{format(value)}</span>
        </HexPill>
        <HexButton size="icon" aria-label={`Increase ${label || ""}`} onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
          <IconPlus className="h-4 w-4" />
        </HexButton>
      </div>
    </div>
  );
}

// A row of equal-width hexagon buttons where exactly one is active (currency switch).
export function HexSegmented({ options, value, onChange, label, minWidth = "min-w-[64px]" }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {options.map((o) => (
        <HexButton key={o} size="sm" variant={o === value ? "solid" : "wash"} aria-pressed={o === value} className={minWidth} onClick={() => o !== value && onChange(o)}>
          {o}
        </HexButton>
      ))}
    </div>
  );
}

// Tabs: equal-width hexagon buttons in a row, one selected.
export function HexTabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5">
      {tabs.map((t) => (
        <HexButton key={t.id} size="sm" role="tab" aria-selected={t.id === value} variant={t.id === value ? "solid" : "ghost"} onClick={() => onChange(t.id)}>
          {t.label}
        </HexButton>
      ))}
    </div>
  );
}

const METER_TONES = { ok: rgb("accent"), warn: rgb("ember"), over: rgb("rose"), good: rgb("good") };

// An energy bar made of small hexagon cells that fill in one after another.
export function HexMeter({ ratio, tone = "ok", cells = 20, className = "" }) {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * cells);
  return (
    <div className={`flex gap-[3px] ${className}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, ratio) * 100)}>
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className="hexcell aspect-[1/1.12] max-w-[18px] flex-1"
          style={{
            background: i < filled ? METER_TONES[tone] : rgb("ink", 0.1),
            transition: "background 400ms",
            transitionDelay: `${i * 22}ms`,
            boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.4)"
          }}
        />
      ))}
    </div>
  );
}

// Dark title chip with angled ends, like the reference's "title" plate.
export function HexChip({ children, className = "" }) {
  return (
    <span
      className={`bar-surface inline-block px-5 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] shadow-[0_6px_10px_-4px_rgb(var(--c-shadow)/0.5)] ${className}`}
      style={{ clipPath: "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)" }}
    >
      {children}
    </span>
  );
}

// Hexagon bullet.
export function HexDot({ className = "bg-accent" }) {
  return <span className={`hexcell mt-[5px] inline-block h-2.5 w-2.5 shrink-0 ${className}`} />;
}

/**
 * HexSlab: a tall hexagon-shaped card with one soft shadow. Lighter than HexCard (no back plates),
 * used for the chart and the safe-to-spend card.
 */
export function HexSlab({ children, className = "", pc = 26, ...rest }) {
  return (
    <div className={`relative ${className}`} {...rest}>
      <div style={{ filter: "drop-shadow(0 16px 20px rgb(var(--c-shadow) / 0.16)) drop-shadow(0 2px 3px rgb(var(--c-shadow) / 0.14))" }}>
        <div className="panel-shape bg-ink/55 p-[1.5px]" style={{ "--pc": `${pc}px` }}>
          <div className="panel-shape h-full bg-gradient-to-b from-cream-light to-cream" style={{ "--pc": `${pc - 1}px` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
