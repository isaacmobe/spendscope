/**
 * Tiny event bus between the UI and the 3D scene.
 * The finance code calls pulse() after something happens (earning added, money spent,
 * money saved) and the ambient scene listens and plays a matching animation.
 * Keeping it a plain EventTarget means the UI never imports Three.js.
 */
const bus = new EventTarget();

export const pulse = (kind) => bus.dispatchEvent(new CustomEvent("pulse", { detail: kind }));

export function onPulse(handler) {
  const listener = (e) => handler(e.detail);
  bus.addEventListener("pulse", listener);
  return () => bus.removeEventListener("pulse", listener);
}
