import { createContext, useContext } from "react";

// Context object and hook live here (not in the provider file) so the provider file
// only exports a component, which keeps hot reloading reliable.
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
