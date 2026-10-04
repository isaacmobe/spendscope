import { useEffect, useMemo, useState } from "react";
import { APP } from "../config/app";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { layerShift, useParallax } from "../hooks/useParallax";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useStageFit } from "../hooks/useStageFit";
import { buildCells } from "../lib/cells";
import { formatMoneyFit } from "../lib/money";
import Circuit from "./Circuit";
import CoreHex from "./CoreHex";
import HexCell from "./HexCell";
import { hexHeight } from "./hexGeometry";
import { IconBan, IconCheck } from "./icons";
import InfoDialog from "./InfoDialog";
import MonthNav from "./MonthNav";
import NodeDialog from "./NodeDialog";
import QuickAdd from "./QuickAdd";
import SettingsDialog from "./SettingsDialog";
import TopBar from "./TopBar";
import Tour from "./Tour";
import { CORE_W, RING1, RING1_W, RING2, RING2_W, STAGE, at, pairOf } from "./stage";

const ICONS = { ban: IconBan, check: IconCheck };

const readTourDone = () => {
  try {
    return localStorage.getItem(APP.storage.tour) === "1";
  } catch {
    return false;
  }
};

// True while the user is typing somewhere, so single-key shortcuts do not fire.
const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

/**
 * Honeycomb rows for narrow screens: rows alternate between `wide` and `wide - 1` cells, and each
 * row tucks into the one above, so the cells interlock like a real honeycomb.
 */
function Honeycomb({ items, size, wide }) {
  const rows = [];
  for (let i = 0, r = 0; i < items.length; r++) {
    const n = r % 2 === 0 ? wide : wide - 1;
    rows.push(items.slice(i, i + n));
    i += n;
  }
  const overlap = hexHeight(size) * 0.25 - 6;
  return (
    <div className="flex flex-col items-center">
      {rows.map((row, r) => (
        <div key={r} className="flex justify-center gap-[6px]" style={{ marginTop: r === 0 ? 0 : -overlap }}>
          {row}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { recoveryCode } = useAuth();
  const { loading, summary, addEarning, addSpending, isCurrent, viewDate } = useFinance();
  const [target, setTarget] = useState(null); // an area id, "earnings" or null: which input popup is open
  const [info, setInfo] = useState(null); // a cell id or null: which explanation popup is open
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [tourManual, setTourManual] = useState(false);
  const [tourDone, setTourDone] = useState(readTourDone);
  const desktop = useMediaQuery("(min-width: 1100px)");
  const phone = useMediaQuery("(max-width: 559px)");
  const reduced = useReducedMotion();
  const [stageRef, scale] = useStageFit(STAGE.width, STAGE.height);
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

  const locked = summary.income <= 0 && isCurrent; // areas unlock once earnings exist (past months always open)
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = useMemo(() => buildCells(summary), [summary]);
  const cellById = useMemo(() => Object.fromEntries(cells.map((c) => [c.id, c])), [cells]);

  // Move this month's unspent money into the savings goal (one entry, easy to undo).
  const sweep = () => addSpending("savings", Math.floor(summary.leftover * 100) / 100, "Unspent, moved to savings").catch(() => {});

  // What each information cell does when clicked: the goal and quick-add reuse existing popups.
  const openCell = (id) => {
    if (id === "goal") setTarget("savings");
    else if (id === "quick") setQuickOpen(true);
    else setInfo(id);
  };

  // The six spending areas: number, name, amount used and a liquid level for how much of the share is used.
  const areaCells = (size) =>
    RING1.map((n, i) => {
      const area = summary.areas.find((a) => a.id === n.id);
      const isSavings = area.id === "savings";
      const ratio = Math.min(1, area.ratio);
      const tone = isSavings ? "good" : area.ratio > 1 ? "over" : area.ratio > 0.85 ? "warn" : "ok";
      const caption = isSavings ? (summary.goal ? `${Math.round(summary.goal.progress * 100)}% of goal` : "set a goal") : area.id === "bills" ? "per month" : `of ${formatMoneyFit(area.budget, summary.currency)}`;
      return {
        key: n.id,
        node: n,
        props: {
          size,
          kicker: String(i + 1).padStart(2, "0"),
          title: area.label,
          value: formatMoneyFit(area.spent, summary.currency),
          caption,
          tone,
          level: isSavings ? (summary.goal ? summary.goal.progress : 0) : ratio,
          locked,
          selected: target === area.id,
          onOpen: () => setTarget(area.id),
          label: `${area.label}: ${area.hint}`,
          tourId: i === 0 ? "node-first" : undefined
        }
      };
    });

  const infoProps = (id, size) => {
    const c = cellById[id];
    return {
      size,
      kicker: c.kicker,
      value: c.value,
      caption: c.caption,
      tone: c.tone,
      level: c.level,
      icon: c.icon ? ICONS[c.icon] : undefined,
      spark: c.spark,
      sparkMax: c.sparkMax,
      selected: info === id || (id === "goal" && target === "savings"),
      onOpen: () => openCell(id),
      label: c.info.title,
      tourId: `cell-${id}`
    };
  };

  // Desktop: every cell is placed at a fixed spot of the design space, mirrored left and right.
  const desktopStage = (
    <div ref={stageRef} data-tour="stage" className="relative mx-auto w-full" style={{ maxWidth: STAGE.width * 1.25, height: STAGE.height * scale }}>
      <div className="absolute left-1/2 top-0 origin-top" style={{ width: STAGE.width, height: STAGE.height, transform: `translateX(-50%) scale(${scale})` }}>
        <div style={{ perspective: "1700px" }} className="h-full w-full">
          <div ref={tiltRef} className="relative h-full w-full" style={{ transform: "rotateX(calc(var(--py, 0) * -1.6deg)) rotateY(calc(var(--px, 0) * 2deg))", transition: "transform 0.1s linear" }}>
            <div className="absolute inset-0" style={layerShift(-4, -3)}>
              <Circuit locked={locked} />
            </div>
            <div className="absolute inset-0" style={layerShift(5, 4)}>
              {RING2.map((n, i) => (
                <HexCell key={n.id} {...infoProps(n.id, RING2_W)} absolute center={at(n.dx, n.dy)} pair={pairOf(n.dy)} delay={250 + i * 40} />
              ))}
              {areaCells(RING1_W).map(({ key, node, props }, i) => (
                <HexCell key={key} {...props} absolute center={at(node.dx, node.dy)} port={node.port} pair={pairOf(node.dy)} delay={120 + i * 60} />
              ))}
            </div>
            <CoreHex summary={summary} onAdd={addEarning} onHistory={() => setTarget("earnings")} size={CORE_W} center={at(0, 0)} />
          </div>
        </div>
      </div>
    </div>
  );

  // Narrow screens: core first, then the cells as interlocking honeycomb rows.
  const cellSize = phone ? 148 : 164;
  const compactStage = (
    <div data-tour="stage" className="space-y-6 pb-8">
      <CoreHex summary={summary} onAdd={addEarning} onHistory={() => setTarget("earnings")} size={Math.min(CORE_W, (typeof window === "undefined" ? 320 : window.innerWidth) - 24)} absolute={false} />
      <Honeycomb
        size={cellSize}
        wide={phone ? 2 : 3}
        items={[
          ...["safe", "goal"].map((id) => <HexCell key={id} {...infoProps(id, cellSize)} absolute={false} />),
          ...areaCells(cellSize).map(({ key, props }, i) => <HexCell key={key} {...props} absolute={false} delay={i * 50} />),
          ...cells.filter((c) => c.id !== "safe" && c.id !== "goal").map((c) => <HexCell key={c.id} {...infoProps(c.id, cellSize)} absolute={false} />)
        ]}
      />
    </div>
  );

  return (
    <div className="anim-page relative min-h-screen">
      <TopBar onSettings={() => setSettingsOpen(true)} onQuickAdd={() => setQuickOpen(true)} onTour={() => setTourManual(true)} />

      {/* Desktop: the month selector sits in the empty top-left corner so the console gets the full height.
          Narrow screens: it sits above the console, centred. */}
      <div className={desktop ? "absolute left-6 top-[84px] z-10 w-[340px]" : "mt-4 px-3"}>
        <MonthNav />
        {!isCurrent && <p className={`mt-2 text-[12px] text-ink-soft text-center`}>Viewing {monthLabel} as it ended. Entries you add here are dated at the end of that month.</p>}
      </div>

      <main className="px-3 pt-2 sm:px-6">{loading ? <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p> : desktop ? desktopStage : compactStage}</main>

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <InfoDialog id={info} onClose={() => setInfo(null)} onSweep={sweep} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onTour={() => setTourManual(true)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Tour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
