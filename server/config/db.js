import mongoose from "mongoose";

// Small pool and quick failure: serverless functions open many short-lived connections,
// and a free Atlas cluster allows only 500 of them in total.
const options = { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 };

/**
 * connectDB()
 * - For the long-running server: connect once at startup and stop the process if it fails.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`MongoDB connected Host: ${conn.connection.host}`);
  } catch (error) {
    // If the database is unreachable the API cannot work, so fail fast.
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
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

export default connectDB;
