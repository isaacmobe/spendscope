import mongoose from "mongoose";

// Small pool and quick failure: serverless functions open many short-lived connections,
// and a free Atlas cluster allows only 500 of them in total.
const options = { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 };

/**
 * connectWithRetry()
 * - For the long-running server: keep trying until the database answers, instead of crashing.
 *   The API stays up meanwhile and answers 503, so a wrong Atlas IP allow-list or a short outage
 *   is fixed by the next successful attempt, without restarting anything.
 */
const RETRY_MS = 5000;
const connectWithRetry = async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, options);
      console.log(`MongoDB connected Host: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection failed (attempt ${attempt}): ${error.message}`);
      if (/whitelist|allow.?list|IP/i.test(error.message)) {
        console.error("Hint: in MongoDB Atlas open Network Access and add your current IP address (or 0.0.0.0/0 for testing).");
      }
      console.error(`Retrying in ${RETRY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
};

/**
 * connectOnce()
 * - For serverless (Vercel): the module stays alive between requests while the function is warm,
 *   so reuse the same connection instead of opening a new one per request.
 */
let pending = null;
export function connectOnce() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!pending) {
    pending = mongoose.connect(process.env.MONGO_URI, options).catch((err) => {
      pending = null; // allow a retry on the next request
      throw err;
    });
  }
  return pending;
}

export default connectWithRetry;
