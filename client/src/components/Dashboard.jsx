import { useEffect, useState } from "react";
import { APP } from "../config/app";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useParallax } from "../hooks/useParallax";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useStageFit } from "../hooks/useStageFit";
import { formatMoneyFit } from "../lib/money";
import CoreHex from "./CoreHex";
import HexCell from "./HexCell";
import { hexHeight } from "./hexGeometry";
import NodeDialog from "./NodeDialog";
import PlanDialog from "./PlanDialog";
import QuickAdd from "./QuickAdd";
import SettingsDialog from "./SettingsDialog";
import { CORE_W, RING, RING_W, STAGE, at, pairOf } from "./stage";
import TopBar from "./TopBar";
import Tour from "./Tour";
import { AREA_BY_ID } from "../lib/areas";

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
 * StepGuide
 * ---------
 * The three steps of the flow, with the current one lit: Receive money, Plan it, then Spend from the
 * envelopes. It tells you where you are without asking you to read anything.
 */
function StepGuide({ step }) {
  const steps = ["Receive", "Plan", "Spend"];
  return (
    <ol className="mx-auto flex items-center justify-center gap-1 sm:gap-2" aria-label="Your next step" data-tour="steps">
      {steps.map((name, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "next";
        return (
          <li key={name} className="flex items-center gap-1 sm:gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span
              className={`hud-step ${state === "now" ? "is-now" : state === "done" ? "is-done" : ""} flex h-7 items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] sm:gap-2 sm:px-4 sm:text-[11px] sm:tracking-[0.2em]`}
            >
              <span className="font-mono">{n}</span>
              {name}
            </span>
            {i < steps.length - 1 && <span className="h-px w-2 bg-ink/30 sm:w-6" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

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
  const { loading, ledger, addEarning } = useFinance();
  const [target, setTarget] = useState(null); // which popup is open: an envelope id, "goals", "earnings" or null
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [tourManual, setTourManual] = useState(false);
  const [tourDone, setTourDone] = useState(readTourDone);
  const desktop = useMediaQuery("(min-width: 1100px)");
  const phone = useMediaQuery("(max-width: 559px)");
  const reduced = useReducedMotion();
  const [stageRef, scale] = useStageFit(STAGE.width, STAGE.height, { max: 1.3 });
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

  const { toAssign, incomeTotal, currency } = ledger;
  const step = incomeTotal <= 0 ? 1 : Math.abs(toAssign) > 0.5 ? 2 : 3;
  const fit = (n) => formatMoneyFit(n, currency);

  // Planning needs money waiting to be assigned. If more is planned than received (an earning was
  // deleted), the button opens the earnings list instead.
  const openPlan = () => (toAssign < -0.5 ? setTarget("earnings") : setPlanOpen(true));

  // What each envelope hexagon shows: what is left in it, out of what was planned into it.
  const describe = (id) => {
    if (id === "goals") {
      const top = ledger.goals[0];
      if (!top) return { title: "Goals", value: "Add one", caption: "nothing saved for yet", tone: "muted", level: 0 };
      return {
        title: ledger.goals.length > 1 ? `${ledger.goals.length} goals` : "Goal",
        value: `${Math.round(top.progress * 100)}%`,
        caption: top.name,
        tone: "good",
        level: top.progress
      };
    }
    const env = ledger.envelopes[id];
    if (id === "bills") {
      const months = ledger.billsTotal > 0 ? env.balance / ledger.billsTotal : null;
      return {
        title: "Bills",
        value: fit(env.balance),
        caption: ledger.billsTotal === 0 ? "no bills yet" : `${months.toFixed(1)} months covered`,
        tone: env.balance < 0 ? "over" : ledger.billsTotal > 0 && months < 1 ? "warn" : "ok",
        level: ledger.billsTotal > 0 ? Math.max(0, Math.min(1, env.balance / ledger.billsTotal)) : 0
      };
    }
    const share = env.allocated > 0 ? env.balance / env.allocated : 0;
    return {
      title: AREA_BY_ID[id].label,
      value: fit(env.balance),
      caption: env.allocated > 0 ? `of ${fit(env.allocated)} planned` : "not planned yet",
      tone: env.balance < 0 ? "over" : env.allocated <= 0 ? "muted" : share < 0.15 ? "warn" : "ok",
      level: Math.max(0, Math.min(1, share))
    };
  };

  const cellProps = (n, i) => {
    const d = describe(n.id);
    return {
      kicker: String(i + 1).padStart(2, "0"),
      ...d,
      selected: target === n.id,
      onOpen: () => setTarget(n.id),
      label: n.id === "goals" ? "Goals: what you are saving for" : `${d.title}: ${AREA_BY_ID[n.id]?.hint ?? ""}`,
      tourId: `node-${n.id}`
    };
  };

  const core = (extra) => <CoreHex ledger={ledger} onAdd={addEarning} onPlan={openPlan} onEntries={() => setTarget("earnings")} {...extra} />;

  // Desktop: the six envelopes in fixed places around the core, scaled to fit the window.
  const desktopStage = (
    <div ref={stageRef} data-tour="stage" className="relative mx-auto w-full" style={{ maxWidth: STAGE.width * 1.3, height: STAGE.height * scale }}>
      <div className="absolute left-1/2 top-0 origin-top" style={{ width: STAGE.width, height: STAGE.height, transform: `translateX(-50%) scale(${scale})` }}>
        <div style={{ perspective: "1700px" }} className="h-full w-full">
          <div ref={tiltRef} className="relative h-full w-full" style={{ transform: "rotateX(calc(var(--py, 0) * -1.6deg)) rotateY(calc(var(--px, 0) * 2deg))", transition: "transform 0.1s linear" }}>
            {RING.map((n, i) => (
              <HexCell key={n.id} {...cellProps(n, i)} size={RING_W} absolute center={at(n.dx, n.dy)} port={n.port} pair={pairOf(n.dy)} delay={120 + i * 60} />
            ))}
            {core({ size: CORE_W, center: at(0, 0) })}
          </div>
        </div>
      </div>
    </div>
  );

  // Narrow screens: the core first, then the envelopes as interlocking honeycomb rows.
  const cellSize = phone ? 148 : 164;
  const compactStage = (
    <div data-tour="stage" className="space-y-6 pb-8">
      {core({ size: Math.min(CORE_W, (typeof window === "undefined" ? 320 : window.innerWidth) - 24), absolute: false })}
      <Honeycomb size={cellSize} wide={phone ? 2 : 3} items={RING.map((n, i) => <HexCell key={n.id} {...cellProps(n, i)} size={cellSize} absolute={false} delay={i * 50} />)} />
    </div>
  );

  return (
    <div className="anim-page relative min-h-screen">
      <TopBar onSettings={() => setSettingsOpen(true)} onQuickAdd={() => setQuickOpen(true)} onTour={() => setTourManual(true)} />

      <div className="mt-4 px-3">
        <StepGuide step={step} />
      </div>

      <main className="px-3 pt-2 sm:px-6">{loading ? <p className="py-24 text-center font-mono text-sm text-ink-soft">Loading your data...</p> : desktop ? desktopStage : compactStage}</main>

      <NodeDialog target={target} onClose={() => setTarget(null)} />
      <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onTour={() => setTourManual(true)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Tour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
