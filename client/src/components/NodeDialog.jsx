import Modal from "./Modal";
import { BillsPanel, EarningsPanel, SavingsPanel, SpendPanel } from "./NodePanels";
import { useFinance } from "../context/finance";

/**
 * NodeDialog
 * ----------
 * One dialog for every hexagon. `target` is an area id ("housing", "bills", ...) or
 * "earnings" (opened from the core). The right panel is chosen from it.
 */
export default function NodeDialog({ target, onClose }) {
  const { summary } = useFinance();
  const area = summary.areas.find((a) => a.id === target);

  let title = "";
  let subtitle = "";
  let body = null;
  if (target === "earnings") {
    title = "Earnings this month";
    body = <EarningsPanel />;
  } else if (area) {
    title = area.label;
    subtitle = area.hint;
    body = area.id === "bills" ? <BillsPanel /> : area.id === "savings" ? <SavingsPanel area={area} /> : <SpendPanel area={area} />;
  }

  return (
    <Modal open={Boolean(target)} onClose={onClose} title={title} subtitle={subtitle}>
      {body}
    </Modal>
  );
}
