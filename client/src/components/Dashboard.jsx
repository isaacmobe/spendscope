import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useStageScale } from "../hooks/useStageScale";
import { formatMoney } from "../lib/money";
import CoreHex from "./CoreHex";
import HexNode from "./HexNode";
import NodeDialog from "./NodeDialog";
import PlanPanel from "./PlanPanel";
import SettingsDialog from "./SettingsDialog";
import TopBar from "./TopBar";

// Desktop stage: a fixed 1100 x 660 design space that scales down to fit narrower screens.
const STAGE = { width: 1100, height: 660 };
const CORE = { x: 400, y: 160, size: 300 };
const NODE_SIZE = 150;
// Three nodes down each side of the core, mirroring the reference console.
const NODES = [
  { id: "housing", side: "left", pos: { x: 330, y: 20 } },
  { id: "food", side: "left", pos: { x: 250, y: 245 } },
  { id: "transport", side: "left", pos: { x: 330, y: 470 } },
  { id: "bills", side: "right", pos: { x: 620, y: 20 } },
  { id: "lifestyle", side: "right", pos: { x: 700, y: 245 } },
  { id: "savings", side: "right", pos: { x: 620, y: 470 } }
];

// Centre of a node, used to draw the connector lines from the core.
const center = (pos, size) => ({ x: pos.x + size / 2, y: pos.y + (size * 1.1547) / 2 });

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, error, clearError, summary, addEarning } = useFinance();
  const [target, setTarget] = useState(null); // which dialog is open: an area id, "earnings" or null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 768px)");
  const [stageRef, scale] = useStageScale(STAGE.width);

  // Error banner disappears by itself after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 6000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const locked = summary.income <= 0; // nodes unlock once earnings exist
  const { currency } = summary;
  const coreCenter = center(CORE, CORE.size);

  // Build the six nodes from the summary. Savings shows goal progress; others show budget use.
  const nodes = NODES.map((n, i) => {
    const area = summary.areas.find((a) => a.id === n.id);
    const isSavings = area.id === "savings";
    const fill = isSavings ? (summary.goal ? summary.goal.progress : 0) : Math.min(1, area.ratio);
    const tone = !isSavings && area.ratio > 1 ? "over" : !isSavings && area.ratio > 0.85 ? "warn" : "ok";

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
        desktop={desktop}
        pos={n.pos}
        size={NODE_SIZE}
        delay={120 + i * 90}
        onOpen={() => setTarget(area.id)}
      />
    );
  });

  const core = (
    <CoreHex summary={summary} onAdd={addEarning} onHistory={() => setTarget("earnings")} desktop={desktop} pos={CORE} size={CORE.size} />
  );

  return (
    <div className="min-h-screen">
      <TopBar onSettings={() => setSettingsOpen(true)} />

      {error && (
        <div role="alert" className="mx-auto mt-3 flex max-w-3xl items-center justify-between gap-3 bg-salmon px-4 py-2 text-sm font-medium text-ink">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss" className="text-lg leading-none">&times;</button>
        </div>
      )}

      <main className="px-3 pt-6 sm:px-6">
        {loading ? (
          <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p>
        ) : desktop ? (
          // Desktop: absolutely positioned hexagons inside a scaled design space.
          <div ref={stageRef} className="relative mx-auto" style={{ maxWidth: STAGE.width, height: STAGE.height * scale }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}>
              {/* Connector lines from the core to every node; dashes flow once unlocked. */}
              <svg className="pointer-events-none absolute inset-0" width={STAGE.width} height={STAGE.height} aria-hidden="true">
                {NODES.map((n) => {
                  const c = center(n.pos, NODE_SIZE);
                  return (
                    <line
                      key={n.id}
                      x1={coreCenter.x}
                      y1={coreCenter.y}
                      x2={c.x}
                      y2={c.y}
                      stroke={locked ? "#C9C8C2" : "#5558C8"}
                      strokeOpacity={locked ? 1 : 0.55}
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                      className={locked ? "" : "animate-flow"}
                    />
                  );
                })}
              </svg>
              {nodes}
              {core}
            </div>
          </div>
        ) : (
          // Mobile: core first, then the six areas in a two-column grid.
          <div className="space-y-8">
            {core}
            <div className="grid grid-cols-2 gap-x-3 gap-y-8">{nodes}</div>
          </div>
        )}
      </main>

      {!loading && (
        <PlanPanel summary={summary} allocation={user.settings.allocation} onOpenGoal={() => setTarget("savings")} />
      )}

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

