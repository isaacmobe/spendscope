import { useState } from "react";
import { HexButton, HexField } from "./hx";

/**
 * AmountForm
 * ----------
 * One amount field (plus an optional note) and a hexagon submit button.
 * Used for earnings in the core, spending in each area, and savings contributions.
 * It validates on the client for quick feedback; the server validates again.
 */
export default function AmountForm({ submitLabel, withNote = false, onSubmit, compact = false, currency }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount above 0.");
    setError("");
    setBusy(true);
    try {
      await onSubmit(value, note.trim());
      setAmount("");
      setNote("");
    } catch {
      // The provider already shows the server's message in the error banner.
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handle} className={compact ? "w-full" : "space-y-3"} noValidate>
      <div className="flex items-end gap-2">
        <HexField
          className="min-w-0 flex-1"
          size={compact ? "sm" : "md"}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Amount (${currency})`}
          aria-label={`Amount in ${currency}`}
        />
        <HexButton type="submit" size={compact ? "sm" : "md"} variant="solid" disabled={busy}>
          {busy ? "..." : submitLabel}
        </HexButton>
      </div>
      {withNote && (
        <HexField
          type="text"
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional), e.g. Naivas groceries"
          aria-label="Note"
        />
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-deep">
          {error}
        </p>
      )}
    </form>
  );
}
