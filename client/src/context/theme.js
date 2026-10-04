import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

// { theme: "light" | "dark", dark: boolean, toggle(), setTheme(value) }
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return ctx;
}
