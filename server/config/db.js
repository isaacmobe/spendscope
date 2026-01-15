import mongoose from "mongoose";

/**
 * connectDB()
 * - Single responsibility: connect to MongoDB using Mongoose.
 * - Why: keeps server startup (index.js) clean and makes DB logic reusable/testable.
 */
const connectDB = async () => {
  try {
    // process.env.MONGO_URI comes from your .env file
    // mongoose.connect returns a connection object when successful
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Helpful log so you know exactly which host you're connected to
    console.log(`MongoDB connected ✅ Host: ${conn.connection.host}`);
  } catch (error) {
    // If DB connection fails, your API can’t function correctly.
    // We "fail fast" by stopping the process.
    console.error("MongoDB connection failed ❌:", error.message);
    process.exit(1);
  }
};

export default connectDB;
