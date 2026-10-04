import { useState } from "react";
import { useAuth } from "../context/auth";
import { errorMessage } from "../api/http";
import { HEX_POINTS } from "./Hex";

/**
 * AuthPage
 * --------
 * Login / create account in the same console style as the dashboard.
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

  const input = "w-full border border-ink/60 bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-rise-in">
        <div className="mb-6 flex flex-col items-center">
          <svg viewBox="0 0 100 115.47" className="h-20 w-20 animate-breathe" aria-hidden="true">
            <polygon points={HEX_POINTS} fill="#F7F6F2" stroke="#1E2130" strokeWidth="3" strokeLinejoin="round" />
            <polygon points={HEX_POINTS} fill="none" stroke="#5558C8" strokeWidth="1.5" transform="translate(10 11.5) scale(0.8)" />
          </svg>
          <h1 className="mt-3 bg-ink px-5 py-1 text-sm font-semibold uppercase tracking-[0.3em] text-paper-light">SpendScope</h1>
          <p className="mt-2 text-sm text-ink-soft">Track earnings, plan spending, save for what matters.</p>
        </div>

        <form onSubmit={submit} className="space-y-3 border border-ink bg-paper-light p-5 shadow-xl" noValidate>
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em]">{isRegister ? "Create account" : "Log in"}</h2>
          {isRegister && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Name (optional)</span>
              <input className={input} value={form.name} maxLength={60} onChange={set("name")} autoComplete="name" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Email</span>
            <input className={input} type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Password</span>
            <input className={input} type="password" value={form.password} onChange={set("password")} autoComplete={isRegister ? "new-password" : "current-password"} />
          </label>
          {error && <p role="alert" className="text-xs font-medium text-salmon-dark">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-ink py-2.5 text-sm font-semibold uppercase tracking-wider text-paper-light transition hover:bg-accent disabled:opacity-50">
            {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError("");
            }}
            className="w-full text-center text-sm font-medium text-accent hover:underline"
          >
            {isRegister ? "Already have an account? Log in" : "New here? Create an account"}
          </button>
        </form>
      </div>
    </main>
  );
}
