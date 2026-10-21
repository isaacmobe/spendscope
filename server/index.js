import dotenv from "dotenv";
import connectWithRetry from "./config/db.js";
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

// Start listening straight away and connect to the database in the background (retrying), so a
// database that is unreachable for a moment never takes the whole server down.
const PORT = process.env.PORT || 5000;
buildApp({ requireDb: true }).listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
connectWithRetry();
