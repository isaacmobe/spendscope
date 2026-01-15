import axios from "axios";

/**
 * Axios instance:
 * - A single place to configure how we talk to our backend
 * - In dev, Vite proxy forwards /api to http://localhost:5000
 * - Later (deployment) you can swap baseURL easily
 */
export const http = axios.create({
  baseURL: "" // keep empty so "/api/..." works with Vite proxy
});
