import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * password.js
 * -----------
 * Password hashing with scrypt from Node's standard library (a memory-hard KDF
 * recommended by OWASP). No native add-on to compile, unlike bcrypt/argon2.
 * Stored format: "<salt hex>:<hash hex>".
 */
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = String(stored).split(":");
  if (!saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  const expected = Buffer.from(keyHex, "hex");
  // timingSafeEqual avoids leaking how many bytes matched through timing
  return key.length === expected.length && timingSafeEqual(key, expected);
}
