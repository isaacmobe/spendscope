import { useId } from "react";
import HexCard from "./HexCard";
import { HEX_PATH } from "./hexGeometry";
import { HexButton, HexChip, HexDot, HexPill } from "./hx";
import { IconBan, IconCheck, IconCoin, IconHome, IconSpark } from "./icons";
import SafeToSpend from "./SafeToSpend";
import TrendChart from "./TrendChart";
import { rgb } from "../lib/tokens";

const DOT = { warn: "bg-ember", good: "bg-good", info: "bg-accent" };

// One of the three plan tiles: a small hexagon with an icon, its share of earnings and how much is used.
function PlanTile({ icon, label, percent, pool, used, kind, delay, money }) {
  const uid = useId().replace(/:/g, "");
  const Icon = icon;
  const ratio = pool > 0 ? used / pool : 0;
  const over = kind !== "savings" && ratio > 1;
  const color = over ? rgb("rose") : kind === "savings" ? rgb("good") : rgb("accent");

  return (
    <div className="anim-rise flex w-full min-w-0 max-w-[150px] flex-col items-center" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative w-full max-w-[96px]">
        <svg viewBox="0 0 100 115.47" className="w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`t-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="svg-face-stop-top" />
              <stop offset="1" className="svg-face-stop-bot" />
            </linearGradient>
            <clipPath id={`c-${uid}`}>
              <path d={HEX_PATH} />
            </clipPath>
          </defs>
          <ellipse cx="50" cy="123" rx="30" ry="4" style={{ fill: rgb("shadow", 0.2), filter: "blur(3px)" }} />
          <path d={HEX_PATH} fill={`url(#t-${uid})`} />
          <g clipPath={`url(#c-${uid})`}>
            <rect x="0" y="0" width="100" height="115.47" style={{ fill: color, opacity: 0.25, transform: `translateY(${(1 - Math.min(1, ratio)) * 115.47}px)`, transition: "transform 1100ms cubic-bezier(0.2,0.8,0.2,1)" }} />
            {/* Corner flag, like the item slots in the reference. */}
            <path d="M0 115.47 L0 92 L23 115.47 Z" style={{ fill: color, opacity: 0.8 }} />
          </g>
          <path d={HEX_PATH} fill="none" className="svg-ink" strokeWidth="1" />
          <path d={HEX_PATH} fill="none" className="svg-ink-soft" strokeWidth="0.5" transform="translate(6.5 7.5) scale(0.87)" />
        </svg>
        <Icon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-ink/80" />
      </div>
      <p className="mt-3 text-center text-[9.5px] font-semibold uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.26em]">
        {label} <span className="font-mono font-normal text-ink-soft">{percent}%</span>
      </p>
      <p className="mt-1 max-w-full truncate font-mono text-[13px] font-semibold sm:text-[15px]">{money(pool)}</p>
      <HexPill variant={over ? "rose" : "wash"} size="sm" className="mt-2 w-full max-w-[120px]">
        <span className="font-mono">{Math.round(ratio * 100)}%</span>
        <span className="ml-1 text-[10px] font-medium uppercase tracking-wider opacity-70">{kind === "savings" ? "saved" : "used"}</span>
      </HexPill>
      <p className="mt-1.5 max-w-full truncate font-mono text-[10px] text-ink-soft sm:text-[10.5px]">
        {kind === "savings" ? "Saved" : "Used"} {money(used)}
      </p>
    </div>
  );
}

// A key figure: label above, value below, in an equal-width hexagon cell.
function StatCell({ label, value, variant = "wash", title }) {
  return (
    <HexPill variant={variant} size="lg" className="block w-full" title={title}>
      <span className="flex flex-col items-center leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-65">{label}</span>
        <span className="mt-0.5 font-mono text-[13px]">{value}</span>
      </span>
    </HexPill>
  );
}

/**
 * PlanPanel
 * ---------
 * The "how to distribute your earnings" part, styled like the reference's cost section:
 * a title chip, three item tiles (needs, wants, savings), a wide status bar with the motorbike
 * projection, key figures in equal cells, the spending-pace chart with safe-to-spend, and
 * plain-language advice.
 */
export default function PlanPanel({ summary, allocation, money, onOpenGoal, onSweep, monthLabel }) {
  const { pools, groupSpent, goal, insights, leftover, income, spendable, level, maxLevel, emergencyTarget, emergencyMonths, daysLeft, isCurrent } = summary;

  // Status bar text and colour (rose when behind, indigo when fine, ink when waiting for input).
  let status = "Set your motorbike goal to see your ETA";
  let variant = "solid";
  let Icon = IconBan;
  if (goal) {
    if (goal.reached) {
      status = `Goal reached: you can buy your ${goal.name}`;
      variant = "accent";
      Icon = IconCheck;
    } else if (!isCurrent) {
      status = `${goal.name}: ${money(goal.saved)} of ${money(goal.target)} saved by the end of this month`;
    } else if (goal.monthsToGo == null) {
      status = "Add earnings and a savings share to project your ETA";
      variant = "rose";
    } else if (goal.onTrack === false) {
      status = `Behind pace: needs ${money(goal.required)} a month, plan saves ${money(pools.savings)}`;
      variant = "rose";
    } else {
      status = `${goal.name} ETA ${goal.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })} (${goal.monthsToGo} month${goal.monthsToGo === 1 ? "" : "s"})`;
      variant = "accent";
      Icon = IconCheck;
    }
  }

  const canSweep = isCurrent && goal && !goal.reached && leftover > 0 && daysLeft <= 7;

  return (
    <section id="plan" aria-label="Plan" className="mx-auto mt-2 max-w-4xl scroll-mt-6 px-4 pb-24">
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink/20" />
        <HexChip>{isCurrent ? "This month's plan" : `${monthLabel} plan`}</HexChip>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink/20" />
      </div>

      <div data-tour="tiles" className="mx-auto grid max-w-[560px] grid-cols-3 justify-items-center gap-x-4 sm:gap-x-10">
        <PlanTile icon={IconHome} label="Needs" percent={allocation.needs} pool={pools.needs} used={groupSpent.needs} kind="needs" delay={80} money={money} />
        <PlanTile icon={IconSpark} label="Wants" percent={allocation.wants} pool={pools.wants} used={groupSpent.wants} kind="wants" delay={180} money={money} />
        <PlanTile icon={IconCoin} label="Savings" percent={allocation.savings} pool={pools.savings} used={groupSpent.savings} kind="savings" delay={280} money={money} />
      </div>

      <button type="button" data-tour="status" onClick={onOpenGoal} className={`hx hx--btn hx--${variant} mt-8 block w-full`} style={{ "--c": "28px" }}>
        <span className="hx__edge">
          <span className="hx__face min-h-[54px] gap-3 px-12 py-1 text-center text-[13.5px] font-semibold">
            <Icon className="h-5 w-5 shrink-0" />
            {status}
          </span>
        </span>
      </button>

      {income > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCell label="After saving" value={money(spendable)} title="Earnings minus the savings you set aside first" />
          <StatCell label="Left this month" value={money(leftover)} variant={leftover < 0 ? "rose" : "wash"} title="Earnings minus spending and saving so far" />
          <StatCell label="Saver level" value={`${level} / ${maxLevel}`} title="Based on the share of earnings you saved" />
          <StatCell label={`Safety net, ${emergencyMonths} mo`} value={money(emergencyTarget)} title="Months of planned essentials to keep aside for emergencies" />
        </div>
      )}

      {/* Spending pace and safe-to-spend, equal columns. */}
      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
        <TrendChart summary={summary} money={money} />
        <SafeToSpend summary={summary} money={money} />
      </div>

      {canSweep && (
        <div className="mt-8 flex justify-center">
          <HexButton variant="accent" size="lg" onClick={onSweep}>
            Move {money(leftover)} to savings
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
