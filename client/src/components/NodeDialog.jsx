import Modal from "./Modal";
import { BillsPanel, EarningsPanel, EnvelopePanel, GoalsPanel } from "./NodePanels";
import { AREA_BY_ID } from "../lib/areas";

// Header text for the popups that are not a plain envelope.
const PANEL_TITLES = {
  earnings: { title: "Money received", subtitle: "Everything you have received" },
  goals: { title: "Goals", subtitle: "What your savings are for" },
  bills: { title: "Bills", subtitle: AREA_BY_ID.bills.hint }
};

/**
 * NodeDialog
 * ----------
 * One dialog for every hexagon. `target` is an envelope id ("housing", "food", "transport",
 * "lifestyle"), "bills", "goals" or "earnings" (opened from the core). The right panel is chosen from it.
 */
export default function NodeDialog({ target, onClose }) {
  const area = AREA_BY_ID[target];
  const known = PANEL_TITLES[target];
  const title = known?.title ?? area?.label ?? "";
  const subtitle = known?.subtitle ?? area?.hint ?? "";

  let body = null;
  if (target === "earnings") body = <EarningsPanel />;
  else if (target === "goals") body = <GoalsPanel />;
  else if (target === "bills") body = <BillsPanel />;
  else if (area) body = <EnvelopePanel id={target} />;

  return (
    <Modal open={Boolean(target)} onClose={onClose} title={title} subtitle={subtitle}>
      {body}
    </Modal>
  );
}
