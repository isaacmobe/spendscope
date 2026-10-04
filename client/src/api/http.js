import axios from "axios";

/**
 * Axios instance.
 * - baseURL stays empty: "/api/..." is proxied to the server by Vite in development.
 * - withCredentials sends the httpOnly login cookie with every request.
 * - When any data request comes back 401 (session expired) we broadcast an event so
 *   the auth state can drop back to the login screen without every caller handling it.
 */
export const http = axios.create({ baseURL: "", withCredentials: true });

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.startsWith("/api/auth/")) {
      window.dispatchEvent(new Event("spendscope:unauthorized"));
    }
    return Promise.reject(error);
  }
);

// Readable message from an API error, with a fallback for network failures.
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;
