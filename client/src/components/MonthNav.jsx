import { useFinance } from "../context/finance";
import { HexButton, HexPill } from "./hx";
import { IconChevronLeft, IconChevronRight } from "./icons";

/**
 * MonthNav
 * --------
 * Previous / next month arrows around the month name. The arrows are the same size and the
 * label has a fixed width, so the control is symmetric whatever the month is called.
 * Going back shows that month as it ended; new entries are dated at that month's end.
 */
export default function MonthNav() {
  const { viewDate, isCurrent, canGoPrev, shiftMonth, goToToday } = useFinance();
  const label = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <nav aria-label="Month" data-tour="months" className="mx-auto flex items-center justify-center gap-2">
      <HexButton size="icon" aria-label="Previous month" disabled={!canGoPrev} onClick={() => shiftMonth(-1)}>
        <IconChevronLeft className="h-4 w-4" />
      </HexButton>
      <HexPill size="md" className="w-[200px]">
        <span className="text-[11px] uppercase tracking-[0.2em]" aria-live="polite">{label}</span>
      </HexPill>
      <HexButton size="icon" aria-label="Next month" disabled={isCurrent} onClick={() => shiftMonth(1)}>
        <IconChevronRight className="h-4 w-4" />
      </HexButton>
      {!isCurrent && (
        <HexButton size="sm" variant="accent" onClick={goToToday} className="ml-1 min-w-[84px]">
          Today
        </HexButton>
      )}
    </nav>
  );
}
