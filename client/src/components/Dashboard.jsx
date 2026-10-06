import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP } from "../config/app";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useCellLayout } from "../hooks/useCellLayout";
import { useParallax } from "../hooks/useParallax";
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
  const [hoverId, setHoverId] = useState(null); // outer hexagon under the pointer or focus (desktop)
  const [pinId, setPinId] = useState(null); // outer hexagon kept in the centre after a click
  const hoverTimer = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [tourManual, setTourManual] = useState(false);
  const [tourDone, setTourDone] = useState(readTourDone);
  const desktop = useMediaQuery("(min-width: 1100px)");
  const phone = useMediaQuery("(max-width: 559px)");
  const reduced = useReducedMotion();
  const [stageRef, scale] = useStageFit(STAGE.width, STAGE.height);
  const tiltRef = useParallax(desktop && !reduced);
  const layout = useCellLayout();
  const dragBase = useRef({ dx: 0, dy: 0 }); // offset of the hexagon being dragged, when the drag began

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
      if (e.key === "Escape") setPinId(null);
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

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const locked = summary.income <= 0 && isCurrent; // areas unlock once earnings exist (past months always open)
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = useMemo(() => buildCells(summary), [summary]);
  const cellById = useMemo(() => Object.fromEntries(cells.map((c) => [c.id, c])), [cells]);

  // Where every outer hexagon is: its default spot plus however far the user dragged it (kept on the stage).
  const nodes = useMemo(() => {
    const out = {};
    const place = (n, w) => {
      const off = layout.offsets[n.id] || { dx: 0, dy: 0 };
      const half = w / 2;
      const halfH = hexHeight(w) / 2;
      const p = at(n.dx + off.dx, n.dy + off.dy);
      out[n.id] = { x: Math.min(STAGE.width - half, Math.max(half, p.x)), y: Math.min(STAGE.height - halfH, Math.max(halfH, p.y)), w };
    };
    RING1.forEach((n) => place(n, RING1_W));
    RING2.forEach((n) => place(n, RING2_W));
    return out;
  }, [layout.offsets]);

  // Drag handlers for one hexagon: remember where it started, then follow the pointer (in stage units).
  const dragProps = (id) => ({
    draggable: desktop,
    scale,
    onDragStart: () => {
      const cur = nodes[id];
      const def = [...RING1, ...RING2].find((n) => n.id === id);
      dragBase.current = { dx: cur.x - at(def.dx, def.dy).x, dy: cur.y - at(def.dx, def.dy).y };
    },
    onDrag: (dx, dy) => layout.setOffset(id, { dx: Math.round(dragBase.current.dx + dx), dy: Math.round(dragBase.current.dy + dy) })
  });

  // Move this month's unspent money into the savings goal (one entry, easy to undo).
  const sweep = () => addSpending("savings", Math.floor(summary.leftover * 100) / 100, "Unspent, moved to savings").catch(() => {});

  // What each information cell does when clicked: the goal and quick-add reuse existing popups.
  const openCell = (id) => {
    if (id === "goal") setTarget("savings");
    else if (id === "quick") setQuickOpen(true);
    else setInfo(id);
  };

  // Open the full popup for an outer hexagon (an area, or an information cell).
  const openById = (id) => (summary.areas.some((a) => a.id === id) ? setTarget(id) : openCell(id));

  // Hover preview. Two delays make it easy to use: moving onto a different hexagon only switches the
  // preview after a short pause (so crossing neighbours on the way to the centre does not flip it),
  // and the preview lingers after the pointer leaves, long enough to reach the centre buttons.
  const hoverCell = useCallback((id, active) => {
    clearTimeout(hoverTimer.current);
    if (active) {
      hoverTimer.current = setTimeout(() => setHoverId(id), 120);
      setHoverId((cur) => (cur === null ? id : cur));
    } else {
      hoverTimer.current = setTimeout(() => setHoverId(null), 1800);
    }
  }, []);

  // A click pins the preview in the centre; clicking the same hexagon again opens its popup.
  // Narrow screens have no room for the preview, so a tap opens the popup straight away.
  const selectCell = (id) => {
    if (!desktop || pinId === id) return openById(id);
    setPinId(id);
  };

  const previewId = desktop ? hoverId ?? pinId : null;

  // What the centre shows for the previewed hexagon.
  const preview = useMemo(() => {
    if (!previewId) return null;
    const fit = (n) => formatMoneyFit(n, summary.currency, 12);
    const area = summary.areas.find((a) => a.id === previewId);
    if (area) {
      const isSavings = area.id === "savings";
      const left = area.budget - area.spent;
      const tone = isSavings ? "good" : area.ratio > 1 ? "over" : area.ratio > 0.85 ? "warn" : "ok";
      const status = isSavings ? (summary.goal ? `${Math.round(summary.goal.progress * 100)}% of your goal saved.` : "Set a goal to track it.") : left < 0 ? `Over by ${fit(-left)}.` : `${fit(left)} left.`;
      return {
        id: area.id,
        kicker: String(summary.areas.indexOf(area) + 1).padStart(2, "0"),
        title: area.label,
        value: fit(area.spent),
        caption: area.id === "bills" ? "per month" : `of ${fit(area.budget)} share`,
        text: `${area.hint}. ${status}`,
        tone,
        level: Math.min(1, isSavings ? (summary.goal ? summary.goal.progress : 0) : area.ratio),
        meter: true,
        command: area.id !== "bills", // bills are set up once in the popup; the others take an amount here
        action: area.id === "bills" ? "Manage bills" : "Entries"
      };
    }
    const c = cellById[previewId];
    return {
      id: c.id,
      kicker: c.kicker,
      title: c.info.title,
      value: c.value,
      caption: c.caption,
      text: c.info.short,
      tone: c.tone,
      level: c.level,
      meter: ["needs", "wants", "pool", "after", "left", "level", "pace", "safe"].includes(c.id),
      action: c.id === "quick" ? "Open" : c.id === "goal" ? "Edit goal" : "Details"
    };
  }, [previewId, summary, cellById]);

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
          dim: Boolean(pinId) && pinId !== area.id && hoverId !== area.id,
          selected: previewId === area.id || target === area.id,
          onOpen: () => selectCell(area.id),
          onPreview: desktop ? (on) => hoverCell(area.id, on) : undefined,
          ...dragProps(area.id),
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
      dim: Boolean(pinId) && pinId !== id && hoverId !== id,
      icon: c.icon ? ICONS[c.icon] : undefined,
      spark: c.spark,
      sparkMax: c.sparkMax,
      selected: previewId === id || info === id || (id === "goal" && target === "savings"),
      onOpen: () => selectCell(id),
      onPreview: desktop ? (on) => hoverCell(id, on) : undefined,
      ...dragProps(id),
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
            <Circuit nodes={nodes} areaIds={RING1.map((n) => n.id)} locked={locked} leadId={previewId} pinned={Boolean(pinId) && pinId === previewId} />
            {RING2.map((n, i) => (
              <HexCell key={n.id} {...infoProps(n.id, RING2_W)} absolute center={nodes[n.id]} pair={pairOf(n.dy)} delay={250 + i * 40} />
            ))}
            {areaCells(RING1_W).map(({ key, node, props }, i) => (
              <HexCell key={key} {...props} absolute center={nodes[node.id]} port={node.port} pair={pairOf(node.dy)} delay={120 + i * 60} />
            ))}
            <CoreHex
              summary={summary}
              onAdd={addEarning}
              onHistory={() => setTarget("earnings")}
              size={CORE_W}
              center={at(0, 0)}
              preview={preview}
              pinned={Boolean(pinId) && pinId === previewId}
              onOpenPreview={() => openById(previewId)}
              onBack={() => setPinId(null)}
              onCommand={(areaId, amount) => addSpending(areaId, amount, summary.areas.find((a) => a.id === areaId).label)}
              onEngage={() => previewId && setPinId(previewId)}
              onPointerEnter={() => clearTimeout(hoverTimer.current)}
              onPointerLeave={() => setHoverId(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Header rail: day of the month against share of the living budget used.
  const progress = useMemo(() => {
    const { days, today, cumulative, budget } = summary.trend;
    const spent = cumulative[cumulative.length - 1] || 0;
    return { day: Math.min(days, today), days, spendRatio: budget > 0 ? spent / budget : 0 };
  }, [summary.trend]);

  // Month selector, with a note when looking back (shown under the header on desktop).
  const monthNav = <MonthNav />;

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
      <TopBar onSettings={() => setSettingsOpen(true)} onQuickAdd={() => setQuickOpen(true)} onTour={() => setTourManual(true)}
        onResetLayout={desktop && layout.moved ? layout.reset : undefined}
        center={desktop ? monthNav : null}
        progress={loading ? null : progress}
      />

      {/* Narrow screens: the month selector sits above the console. Desktop has it in the header. */}
      {!desktop && (
        <div className="mt-4 px-3">
          {monthNav}
          {!isCurrent && <p className="mt-2 text-center text-[12px] text-ink-soft">Viewing {monthLabel} as it ended. Entries you add here are dated at the end of that month.</p>}
        </div>
      )}

      {desktop && !isCurrent && <p className="mt-2 text-center text-[12px] text-ink-soft">Viewing {monthLabel} as it ended. Entries you add here are dated at the end of that month.</p>}

      <main className="px-3 pt-2 sm:px-6">{loading ? <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p> : desktop ? desktopStage : compactStage}</main>

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <InfoDialog id={info} onClose={() => setInfo(null)} onSweep={sweep} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onTour={() => setTourManual(true)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Tour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
