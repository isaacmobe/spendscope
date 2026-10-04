import { useCallback, useEffect, useMemo, useState } from "react";
import { APP } from "../config/app";
import { ThemeContext } from "./theme";

const THEME_COLOR = { light: "#f1eee6", dark: "#16161a" };

// localStorage can throw (private mode, blocked storage), so every access is wrapped.
const readSaved = () => {
  try {
    const value = localStorage.getItem(APP.storage.theme);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};
const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/**
 * ThemeProvider
 * -------------
 * Light or dark. Starts from the saved choice, else from the operating system, and keeps following
 * the system until the user picks one. The matching class is also set before first paint by a tiny
 * script in index.html, so there is no flash.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readSaved() || systemTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  // Follow system changes only while the user has not chosen explicitly.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!readSaved()) setThemeState(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    try {
      localStorage.setItem(APP.storage.theme, value);
    } catch {
      /* the choice still applies for this visit */
    }
  }, []);

  const value = useMemo(() => ({ theme, dark: theme === "dark", setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
