import { useState } from "react";
import Modal from "./Modal";
import { HexButton, HexField, HexStepper } from "./hx";
import { useAuth } from "../context/auth";
import { errorMessage } from "../api/http";

const PRESETS = [
  { label: "Balanced 50/30/20", values: { needs: 50, wants: 30, savings: 20 } },
  { label: "Lean 60/20/20", values: { needs: 60, wants: 20, savings: 20 } },
  { label: "Saver 50/20/30", values: { needs: 50, wants: 20, savings: 30 } }
];

// The form is its own component so it starts fresh from the saved settings each time the dialog opens.
function SettingsForm({ onClose }) {
  const { user, updateSettings } = useAuth();
  const s = user.settings;
  const [rate, setRate] = useState(String(s.usdToKes));
  const [apr, setApr] = useState(String(s.savingsApr ?? 0));
  const [months, setMonths] = useState(s.emergencyMonths ?? 3);
  const [split, setSplit] = useState({ ...s.allocation });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = split.needs + split.wants + split.savings;
  const part = (key) => (n) => setSplit((cur) => ({ ...cur, [key]: n }));

  const save = async (e) => {
    e.preventDefault();
    const rateNumber = Number(rate);
    const aprNumber = Number(apr);
    if (!Number.isFinite(rateNumber) || rateNumber < 1) return setError("Enter the KES value of 1 USD.");
    if (!Number.isFinite(aprNumber) || aprNumber < 0 || aprNumber > 30) return setError("Yearly growth must be between 0 and 30%.");
    if (total !== 100) return setError("The three shares must add up to 100%.");
    setError("");
    setBusy(true);
    try {
      await updateSettings({ usdToKes: rateNumber, savingsApr: aprNumber, emergencyMonths: months, allocation: split });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save settings."));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <div>
        <HexField label="Exchange rate: KES for 1 USD" type="number" inputMode="decimal" step="any" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />
        <p className="ml-4 mt-1.5 text-[11px] text-ink-soft">You set this yourself. Check a current rate and update it when it changes.</p>
      </div>

      <fieldset>
        <legend className="hx-label">How each month's earnings are split</legend>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <HexButton key={p.label} size="sm" variant="ghost" onClick={() => setSplit(p.values)}>
              {p.label}
            </HexButton>
          ))}
        </div>
        <div className="space-y-2.5">
          <HexStepper label="Needs" value={split.needs} onChange={part("needs")} step={5} max={100} format={(n) => `${n}%`} />
          <HexStepper label="Wants" value={split.wants} onChange={part("wants")} step={5} max={100} format={(n) => `${n}%`} />
          <HexStepper label="Savings" value={split.savings} onChange={part("savings")} step={5} max={100} format={(n) => `${n}%`} />
        </div>
        <p className={`ml-4 mt-2 font-mono text-xs ${total === 100 ? "text-accent" : "text-rose-deep"}`}>Total: {total}%</p>
        <p className="ml-4 mt-1 text-[11px] text-ink-soft">Needs: housing, food, transport, bills. Wants: lifestyle. Savings are set aside first, before you spend.</p>
      </fieldset>

      <div>
        <HexField label="Expected yearly growth on savings (%)" type="number" inputMode="decimal" step="any" min="0" max="30" value={apr} onChange={(e) => setApr(e.target.value)} />
        <p className="ml-4 mt-1.5 text-[11px] text-ink-soft">Use 0 if you keep it as cash. If it sits in a savings account or money market fund, enter its current yearly rate. Projections use it as compound growth.</p>
      </div>

      <HexStepper label="Safety net target" value={months} onChange={setMonths} min={1} max={12} format={(n) => `${n} month${n === 1 ? "" : "s"}`} />

      {error && <p role="alert" className="text-center text-[11px] font-medium text-rose-deep">{error}</p>}
      <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
        Save settings
      </HexButton>
    </form>
  );
}

export default function SettingsDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Settings" subtitle="Exchange rate, earnings split and savings growth">
      <SettingsForm onClose={onClose} />
    </Modal>
  );
}
