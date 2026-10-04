import { useState } from "react";
import { useAuth } from "../context/auth";
import { errorMessage } from "../api/http";
import HexCard from "./HexCard";
import { HEX_PATH } from "./hexGeometry";
import { HexButton, HexChip, HexField } from "./hx";

/**
 * AuthPage
 * --------
 * Login / create account, in the same hexagon console style as the dashboard.
 * The server checks everything again; client checks only give faster feedback.
 */
export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError("Enter your email and password.");
    if (isRegister && form.password.length < 8) return setError("Use at least 8 characters for your password.");
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register({ name: form.name.trim() || undefined, email: form.email.trim(), password: form.password });
      else await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setError(errorMessage(err, "Could not reach the server. Check your connection."));
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="anim-rise w-full max-w-[460px]">
        <div className="mb-7 flex flex-col items-center">
          <svg viewBox="-6 -4 112 130" className="h-24 w-24 overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="auth-face" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fefdf9" />
                <stop offset="1" stopColor="#ebe7db" />
              </linearGradient>
            </defs>
            <ellipse cx="50" cy="124" rx="32" ry="4.5" fill="rgba(42,42,49,0.2)" style={{ filter: "blur(3px)" }} />
            <path d={HEX_PATH} fill="url(#auth-face)" stroke="#2a2a31" strokeOpacity="0.8" strokeWidth="1.2" />
            <path d={HEX_PATH} fill="none" stroke="#5e62c4" strokeWidth="1.2" transform="translate(10 11.5) scale(0.8)" className="anim-pulse-soft" />
            <circle cx="50" cy="57.7" r="5" fill="#5e62c4" />
          </svg>
          <HexChip className="mt-4">SpendScope</HexChip>
          <p className="mt-3 max-w-xs text-center text-[13px] text-ink-soft">Track earnings, plan spending, save for what matters.</p>
        </div>

        <HexCard>
          <form onSubmit={submit} className="space-y-4 px-14 py-9" noValidate>
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.3em]">{isRegister ? "Create account" : "Log in"}</h2>
            {isRegister && <HexField label="Name (optional)" value={form.name} maxLength={60} onChange={set("name")} autoComplete="name" />}
            <HexField label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            <HexField label="Password" type="password" value={form.password} onChange={set("password")} autoComplete={isRegister ? "new-password" : "current-password"} />
            {error && (
              <p role="alert" className="text-center text-[12px] font-medium text-rose-deep">
                {error}
              </p>
            )}
            <HexButton type="submit" variant="solid" size="lg" disabled={busy} className="w-full">
              {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
            </HexButton>
            <div className="flex justify-center">
              <HexButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMode(isRegister ? "login" : "register");
                  setError("");
                }}
              >
                {isRegister ? "I have an account" : "New here? Create one"}
              </HexButton>
            </div>
          </form>
        </HexCard>
      </div>
    </main>
  );
}
