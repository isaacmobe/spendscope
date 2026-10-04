import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

/**
 * useToast() -> { push({ text, tone, action, ttl }), dismiss(id), toasts }
 *  tone:   "info" | "good" | "warn"
 *  action: { label, run } shows a button on the toast (used for Undo)
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
