import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api";
import { AuthContext } from "./auth";

/**
 * AuthProvider
 * ------------
 * Owns who is logged in. On load it asks the server "who am I?" (the httpOnly cookie
 * is sent automatically), so a page refresh keeps you logged in.
 * status: "loading" while that first check runs, then "ready".
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((res) => active && setUser(res.data))
      .catch(() => active && setUser(null))
      .finally(() => active && setStatus("ready"));
    return () => {
      active = false;
    };
  }, []);

  // Session expired somewhere else in the app: go back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("spendscope:unauthorized", onUnauthorized);
    return () => window.removeEventListener("spendscope:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (payload) => setUser((await authApi.login(payload)).data), []);
  const register = useCallback(async (payload) => setUser((await authApi.register(payload)).data), []);
  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);
  const updateSettings = useCallback(async (payload) => setUser((await authApi.updateSettings(payload)).data), []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateSettings }),
    [user, status, login, register, logout, updateSettings]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
