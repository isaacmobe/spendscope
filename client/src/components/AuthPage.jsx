import { useState } from "react";
import { useAuth } from "../context/auth";
import { errorMessage } from "../api/http";
import HexCard from "./HexCard";
import { HexButton, HexChip, HexField } from "./hx";
import Logo from "./Logo";

const TITLES = { login: "Log in", register: "Create account", forgot: "Reset password" };

/**
 * AuthPage
 * --------
 * Log in, create an account, or reset a forgotten password with the recovery code shown at signup.
 * The server checks everything again; client checks only give faster feedback.
 */
export default function AuthPage() {
  const { login, register, recover } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const go = (next) => {
    setMode(next);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError(mode === "forgot" ? "Enter your email, recovery code and a new password." : "Enter your email and password.");
    if (mode !== "login" && form.password.length < 8) return setError("Use at least 8 characters for your password.");
    if (mode === "forgot" && !form.code.trim()) return setError("Enter your recovery code.");
    setError("");
    setBusy(true);
    try {
      const email = form.email.trim();
      if (mode === "register") await register({ name: form.name.trim() || undefined, email, password: form.password });
      else if (mode === "forgot") await recover({ email, recoveryCode: form.code.trim(), newPassword: form.password });
      else await login({ email, password: form.password });
    } catch (err) {
      setError(errorMessage(err, "Could not reach the server. Check your connection."));
      setBusy(false);
    }
  };

  const verb = mode === "forgot" ? "Set new password" : TITLES[mode];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="anim-page w-full max-w-[460px]">
        <div className="mb-7 flex flex-col items-center">
          <div className="relative">
            <span aria-hidden className="absolute left-1/2 top-[88%] h-3 w-14 -translate-x-1/2 rounded-full bg-[rgb(var(--c-shadow)/0.25)] blur-md" />
            <Logo size={88} className="anim-float relative" />
          </div>
          <HexChip className="mt-5">SpendScope</HexChip>
          <p className="mt-3 max-w-xs text-center text-[13px] text-ink-soft">Track earnings, plan spending, save for what matters.</p>
        </div>

        <HexCard>
          <form onSubmit={submit} className="space-y-4 px-14 py-9" noValidate>
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.3em]">{TITLES[mode]}</h2>
            {mode === "register" && <HexField label="Name (optional)" value={form.name} maxLength={60} onChange={set("name")} autoComplete="name" />}
            <HexField label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            {mode === "forgot" && <HexField label="Recovery code" value={form.code} onChange={set("code")} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} />}
            <HexField
              label={mode === "forgot" ? "New password" : "Password"}
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {error && (
              <p role="alert" className="text-center text-[12px] font-medium text-rose-deep">
                {error}
              </p>
            )}
            <HexButton type="submit" variant="solid" size="lg" disabled={busy} className="w-full">
              {busy ? "Please wait..." : verb}
            </HexButton>
            <div className="flex flex-wrap justify-center gap-2">
              {mode !== "login" && (
                <HexButton size="sm" variant="ghost" className="min-w-[132px]" onClick={() => go("login")}>
                  Back to log in
                </HexButton>
              )}
              {mode !== "register" && (
                <HexButton size="sm" variant="ghost" className="min-w-[132px]" onClick={() => go("register")}>
                  Create account
                </HexButton>
              )}
              {mode === "login" && (
                <HexButton size="sm" variant="ghost" className="min-w-[132px]" onClick={() => go("forgot")}>
                  Forgot password
                </HexButton>
              )}
            </div>
          </form>
        </HexCard>
      </div>
    </main>
  );
}
