import { http } from "./http";

/**
 * transactions API layer:
 * - keeps raw axios calls out of UI components
 * - easier to reuse, test, and explain in interviews
 */
export const transactionsApi = {
  getAll: async () => {
    const res = await http.get("/api/transactions");
    return res.data; // { success, count, data }
  },

  create: async (payload) => {
    const res = await http.post("/api/transactions", payload);
    return res.data; // { success, data }
  },

  update: async (id, payload) => {
    // PUT request updates an existing transaction
    const res = await http.put(`/api/transactions/${id}`, payload);
    return res.data; // { success, data: updatedTransaction }
  },

  remove: async (id) => {
    const res = await http.delete(`/api/transactions/${id}`);
    return res.data; // { success, data: { id } }
  }
};
