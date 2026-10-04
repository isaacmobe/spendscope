import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { buildApp } from "./app.js";

// Load environment variables BEFORE anything reads process.env
dotenv.config();

// Fail fast if the signing secret is missing or weak: logins would be forgeable.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random string of at least 32 characters.");
  process.exit(1);
}

// Connect first, then start accepting requests.
await connectDB();

const PORT = process.env.PORT || 5000;
buildApp().listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
