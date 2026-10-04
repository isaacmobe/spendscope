import { randomInt } from "node:crypto";

/**
 * Recovery codes
 * --------------
 * A one-time code shown when you sign up (and again whenever you generate a new one). It lets
 * you set a new password if you forget yours. We store only a scrypt hash of it, like a password,
 * so nobody (including us) can read it back. 32 characters ^ 16 positions = 80 bits of entropy.
 * The alphabet leaves out look-alikes (I, O, 0, 1) so the code is easy to copy by hand.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 16;

export function generateRecoveryCode() {
  let raw = "";
  for (let i = 0; i < LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw.match(/.{4}/g).join("-");
}

// Accept any casing, spaces or dashes when the user types it back in.
export const normalizeRecoveryCode = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
