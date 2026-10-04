import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useParallax } from "../hooks/useParallax";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useStageScale } from "../hooks/useStageScale";
import { formatMoney } from "../lib/money";
import Circuit from "./Circuit";
import CoreHex from "./CoreHex";
import HexNode from "./HexNode";
import NodeDialog from "./NodeDialog";
import PlanPanel from "./PlanPanel";
import SettingsDialog from "./SettingsDialog";
import TopBar from "./TopBar";
import { CORE, NODES, NODE_SIZE, STAGE } from "./stage";

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, error, clearError, summary, addEarning, addSpending } = useFinance();
  const [target, setTarget] = useState(null); // which popup is open: an area id, "earnings" or null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduced = useReducedMotion();
  const [stageRef, scale] = useStageScale(STAGE.width);
  const tiltRef = useParallax(desktop && !reduced);

  // Error banner disappears by itself after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 6000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const locked = summary.income <= 0; // nodes unlock once earnings exist
  const { currency } = summary;

  // Build the six nodes from the summary. Savings shows goal progress; others show budget use.
  const nodes = NODES.map((n, i) => {
    const area = summary.areas.find((a) => a.id === n.id);
    const isSavings = area.id === "savings";
    const fill = isSavings ? (summary.goal ? summary.goal.progress : 0) : Math.min(1, area.ratio);
    const tone = isSavings ? "good" : area.ratio > 1 ? "over" : area.ratio > 0.85 ? "warn" : "ok";

    let detail;
    let highlight = "";
    if (locked) {
      detail = "Locked. Record your earnings in the core first.";
    } else if (isSavings) {
      detail = summary.goal
        ? `${formatMoney(summary.goal.saved, currency)} of ${formatMoney(summary.goal.target, currency)} saved`
        : "Set your motorbike goal";
      if (summary.goal?.reached) highlight = "Goal reached";
    } else if (area.id === "bills") {
      detail = `${formatMoney(area.spent, currency)} committed monthly`;
      if (area.ratio > 1) highlight = `${formatMoney(area.spent - area.budget, currency)} over plan`;
    } else {
      detail = `${formatMoney(area.spent, currency)} of ${formatMoney(area.budget, currency)}`;
      if (area.ratio > 1) highlight = `${formatMoney(area.spent - area.budget, currency)} over`;
    }

    return (
      <HexNode
        key={area.id}
        index={i}
        name={area.label}
        side={n.side}
        locked={locked}
        fill={fill}
        tone={tone}
        detail={detail}
        highlight={highlight}
        selected={target === area.id}
        desktop={desktop}
        pos={n.pos}
        size={NODE_SIZE}
        delay={150 + i * 100}
        onOpen={() => setTarget(area.id)}
      />
    );
  });

  const core = <CoreHex summary={summary} onAdd={addEarning} onHistory={() => setTarget("earnings")} desktop={desktop} pos={CORE} size={CORE.size} />;

  // Move this month's unspent money into the savings goal (one entry, easy to delete).
  const sweep = () => addSpending("savings", Math.floor(summary.leftover * 100) / 100, "Unspent, moved to savings").catch(() => {});

  return (
    <div className="min-h-screen">
      <TopBar onSettings={() => setSettingsOpen(true)} />

      {error && (
        <div role="alert" className="hx hx--rose mx-auto mt-4 block max-w-3xl" style={{ "--c": "20px" }}>
          <span className="hx__edge">
            <span className="hx__face justify-between gap-3 px-9 py-2 text-[13px] font-medium">
              <span>{error}</span>
              <button type="button" onClick={clearError} aria-label="Dismiss" className="text-lg leading-none">
                &times;
              </button>
            </span>
          </span>
        </div>
      )}

      <main className="px-3 pt-6 sm:px-6">
        {loading ? (
          <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p>
        ) : desktop ? (
          // Desktop: absolutely positioned hexagons inside a scaled design space with layered parallax.
          <div ref={stageRef} className="relative mx-auto" style={{ maxWidth: STAGE.width, height: STAGE.height * scale }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}>
              <div ref={tiltRef} className="relative h-full w-full">
                <Circuit locked={locked} />
                {nodes}
                {core}
              </div>
            </div>
          </div>
        ) : (
          // Mobile: core first, then the six areas in a two-column grid.
          <div className="space-y-10">
            {core}
            <div className="mb-10 grid grid-cols-2 gap-x-3 gap-y-10">{nodes}</div>
          </div>
        )}
      </main>

      {!loading && <PlanPanel summary={summary} allocation={user.settings.allocation} onOpenGoal={() => setTarget("savings")} onSweep={sweep} />}

      <p className="pointer-events-none fixed bottom-3 left-4 hidden items-center lg:flex gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-ink/45">
        <span className="hexcell anim-pulse-soft h-2 w-2 bg-accent" /> Link status: normal
      </p>

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
