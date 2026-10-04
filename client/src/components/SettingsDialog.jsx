import { useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/auth";
import { errorMessage } from "../api/http";

const PRESETS = [
  { label: "Balanced 50/30/20", values: { needs: 50, wants: 30, savings: 20 } },
  { label: "Lean 60/20/20", values: { needs: 60, wants: 20, savings: 20 } },
  { label: "Saver 50/20/30", values: { needs: 50, wants: 20, savings: 30 } }
];

const inputClass = "w-full border border-ink/60 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none";

// The form is its own component so it starts fresh from the saved settings each time the dialog opens.
function SettingsForm({ onClose }) {
  const { user, updateSettings } = useAuth();
  const { usdToKes, allocation } = user.settings;
  const [rate, setRate] = useState(String(usdToKes));
  const [split, setSplit] = useState({ needs: allocation.needs, wants: allocation.wants, savings: allocation.savings });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = Number(split.needs) + Number(split.wants) + Number(split.savings);
  const setPart = (key) => (e) => setSplit((s) => ({ ...s, [key]: e.target.value === "" ? "" : Number(e.target.value) }));

  const save = async (e) => {
    e.preventDefault();
    const rateNumber = Number(rate);
    if (!Number.isFinite(rateNumber) || rateNumber < 1) return setError("Enter the KES value of 1 USD.");
    if (Math.round(total) !== 100) return setError("The three shares must add up to 100%.");
    setError("");
    setBusy(true);
    try {
      await updateSettings({ usdToKes: rateNumber, allocation: { needs: Number(split.needs), wants: Number(split.wants), savings: Number(split.savings) } });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save settings."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Exchange rate: KES for 1 USD</span>
        <input className={inputClass} type="number" inputMode="decimal" step="any" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />
        <span className="mt-1 block text-xs text-ink-soft">You set this yourself. Check a current rate and update it when it changes.</span>
      </label>

      <fieldset>
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">How each month's earnings are split</legend>
        <div className="mb-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setSplit(p.values)} className="border border-ink/40 px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent">
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["needs", "Needs %"], ["wants", "Wants %"], ["savings", "Savings %"]].map(([key, label]) => (
            <label key={key}>
              <span className="mb-1 block text-xs text-ink-soft">{label}</span>
              <input className={inputClass} type="number" inputMode="numeric" min="0" max="100" value={split[key]} onChange={setPart(key)} />
            </label>
          ))}
        </div>
        <p className={`mt-2 font-mono text-xs ${Math.round(total) === 100 ? "text-accent" : "text-salmon-dark"}`}>Total: {total}%</p>
        <p className="mt-1 text-xs text-ink-soft">Needs cover housing, food, transport and bills. Wants cover lifestyle. Savings go to your goal.</p>
      </fieldset>

      {error && <p role="alert" className="text-xs font-medium text-salmon-dark">{error}</p>}
      <button type="submit" disabled={busy} className="w-full bg-ink py-2 text-sm font-semibold uppercase tracking-wider text-paper-light hover:bg-accent disabled:opacity-50">
        Save settings
      </button>
    </form>
  );
}

export default function SettingsDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Settings" subtitle="Exchange rate and earnings split">
      <SettingsForm onClose={onClose} />
    </Modal>
  );
}
