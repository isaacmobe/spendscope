import { useId } from "react";
import HexCard from "./HexCard";
import { HEX_PATH } from "./hexGeometry";
import { HexButton, HexChip, HexDot, HexPill } from "./hx";
import { IconBan, IconCheck, IconCoin, IconHome, IconSpark } from "./icons";
import { formatMoney } from "../lib/money";

const DOT = { warn: "bg-ember", good: "bg-[#7b9e8a]", info: "bg-accent" };

// One of the three plan tiles: a small hexagon with an icon, its share of earnings and how much is used.
function PlanTile({ icon, label, percent, pool, used, currency, kind, delay }) {
  const uid = useId().replace(/:/g, "");
  const Icon = icon;
  const ratio = pool > 0 ? used / pool : 0;
  const over = kind !== "savings" && ratio > 1;
  const color = over ? "#e9a29b" : kind === "savings" ? "#7b9e8a" : "#5e62c4";

  return (
    <div className="anim-rise flex w-[150px] flex-col items-center" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative w-[96px]">
        <svg viewBox="0 0 100 115.47" className="w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`t-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fdfbf6" />
              <stop offset="1" stopColor="#ebe7db" />
            </linearGradient>
            <clipPath id={`c-${uid}`}>
              <path d={HEX_PATH} />
            </clipPath>
          </defs>
          <ellipse cx="50" cy="123" rx="30" ry="4" fill="rgba(42,42,49,0.18)" style={{ filter: "blur(3px)" }} />
          <path d={HEX_PATH} fill={`url(#t-${uid})`} />
          <g clipPath={`url(#c-${uid})`}>
            <rect x="0" y="0" width="100" height="115.47" fill={color} opacity="0.25" style={{ transform: `translateY(${(1 - Math.min(1, ratio)) * 115.47}px)`, transition: "transform 1100ms cubic-bezier(0.2,0.8,0.2,1)" }} />
            {/* Corner flag, like the item slots in the reference. */}
            <path d="M0 115.47 L0 92 L23 115.47 Z" fill={color} opacity="0.8" />
          </g>
          <path d={HEX_PATH} fill="none" stroke="#2a2a31" strokeOpacity="0.75" strokeWidth="1" />
          <path d={HEX_PATH} fill="none" stroke="#2a2a31" strokeOpacity="0.22" strokeWidth="0.5" transform="translate(6.5 7.5) scale(0.87)" />
        </svg>
        <Icon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-ink/80" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.26em]">
        {label} <span className="font-mono font-normal text-ink-soft">{percent}%</span>
      </p>
      <p className="mt-1 font-mono text-[15px] font-semibold">{formatMoney(pool, currency)}</p>
      <HexPill variant={over ? "rose" : "wash"} size="sm" className="mt-2">
        <span className="font-mono">{Math.round(ratio * 100)}%</span>
        <span className="ml-1 text-[10px] font-medium uppercase tracking-wider opacity-70">{kind === "savings" ? "saved" : "used"}</span>
      </HexPill>
      <p className="mt-1.5 font-mono text-[10.5px] text-ink-soft">
        {kind === "savings" ? "Saved" : "Used"} {formatMoney(used, currency)}
      </p>
    </div>
  );
}

/**
 * PlanPanel
 * ---------
 * The "how to distribute your earnings" part, styled like the reference's cost section:
 * a title chip, three item tiles (needs, wants, savings), a wide status bar with the motorbike
 * projection, key figures, and plain-language advice.
 */
export default function PlanPanel({ summary, allocation, onOpenGoal, onSweep }) {
  const { currency, pools, groupSpent, goal, insights, leftover, income, spendable, level, emergencyTarget, emergencyMonths, daysLeft } = summary;

  // Status bar text and colour (rose when behind, indigo when fine, ink when waiting for input).
  let status = "Set your motorbike goal to see your ETA";
  let variant = "solid";
  let Icon = IconBan;
  if (goal) {
    if (goal.reached) {
      status = `Goal reached: you can buy your ${goal.name}`;
      variant = "accent";
      Icon = IconCheck;
    } else if (goal.monthsToGo == null) {
      status = "Add earnings and a savings share to project your ETA";
      variant = "rose";
    } else if (goal.onTrack === false) {
      status = `Behind pace: needs ${formatMoney(goal.required, currency)} a month, plan saves ${formatMoney(pools.savings, currency)}`;
      variant = "rose";
    } else {
      status = `${goal.name} ETA ${goal.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })} (${goal.monthsToGo} month${goal.monthsToGo === 1 ? "" : "s"})`;
      variant = "accent";
      Icon = IconCheck;
    }
  }

  const canSweep = goal && !goal.reached && leftover > 0 && daysLeft <= 7;

  return (
    <section aria-label="Plan" className="mx-auto mt-2 max-w-4xl px-4 pb-24">
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink/20" />
        <HexChip>This month's plan</HexChip>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink/20" />
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
        <PlanTile icon={IconHome} label="Needs" percent={allocation.needs} pool={pools.needs} used={groupSpent.needs} currency={currency} kind="needs" delay={80} />
        <PlanTile icon={IconSpark} label="Wants" percent={allocation.wants} pool={pools.wants} used={groupSpent.wants} currency={currency} kind="wants" delay={180} />
        <PlanTile icon={IconCoin} label="Savings" percent={allocation.savings} pool={pools.savings} used={groupSpent.savings} currency={currency} kind="savings" delay={280} />
      </div>

      <button type="button" onClick={onOpenGoal} className={`hx hx--btn hx--${variant} mt-8 block w-full`} style={{ "--c": "28px" }}>
        <span className="hx__edge">
          <span className="hx__face min-h-[54px] gap-3 px-12 text-center text-[13.5px] font-semibold">
            <Icon className="h-5 w-5 shrink-0" />
            {status}
          </span>
        </span>
      </button>

      {income > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <HexPill size="md">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Spendable after saving</span>
            <span className="ml-2 font-mono">{formatMoney(spendable, currency)}</span>
          </HexPill>
          <HexPill size="md" variant={leftover < 0 ? "rose" : "wash"}>
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">Left this month</span>
            <span className="ml-2 font-mono">{formatMoney(leftover, currency)}</span>
          </HexPill>
          <HexPill size="md">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Saver level</span>
            <span className="ml-2 font-mono">{level} / 5</span>
          </HexPill>
          <HexPill size="md">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Safety net ({emergencyMonths} mo)</span>
            <span className="ml-2 font-mono">{formatMoney(emergencyTarget, currency)}</span>
          </HexPill>
        </div>
      )}

      {canSweep && (
        <div className="mt-6 flex justify-center">
          <HexButton variant="accent" size="lg" onClick={onSweep}>
            Move {formatMoney(leftover, currency)} to savings
          </HexButton>
        </div>
      )}

      {insights.length > 0 && (
        <div className="mt-10 flex justify-center">
          <HexCard className="w-full max-w-[640px]">
            <ul className="space-y-3 px-14 py-7 text-[13.5px] leading-relaxed">
              {insights.map((item) => (
                <li key={item.text} className="flex gap-3">
                  <HexDot className={DOT[item.tone]} />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </HexCard>
        </div>
      )}
    </section>
  );
}
