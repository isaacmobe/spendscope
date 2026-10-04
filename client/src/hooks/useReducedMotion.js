import { useMediaQuery } from "./useMediaQuery";

// True when the OS asks for less motion; animations and the 3D scene respect it.
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
