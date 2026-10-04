/**
 * Startup checks shared by the long-running server (index.js) and the Vercel function (api/index.js).
 * Throws a clear error instead of letting the app run with a missing or weak secret.
 */
export function assertConfig() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters.");
  }
}
