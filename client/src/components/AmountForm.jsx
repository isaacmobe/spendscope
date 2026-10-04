import { useState } from "react";

/**
 * AmountForm
 * ----------
 * One amount field (plus an optional note) and a submit button.
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

  const field = "w-full border border-ink/60 bg-white px-3 py-2 text-ink placeholder:text-ink-soft/60 focus:border-accent focus:outline-none";

  return (
    <form onSubmit={handle} className={compact ? "w-full" : "space-y-3"} noValidate>
      <div className={compact ? "flex gap-1.5" : "flex gap-2"}>
        <label className="sr-only" htmlFor={`amt-${submitLabel}`}>Amount in {currency}</label>
        <input
          id={`amt-${submitLabel}`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Amount (${currency})`}
          className={`${field} ${compact ? "min-w-0 py-1.5 text-sm" : ""}`}
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wider text-paper-light transition hover:bg-accent disabled:opacity-50"
        >
          {busy ? "..." : submitLabel}
        </button>
      </div>
      {withNote && (
        <>
          <label className="sr-only" htmlFor={`note-${submitLabel}`}>Note</label>
          <input
            id={`note-${submitLabel}`}
            type="text"
            maxLength={60}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional), e.g. Naivas groceries"
            className={field}
          />
        </>
      )}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-salmon-dark">{error}</p>}
    </form>
  );
}
