import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api";
import { AuthContext } from "./auth";

/**
 * AuthProvider
 * ------------
 * Owns who is logged in. On load it asks the server "who am I?" (the httpOnly cookie
 * is sent automatically), so a page refresh keeps you logged in.
 * status: "loading" while that first check runs, then "ready".
 * recoveryCode: a one-time code the server returns after signup, recovery or regeneration. It is
 * kept here only until the person confirms they saved it.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [recoveryCode, setRecoveryCode] = useState(null);

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
  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    setUser(res.data);
    setRecoveryCode(res.recoveryCode);
  }, []);
  // Forgot password: reset with the recovery code. Logs in and issues a new code.
  const recover = useCallback(async (payload) => {
    const res = await authApi.recover(payload);
    setUser(res.data);
    setRecoveryCode(res.recoveryCode);
  }, []);
  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
    setRecoveryCode(null);
  }, []);
  const updateSettings = useCallback(async (payload) => setUser((await authApi.updateSettings(payload)).data), []);
  const changePassword = useCallback((currentPassword, newPassword) => authApi.changePassword({ currentPassword, newPassword }), []);
  const regenerateRecoveryCode = useCallback(async (password) => {
    const res = await authApi.newRecoveryCode({ password });
    setUser(res.data);
    setRecoveryCode(res.recoveryCode);
  }, []);
  const deleteAccount = useCallback(async (password) => {
    await authApi.deleteAccount({ password });
    setUser(null);
    setRecoveryCode(null);
  }, []);
  const dismissRecoveryCode = useCallback(() => setRecoveryCode(null), []);

  const value = useMemo(
    () => ({ user, status, recoveryCode, dismissRecoveryCode, login, register, recover, logout, updateSettings, changePassword, regenerateRecoveryCode, deleteAccount }),
    [user, status, recoveryCode, dismissRecoveryCode, login, register, recover, logout, updateSettings, changePassword, regenerateRecoveryCode, deleteAccount]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
