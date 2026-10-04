import { useState } from "react";
import Modal from "./Modal";
import { HexButton, HexField, HexStepper, HexTabs } from "./hx";
import { IconDownload } from "./icons";
import { APP } from "../config/app";
import { PLAN } from "../config/plan";
import { useAuth } from "../context/auth";
import { useFinance } from "../context/finance";
import { useToast } from "../context/toast";
import { errorMessage } from "../api/http";
import { AREA_BY_ID } from "../lib/areas";
import { downloadText, transactionsToCsv } from "../lib/exportCsv";
import { fetchUsdToKes } from "../lib/fx";

const TABS = [
  { id: "plan", label: "Plan" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data" }
];

const Note = ({ children }) => <p className="ml-4 mt-1.5 text-[11px] leading-snug text-ink-soft">{children}</p>;
const Message = ({ tone = "info", children }) =>
  children ? (
    <p role={tone === "error" ? "alert" : "status"} className={`text-center text-[11.5px] font-medium ${tone === "error" ? "text-rose-deep" : "text-accent"}`}>
      {children}
    </p>
  ) : null;

/* ---------------------------------- Plan tab ---------------------------------- */
function PlanTab({ onClose }) {
  const { user, updateSettings } = useAuth();
  const s = user.settings;
  const [rate, setRate] = useState(String(s.usdToKes));
  const [apr, setApr] = useState(String(s.savingsApr ?? 0));
  const [months, setMonths] = useState(s.emergencyMonths ?? 3);
  const [split, setSplit] = useState({ ...s.allocation });
  const [error, setError] = useState("");
  const [rateNote, setRateNote] = useState("");
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = split.needs + split.wants + split.savings;
  const part = (key) => (n) => setSplit((cur) => ({ ...cur, [key]: n }));

  // Pulls today's KES per USD from the public feed; on failure the typed rate stays.
  const fetchRate = async () => {
    setFetching(true);
    setRateNote("");
    try {
      const { rate: live, updated } = await fetchUsdToKes(import.meta.env.VITE_FX_URL || APP.fxUrl);
      setRate(String(live));
      setRateNote(`Live rate loaded${updated ? ` (${updated.replace(/ \+0000$/, "")})` : ""}. Save to keep it.`);
    } catch (err) {
      setRateNote(`Could not load a live rate (${err.message}). Your typed rate is unchanged.`);
    } finally {
      setFetching(false);
    }
  };

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
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <HexField label="Exchange rate: KES for 1 USD" type="number" inputMode="decimal" step="any" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />
            <div className="mt-2 flex justify-end">
              <HexButton size="sm" variant="ghost" disabled={fetching} onClick={fetchRate}>
                {fetching ? "Loading..." : "Get live rate"}
              </HexButton>
            </div>
            <Note>{rateNote || "Type your own rate or load today's. Every amount converts with it."}</Note>
          </div>
          <div>
            <HexField label="Yearly growth on savings (%)" type="number" inputMode="decimal" step="any" min="0" max="30" value={apr} onChange={(e) => setApr(e.target.value)} />
            <Note>Use 0 if you keep it as cash. For a savings account or money market fund, enter its current yearly rate; projections use compound growth.</Note>
          </div>
          <HexStepper label="Safety net target" value={months} onChange={setMonths} min={1} max={12} format={(n) => `${n} month${n === 1 ? "" : "s"}`} />
        </div>

        <fieldset>
          <legend className="hx-label">How each month's earnings are split</legend>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLAN.presets.map((p) => (
              <HexButton key={p.label} size="sm" variant="ghost" className="w-full" title={p.label} onClick={() => setSplit({ ...p.values })}>
                {p.values.needs}/{p.values.wants}/{p.values.savings}
              </HexButton>
            ))}
          </div>
          <div className="space-y-2.5">
            <HexStepper label="Needs" value={split.needs} onChange={part("needs")} step={5} max={100} format={(n) => `${n}%`} />
            <HexStepper label="Wants" value={split.wants} onChange={part("wants")} step={5} max={100} format={(n) => `${n}%`} />
            <HexStepper label="Savings" value={split.savings} onChange={part("savings")} step={5} max={100} format={(n) => `${n}%`} />
          </div>
          <p className={`ml-4 mt-2 font-mono text-xs ${total === 100 ? "text-accent" : "text-rose-deep"}`}>Total: {total}%</p>
          <Note>Needs: housing, food, transport, bills. Wants: lifestyle. Savings are set aside first, before you spend.</Note>
        </fieldset>
      </div>

      <Message tone="error">{error}</Message>
      <HexButton type="submit" variant="solid" disabled={busy} className="w-full">
        Save plan settings
      </HexButton>
    </form>
  );
}

/* -------------------------------- Security tab -------------------------------- */
function SecurityTab({ onClose }) {
  const { user, changePassword, regenerateRecoveryCode, deleteAccount } = useAuth();
  const toast = useToast();

  // Change password
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwMsg, setPwMsg] = useState({ tone: "info", text: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const submitPassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return setPwMsg({ tone: "error", text: "Use at least 8 characters for the new password." });
    if (pw.next !== pw.again) return setPwMsg({ tone: "error", text: "The new passwords do not match." });
    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", again: "" });
      setPwMsg({ tone: "info", text: "" });
      toast.push({ tone: "good", text: "Password changed." });
    } catch (err) {
      setPwMsg({ tone: "error", text: errorMessage(err, "Could not change the password.") });
    } finally {
      setPwBusy(false);
    }
  };

  // Recovery code
  const [codePw, setCodePw] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const newCode = async (e) => {
    e.preventDefault();
    if (!codePw) return setCodeMsg("Enter your password to continue.");
    setCodeBusy(true);
    try {
      await regenerateRecoveryCode(codePw);
      setCodePw("");
      setCodeMsg("");
    } catch (err) {
      setCodeMsg(errorMessage(err, "Could not create a new code."));
    } finally {
      setCodeBusy(false);
    }
  };

  // Delete account (two clicks)
  const [delPw, setDelPw] = useState("");
  const [armed, setArmed] = useState(false);
  const [delMsg, setDelMsg] = useState("");
  const remove = async (e) => {
    e.preventDefault();
    if (!delPw) return setDelMsg("Enter your password to continue.");
    if (!armed) return setArmed(true);
    try {
      await deleteAccount(delPw);
      onClose();
    } catch (err) {
      setArmed(false);
      setDelMsg(errorMessage(err, "Could not delete the account."));
    }
  };

  return (
    <div className="grid items-start gap-x-10 gap-y-8 md:grid-cols-2">
      <form onSubmit={submitPassword} className="space-y-3" noValidate>
        <h3 className="hx-label !ml-0">Change password</h3>
        <div className="space-y-3">
          <HexField label="Current" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          <HexField label="New" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          <HexField label="Repeat new" type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" />
        </div>
        <Message tone={pwMsg.tone}>{pwMsg.text}</Message>
        <HexButton type="submit" variant="solid" disabled={pwBusy} className="w-full">
          Change password
        </HexButton>
      </form>

      <div className="space-y-8">
      <form onSubmit={newCode} className="space-y-3" noValidate>
        <h3 className="hx-label !ml-0">Recovery code</h3>
        <p className="text-[12.5px] leading-snug text-ink-soft">
          {user.hasRecoveryCode ? "A recovery code is set. Creating a new one replaces it; the old one stops working." : "No recovery code yet. Create one so you can reset a forgotten password."}
        </p>
        <HexField label="Your password" type="password" value={codePw} onChange={(e) => setCodePw(e.target.value)} autoComplete="current-password" />
        <Message tone="error">{codeMsg}</Message>
        <HexButton type="submit" variant="ghost" disabled={codeBusy} className="w-full">
          {user.hasRecoveryCode ? "Create a new recovery code" : "Create a recovery code"}
        </HexButton>
      </form>

      <form onSubmit={remove} className="space-y-3" noValidate>
        <h3 className="hx-label !ml-0 !text-rose-deep">Delete account</h3>
        <p className="text-[12.5px] leading-snug text-ink-soft">Permanently deletes your account, entries, bills and goal. Export your data first if you want a copy.</p>
        <HexField label="Your password" type="password" value={delPw} onChange={(e) => { setDelPw(e.target.value); setArmed(false); }} autoComplete="current-password" />
        <Message tone="error">{delMsg}</Message>
        <HexButton type="submit" variant="rose" className="w-full">
          {armed ? "Click again to delete everything" : "Delete my account"}
        </HexButton>
      </form>
      </div>
    </div>
  );
}

/* ---------------------------------- Data tab ---------------------------------- */
function DataTab({ onClose, onTour }) {
  const { transactions } = useFinance();

  const exportCsv = () => {
    const csv = transactionsToCsv(transactions, (id) => AREA_BY_ID[id]?.label || id);
    downloadText(`spendscope-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="hx-label !ml-0">Export</h3>
        <p className="text-[12.5px] leading-snug text-ink-soft">Download every entry as a spreadsheet file (CSV). It opens in Excel, Google Sheets and Numbers, so your data is never locked in.</p>
        <HexButton variant="solid" className="w-full" disabled={transactions.length === 0} onClick={exportCsv}>
          <IconDownload className="h-4 w-4" /> Download CSV ({transactions.length} entr{transactions.length === 1 ? "y" : "ies"})
        </HexButton>
      </section>
      <section className="space-y-3">
        <h3 className="hx-label !ml-0">Help</h3>
        <p className="text-[12.5px] leading-snug text-ink-soft">New here, or want a refresher on how the console works?</p>
        <HexButton variant="ghost" className="w-full" onClick={() => { onClose(); onTour(); }}>
          Replay the tutorial
        </HexButton>
      </section>
      <p className="text-center text-[11.5px] leading-snug text-ink-soft">Your data is stored in the database this app is connected to and is visible only to your account.</p>
    </div>
  );
}

/** Settings: a wide popup with three tabs. No scrollbars; the content scrolls quietly if the screen is short. */
export default function SettingsDialog({ open, onClose, onTour }) {
  const [tab, setTab] = useState("plan");
  return (
    <Modal open={open} onClose={onClose} wide title="Settings" subtitle="Plan, security and your data">
      <div className="space-y-6">
        <HexTabs label="Settings sections" tabs={TABS} value={tab} onChange={setTab} />
        {tab === "plan" && <PlanTab onClose={onClose} />}
        {tab === "security" && <SecurityTab onClose={onClose} />}
        {tab === "data" && <DataTab onClose={onClose} onTour={onTour} />}
      </div>
    </Modal>
  );
}
