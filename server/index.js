import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { buildApp } from "./app.js";
import { assertConfig } from "./config/check.js";

// Load environment variables BEFORE anything reads process.env
dotenv.config();

// Fail fast if the signing secret is missing or weak: logins would be forgeable.
try {
  assertConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// Connect first, then start accepting requests.
await connectDB();

const PORT = process.env.PORT || 5000;
buildApp().listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
