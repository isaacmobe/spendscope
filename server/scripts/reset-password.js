import "dotenv/config";
import readline from "node:readline";
import mongoose from "mongoose";
import User from "../models/User.js";
import { assertConfig } from "../config/check.js";
import { hashPassword } from "../utils/password.js";
import { generateRecoveryCode, normalizeRecoveryCode } from "../utils/recovery.js";

/**
 * reset-password.js
 * -----------------
 * Owner-only recovery for a forgotten password. Passwords are stored as one-way hashes, so they
 * can never be read back; this script instead sets a NEW one directly in your database. It needs
 * your server/.env (database access), so only the person who runs the server can use it.
 *
 *   npm run reset-password                    lists the registered emails
 *   npm run reset-password -- you@mail.com    sets a new password for that account
 */

// Ask a question in the terminal; hidden answers print * instead of the typed characters.
function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => rl.output.write(muted && !text.includes(question) ? "*" : text);
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    muted = hidden;
  });
}

async function main() {
  assertConfig();
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    const users = await User.find({}, "email name createdAt").sort({ createdAt: 1 });
    console.log(users.length ? "Registered accounts:" : "No accounts found.");
    users.forEach((u) => console.log(`  ${u.email}${u.name ? `  (${u.name})` : ""}`));
    console.log("\nRun again with an email to reset it:  npm run reset-password -- you@example.com");
    return;
  }

  const user = await User.findOne({ email }).select("+passwordHash +recoveryHash");
  if (!user) {
    console.error(`No account with the email ${email}.`);
    process.exitCode = 1;
    return;
  }

  const first = await ask("New password (8 to 128 characters): ", true);
  if (first.length < 8 || first.length > 128) {
    console.error("The password must be 8 to 128 characters.");
    process.exitCode = 1;
    return;
  }
  if (first !== (await ask("Type it again: ", true))) {
    console.error("The two passwords did not match. Nothing was changed.");
    process.exitCode = 1;
    return;
  }

  // Also issue a fresh recovery code so the next reset does not need this script.
  const code = generateRecoveryCode();
  user.passwordHash = await hashPassword(first);
  user.recoveryHash = await hashPassword(normalizeRecoveryCode(code));
  user.recoveryCreatedAt = new Date();
  await user.save();

  console.log(`\nPassword updated for ${email}.`);
  console.log(`New recovery code (save it somewhere safe, it is shown only once): ${code}`);
}

main()
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
