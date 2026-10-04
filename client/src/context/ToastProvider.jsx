import { useCallback, useMemo, useRef, useState } from "react";
import ToastViewport from "../components/ToastViewport";
import { ToastContext } from "./toast";

// Holds the list of visible toasts; ToastViewport draws them.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((toast) => {
    const id = nextId.current++;
    // Keep at most 3 on screen; the oldest goes first.
    setToasts((list) => [...list.slice(-2), { ttl: 6000, tone: "info", ...toast, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ push, dismiss, toasts }), [push, dismiss, toasts]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
