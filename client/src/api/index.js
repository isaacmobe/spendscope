import { http } from "./http";

/**
 * API layer: raw axios calls live here, never inside components.
 * Every method returns the response body: { success, data, ... }.
 */
const body = (promise) => promise.then((res) => res.data);

// Same four calls for every user-owned resource.
const resource = (path) => ({
  list: () => body(http.get(path)),
  create: (payload) => body(http.post(path, payload)),
  update: (id, payload) => body(http.put(`${path}/${id}`, payload)),
  remove: (id) => body(http.delete(`${path}/${id}`))
});

export const transactionsApi = resource("/api/transactions");
export const goalsApi = resource("/api/goals");
export const billsApi = resource("/api/bills");

export const authApi = {
  register: (payload) => body(http.post("/api/auth/register", payload)),
  login: (payload) => body(http.post("/api/auth/login", payload)),
  logout: () => body(http.post("/api/auth/logout")),
  me: () => body(http.get("/api/auth/me")),
  updateSettings: (payload) => body(http.patch("/api/auth/settings", payload)),
  recover: (payload) => body(http.post("/api/auth/recover", payload)),
  changePassword: (payload) => body(http.post("/api/auth/password", payload)),
  newRecoveryCode: (payload) => body(http.post("/api/auth/recovery-code", payload)),
  deleteAccount: (payload) => body(http.delete("/api/auth/account", { data: payload }))
};
