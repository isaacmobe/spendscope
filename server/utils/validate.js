/**
 * validate.js
 * -----------
 * Tiny input-validation helpers shared by every controller.
 * Why: the API must never trust req.body. Each helper checks ONE value and
 * throws an HttpError(400) with a clear message, so controllers stay short and
 * unknown fields are dropped instead of being written to the database.
 */

// Error that carries an HTTP status; the central error handler reads `status`.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const bad = (message) => new HttpError(400, message);

// Trimmed string. Rejects non-strings (e.g. objects used for operator injection).
export function str(value, label, { max = 100, required = false } = {}) {
  if (typeof value !== "string") throw bad(`${label} must be text.`);
  const out = value.trim();
  if (required && !out) throw bad(`${label} is required.`);
  if (out.length > max) throw bad(`${label} must be ${max} characters or less.`);
  return out;
}

// Finite number inside [min, max]. Strings such as "12.5" are accepted from forms.
export function num(value, label, { min = 0, max = 1e12, exclusiveMin = false } = {}) {
  const n = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (value === "" || !Number.isFinite(n)) throw bad(`${label} must be a number.`);
  if (exclusiveMin ? n <= min : n < min) {
    throw bad(`${label} must be ${exclusiveMin ? "greater than" : "at least"} ${min}.`);
  }
  if (n > max) throw bad(`${label} must be ${max} or less.`);
  return n;
}

export function int(value, label, opts) {
  const n = num(value, label, opts);
  if (!Number.isInteger(n)) throw bad(`${label} must be a whole number.`);
  return n;
}

// Value must be one of a fixed list.
export function oneOf(value, label, list) {
  if (!list.includes(value)) throw bad(`${label} must be one of: ${list.join(", ")}.`);
  return value;
}

// Valid date from an ISO string or timestamp.
export function date(value, label) {
  if (typeof value !== "string" && typeof value !== "number") throw bad(`${label} must be a date.`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw bad(`${label} must be a valid date.`);
  return d;
}

// 24-hex-character Mongo id; anything else is rejected before touching the DB.
export function objectId(value, label = "id") {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) throw bad(`Invalid ${label}.`);
  return value;
}

/**
 * parseBody(body, spec, { partial })
 * ----------------------------------
 * spec maps field -> [parseFn, required]. Only fields named in spec are read
 * (whitelist = no mass assignment). With partial=true (updates) missing fields
 * are skipped instead of reported as required.
 */
export function parseBody(body, spec, { partial = false } = {}) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw bad("Request body must be a JSON object.");
  }
  const out = {};
  for (const [key, [parse, required]] of Object.entries(spec)) {
    const value = body[key];
    if (value === undefined || value === null) {
      if (required && !partial) throw bad(`${key} is required.`);
      continue;
    }
    out[key] = parse(value);
  }
  if (partial && Object.keys(out).length === 0) throw bad("No valid fields to update.");
  return out;
}
