import { useMemo, useState } from "react";
import Modal from "./Modal";
import { HexButton, HexField } from "./hx";
import { useFinance } from "../context/finance";
import { AREA_BY_ID } from "../lib/areas";
import { parseQuickEntry } from "../lib/quickEntry";

const EXAMPLES = ["food 450 lunch", "rent 30k", "fare 120 boda", "+85000 salary", "save 5000 bike"];

function QuickAddForm({ onClose }) {
  const { summary, addEarning, addSpending, money } = useFinance();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseQuickEntry(text, summary.currency) : null), [text, summary.currency]);

  const submit = async (e) => {
    e.preventDefault();
    if (!parsed || parsed.error) return;
    setBusy(true);
    try {
      if (parsed.type === "income") await addEarning(parsed.amount, parsed.title, parsed.currency);
      else await addSpending(parsed.areaId, parsed.amount, parsed.title, parsed.currency);
      onClose();
    } catch {
      setBusy(false); // the error banner shows the server message
    }
  };

  const preview = parsed && !parsed.error
    ? `${parsed.type === "income" ? "Earnings" : AREA_BY_ID[parsed.areaId].label}: ${parsed.currency === summary.currency ? money(parsed.amount) : `${parsed.currency} ${parsed.amount}`}${parsed.title ? `, "${parsed.title}"` : ""}`
    : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <HexField label="Type an entry" value={text} onChange={(e) => setText(e.target.value)} placeholder="food 450 lunch   or   +85000 salary" autoFocus autoComplete="off" maxLength={120} />
      <p role="status" className={`min-h-[20px] text-center text-[12.5px] ${parsed?.error ? "text-rose-deep" : "text-accent"}`}>
        {parsed?.error || preview || "Name the area, the amount and an optional note."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <HexButton key={ex} size="sm" variant="ghost" plain onClick={() => setText(ex)}>
            {ex}
          </HexButton>
        ))}
      </div>
      <HexButton type="submit" variant="solid" disabled={busy || !parsed || Boolean(parsed.error)} className="w-full">
        Add entry
      </HexButton>
    </form>
  );
}

/** QuickAdd: one line becomes an entry. Opened with Ctrl/Cmd+K or the Quick add button. */
export default function QuickAdd({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Quick add" subtitle="One line, no forms">
      <QuickAddForm onClose={onClose} />
    </Modal>
  );
}
