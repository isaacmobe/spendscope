import { useEffect, useState } from "react";
import { HexButton } from "./hx";
import { IconClose } from "./icons";

const TONE = { info: "hx--wash", good: "hx--accent", warn: "hx--rose" };

// One toast. It dismisses itself after `ttl` ms, and pauses while hovered or focused.
function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !toast.ttl) return;
    const id = setTimeout(() => onDismiss(toast.id), toast.ttl);
    return () => clearTimeout(id);
  }, [paused, toast, onDismiss]);

  return (
    <div
      role="status"
      className={`hx ${TONE[toast.tone]} anim-toast pointer-events-auto block`}
      style={{ "--c": "22px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="hx__edge">
        <span className="hx__face min-h-[46px] justify-between gap-3 py-1 pl-9 pr-8 text-[13px] font-medium">
          <span>{toast.text}</span>
          <span className="flex items-center gap-1">
            {toast.action && (
              <HexButton
                size="sm"
                variant="solid"
                onClick={() => {
                  toast.action.run();
                  onDismiss(toast.id);
                }}
              >
                {toast.action.label}
              </HexButton>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)} className="grid h-7 w-7 place-items-center opacity-70 transition hover:opacity-100">
              <IconClose className="h-4 w-4" />
            </button>
          </span>
        </span>
      </span>
    </div>
  );
}

// Fixed stack at the bottom centre. Does not block clicks around the toasts.
export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
