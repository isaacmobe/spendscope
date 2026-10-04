import { useEffect, useState } from "react";
import { APP } from "../config/app";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useParallax } from "../hooks/useParallax";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useStageScale } from "../hooks/useStageScale";
import Circuit from "./Circuit";
import CoreHex from "./CoreHex";
import HexNode from "./HexNode";
import MonthNav from "./MonthNav";
import NodeDialog from "./NodeDialog";
import PlanPanel from "./PlanPanel";
import QuickAdd from "./QuickAdd";
import ScrollCue from "./ScrollCue";
import SettingsDialog from "./SettingsDialog";
import TopBar from "./TopBar";
import Tour from "./Tour";
import { CORE, NODES, NODE_SIZE, STAGE } from "./stage";

const readTourDone = () => {
  try {
    return localStorage.getItem(APP.storage.tour) === "1";
  } catch {
    return false;
  }
};

// True while the user is typing somewhere, so single-key shortcuts do not fire.
const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export default function Dashboard() {
  const { user, recoveryCode } = useAuth();
  const { loading, summary, addEarning, addSpending, money, isCurrent, viewDate } = useFinance();
  const [target, setTarget] = useState(null); // which popup is open: an area id, "earnings" or null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [tourManual, setTourManual] = useState(false);
  const [tourDone, setTourDone] = useState(readTourDone);
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduced = useReducedMotion();
  const [stageRef, scale] = useStageScale(STAGE.width);
  const tiltRef = useParallax(desktop && !reduced);

  // First visit: show the tutorial once, after data has loaded and any recovery code has been dealt with.
  const tourOpen = tourManual || (!loading && !tourDone && !recoveryCode);
  const closeTour = () => {
    setTourManual(false);
    setTourDone(true);
    try {
      localStorage.setItem(APP.storage.tour, "1");
    } catch {
      /* the tour simply shows again next visit */
    }
  };

  // Keyboard: Ctrl/Cmd+K opens quick add anywhere; "?" opens the tutorial when not typing.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen((v) => !v);
      } else if (e.key === "?" && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey) {
        setTourManual(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const locked = summary.income <= 0 && isCurrent; // nodes unlock once earnings exist (past months always open)
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

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
      detail = summary.goal ? `${money(summary.goal.saved)} of ${money(summary.goal.target)} saved` : "Set your motorbike goal";
      if (summary.goal?.reached) highlight = "Goal reached";
    } else if (area.id === "bills") {
      detail = `${money(area.spent)} committed monthly`;
      if (area.ratio > 1) highlight = `${money(area.spent - area.budget)} over plan`;
    } else {
      detail = `${money(area.spent)} of ${money(area.budget)}`;
      if (area.ratio > 1) highlight = `${money(area.spent - area.budget)} over`;
    }

    return (
      <HexNode
        key={area.id}
        index={i}
        pair={i % 3}
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
        delay={150 + (i % 3) * 110}
        tourId={i === 0 ? "node-first" : undefined}
        onOpen={() => setTarget(area.id)}
      />
    );
  });

  const core = <CoreHex summary={summary} onAdd={addEarning} onHistory={() => setTarget("earnings")} desktop={desktop} pos={CORE} size={CORE.size} />;

  // Move this month's unspent money into the savings goal (one entry, easy to undo).
  const sweep = () => addSpending("savings", Math.floor(summary.leftover * 100) / 100, "Unspent, moved to savings").catch(() => {});

  return (
    <div className="anim-page min-h-screen">
      <TopBar onSettings={() => setSettingsOpen(true)} onQuickAdd={() => setQuickOpen(true)} onTour={() => setTourManual(true)} />

      <div className="mt-5 px-3">
        <MonthNav />
        {!isCurrent && <p className="mt-2 text-center text-[11.5px] text-ink-soft">Viewing {monthLabel} as it ended. Entries you add here are dated at the end of that month.</p>}
      </div>

      <main className="px-3 pt-4 sm:px-6">
        {loading ? (
          <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p>
        ) : desktop ? (
          // Desktop: absolutely positioned hexagons inside a scaled design space. One rigid tilt for the
          // whole group keeps both sides mirror-symmetric.
          <div ref={stageRef} data-tour="stage" className="relative mx-auto" style={{ maxWidth: STAGE.width * 1.3, height: STAGE.height * scale }}>
            <div className="absolute left-1/2 top-0 origin-top" style={{ width: STAGE.width, height: STAGE.height, transform: `translateX(-50%) scale(${scale})` }}>
              <div style={{ perspective: "1700px" }} className="h-full w-full">
                <div ref={tiltRef} className="relative h-full w-full" style={{ transform: "rotateX(calc(var(--py, 0) * -1.8deg)) rotateY(calc(var(--px, 0) * 2.2deg))", transition: "transform 0.1s linear" }}>
                  <Circuit locked={locked} />
                  {nodes}
                  {core}
                  <ScrollCue className="absolute" style={{ left: CORE.x + CORE.size / 2 - 28, top: 664 }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mobile: core first, then the six areas in a two-column grid.
          <div data-tour="stage" className="space-y-10">
            {core}
            <div className="mb-6 grid grid-cols-2 gap-x-3 gap-y-10">{nodes}</div>
            <div className="flex justify-center">
              <ScrollCue />
            </div>
          </div>
        )}
      </main>

      {!loading && <PlanPanel summary={summary} allocation={user.settings.allocation} money={money} monthLabel={monthLabel} onOpenGoal={() => setTarget("savings")} onSweep={sweep} />}

      <p className="pointer-events-none fixed bottom-3 left-4 hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-ink/45 lg:flex">
        <span className="hexcell anim-pulse-soft h-2 w-2 bg-accent" /> Link status: normal
      </p>

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onTour={() => setTourManual(true)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Tour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
