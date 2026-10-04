import { useState } from "react";
import { useAuth } from "../context/auth";
import { downloadText } from "../lib/exportCsv";
import Modal from "./Modal";
import { HexButton, HexPill } from "./hx";
import { IconCopy, IconDownload, IconShield } from "./icons";

/**
 * RecoveryCodeDialog
 * ------------------
 * Shows the one-time recovery code after signup, a recovery, or generating a new code. It cannot be
 * dismissed until the person confirms they saved it, because it is never shown again (the server
 * stores only a hash). The code is what resets a forgotten password.
 */
function Body({ code, onDone }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("Copied.");
    } catch {
      setCopied("Copy was blocked. Select the code and copy it by hand.");
    }
  };

  return (
    <div className="space-y-5">
      <p className="flex gap-3 text-[13.5px] leading-relaxed">
        <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <span>This code is the only way to reset your password if you forget it. It is shown once and we cannot show it again. Keep it somewhere safe, such as a password manager.</span>
      </p>
      <div className="flex justify-center">
        <HexPill size="lg" className="w-full max-w-[380px]">
          <span className="select-all font-mono text-[17px] tracking-[0.14em]">{code}</span>
        </HexPill>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HexButton variant="ghost" onClick={copy}>
          <IconCopy className="h-4 w-4" /> Copy
        </HexButton>
        <HexButton variant="ghost" onClick={() => downloadText("spendscope-recovery-code.txt", `SpendScope recovery code\r\n${code}\r\n\r\nKeep this private. It resets your password.\r\n`, "text/plain;charset=utf-8")}>
          <IconDownload className="h-4 w-4" /> Download
        </HexButton>
      </div>
      <p role="status" className="min-h-[18px] text-center text-[12px] text-ink-soft">{copied}</p>
      <HexButton variant={saved ? "accent" : "ghost"} aria-pressed={saved} onClick={() => setSaved((v) => !v)} className="w-full">
        {saved ? "I saved it" : "Tick when you have saved it"}
      </HexButton>
      <HexButton variant="solid" disabled={!saved} onClick={onDone} className="w-full">
        Continue
      </HexButton>
    </div>
  );
}

export default function RecoveryCodeDialog() {
  const { recoveryCode, dismissRecoveryCode } = useAuth();
  return (
    <Modal open={Boolean(recoveryCode)} onClose={dismissRecoveryCode} dismissible={false} title="Save your recovery code" subtitle="Needed if you forget your password">
      {recoveryCode && <Body code={recoveryCode} onDone={dismissRecoveryCode} />}
    </Modal>
  );
}
