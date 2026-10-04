import { CELL_INFO } from "../config/cells";
import { useFinance } from "../context/finance";
import { AREAS } from "../lib/areas";
import { HexButton, HexDot, HexMeter } from "./hx";
import Modal from "./Modal";
import SafeToSpend from "./SafeToSpend";
import TrendChart from "./TrendChart";

const DOT = { warn: "bg-ember", good: "bg-good", info: "bg-accent" };
const GROUP_OF = { needs: "needs", wants: "wants", pool: "savings" };
const toneFor = (ratio) => (ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "ok");

// One labelled figure: label above, value below.
function Figure({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-[15px] font-semibold">{value}</p>
    </div>
  );
}

// The areas that make up one share of earnings, each with its own meter.
function GroupBreakdown({ group, summary, money }) {
  const areas = AREAS.filter((a) => a.group === group);
  const pool = summary.pools[group];
  return (
    <ul className="space-y-4">
      {areas.map((a) => {
        const row = summary.areas.find((x) => x.id === a.id);
        const budget = row.budget;
        const ratio = budget > 0 ? row.spent / budget : 0;
        return (
          <li key={a.id}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium">{a.label}</span>
              <span className="font-mono text-ink-soft">
                {money(row.spent)} of {money(budget)}
              </span>
            </div>
            <HexMeter ratio={ratio} tone={group === "savings" ? "good" : toneFor(ratio)} cells={22} className="mt-1.5" />
          </li>
        );
      })}
      <li className="border-t border-ink/15 pt-3 text-[12.5px] text-ink-soft">
        Share total {money(pool)}, {money(summary.groupSpent[group])} used.
      </li>
    </ul>
  );
}

/**
 * InfoDialog
 * ----------
 * The popup behind each information hexagon. It first explains, in plain words, how the number
 * is calculated (text from config/cells.js), then shows the detail that belongs to that cell.
 *   id:      a cell id from CELL_INFO, or null when closed
 *   onSweep: moves this month's unspent money into savings (shown inside the Advice popup)
 */
export default function InfoDialog({ id, onClose, onSweep }) {
  const { summary, money } = useFinance();
  const info = id ? CELL_INFO[id] : null;
  const { leftover, income, spendable, level, maxLevel, emergencyTarget, emergencyMonths, insights, goal, isCurrent, daysLeft, savingsRate, pools } = summary;

  let body = null;
  if (id === "safe") body = <SafeToSpend summary={summary} money={money} bare />;
  else if (id === "pace") body = <TrendChart summary={summary} money={money} bare />;
  else if (GROUP_OF[id]) body = <GroupBreakdown group={GROUP_OF[id]} summary={summary} money={money} />;
  else if (id === "after") {
    body = (
      <div className="grid grid-cols-3 gap-3">
        <Figure label="Earned" value={money(income)} />
        <Figure label="Savings set aside" value={money(pools.savings)} />
        <Figure label="To live on" value={money(spendable)} />
      </div>
    );
  } else if (id === "left") {
    body = (
      <div className="grid grid-cols-2 gap-3">
        <Figure label="Left" value={money(leftover)} />
        <Figure label="Earned" value={money(income)} />
      </div>
    );
  } else if (id === "level") {
    body = (
      <div className="space-y-3">
        <HexMeter ratio={level / maxLevel} tone="good" cells={maxLevel} />
        <p className="text-center font-mono text-[15px] font-semibold">
          Level {level} of {maxLevel}, {Math.round(savingsRate * 100)}% of earnings saved
        </p>
      </div>
    );
  } else if (id === "net") {
    body = (
      <div className="grid grid-cols-2 gap-3">
        <Figure label={`Target, ${emergencyMonths} month${emergencyMonths === 1 ? "" : "s"}`} value={money(emergencyTarget)} />
        <Figure label="Needs per month" value={money(pools.needs)} />
      </div>
    );
  } else if (id === "advice") {
    const canSweep = isCurrent && goal && !goal.reached && leftover > 0 && daysLeft <= 7;
    body = (
      <div className="space-y-5">
        {insights.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing to flag yet. Add earnings and some spending to get advice.</p>
        ) : (
          <ul className="space-y-3 text-[13.5px] leading-relaxed">
            {insights.map((item) => (
              <li key={item.text} className="flex gap-3">
                <HexDot className={DOT[item.tone]} />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
        {canSweep && (
          <div className="flex justify-center">
            <HexButton
              variant="accent"
              size="lg"
              onClick={() => {
                onSweep();
                onClose();
              }}
            >
              Move {money(leftover)} to savings
            </HexButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal open={Boolean(id)} onClose={onClose} title={info?.title || ""} subtitle="How this number works">
      <p className="mb-5 text-[13.5px] leading-relaxed text-ink-soft">{info?.explain}</p>
      {body}
    </Modal>
  );
}
