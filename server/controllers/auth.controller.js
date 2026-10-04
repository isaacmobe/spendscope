import User, { CURRENCIES } from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
import Bill from "../models/Bill.js";
import { clearAuthCookie, setAuthCookie } from "../middleware/auth.middleware.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateRecoveryCode, normalizeRecoveryCode } from "../utils/recovery.js";
import { HttpError, int, num, oneOf, parseBody, str } from "../utils/validate.js";

// Shape returned to the client: never includes the password hash.
const publicUser = (u) => ({
  id: u._id,
  email: u.email,
  name: u.name,
  settings: u.settings,
  hasRecoveryCode: Boolean(u.recoveryCreatedAt)
});

// Creates a recovery code and returns [plain code to show once, fields to store].
async function newRecovery() {
  const code = generateRecoveryCode();
  return [code, { recoveryHash: await hashPassword(normalizeRecoveryCode(code)), recoveryCreatedAt: new Date() }];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = (v) => {
  const e = str(v, "email", { max: 254, required: true }).toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, "Enter a valid email address.");
  return e;
};
const password = (v) => {
  if (typeof v !== "string" || v.length < 8 || v.length > 128) {
    throw new HttpError(400, "Password must be 8 to 128 characters.");
  }
  return v;
};

// A real hash to compare against when the email is unknown, so login timing
// does not reveal whether an account exists.
const DUMMY_HASH = await hashPassword("not-a-real-password");

export const register = async (req, res) => {
  const body = parseBody(req.body, {
    email: [email, true],
    password: [password, true],
    name: [(v) => str(v, "name", { max: 60 }), false]
  });
  const [recoveryCode, recovery] = await newRecovery();
  const user = await User.create({
    email: body.email,
    name: body.name || "",
    passwordHash: await hashPassword(body.password),
    ...recovery
  });
  setAuthCookie(res, user._id);
  // The recovery code is shown to the user ONCE; only its hash is stored.
  res.status(201).json({ success: true, data: publicUser(user), recoveryCode });
};

export const login = async (req, res) => {
  const body = parseBody(req.body, {
    email: [email, true],
    password: [(v) => str(v, "password", { max: 128, required: true }), true]
  });
  const user = await User.findOne({ email: body.email }).select("+passwordHash");
  const ok = await verifyPassword(body.password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password.");
  setAuthCookie(res, user._id);
  res.json({ success: true, data: publicUser(user) });
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
};

export const me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, "Please log in.");
  res.json({ success: true, data: publicUser(user) });
};

// PATCH /api/auth/settings: currency, exchange rate, allocation split
export const updateSettings = async (req, res) => {
  const body = parseBody(
    req.body,
    {
      currency: [(v) => oneOf(v, "currency", CURRENCIES), false],
      usdToKes: [(v) => num(v, "usdToKes", { min: 1, max: 10000 }), false],
      savingsApr: [(v) => num(v, "savingsApr", { min: 0, max: 30 }), false],
      emergencyMonths: [(v) => int(v, "emergencyMonths", { min: 1, max: 12 }), false],
      name: [(v) => str(v, "name", { max: 60 }), false],
      allocation: [
        (v) => {
          const a = parseBody(v, {
            needs: [(x) => num(x, "needs", { max: 100 }), true],
            wants: [(x) => num(x, "wants", { max: 100 }), true],
            savings: [(x) => num(x, "savings", { max: 100 }), true]
          });
          if (Math.round(a.needs + a.wants + a.savings) !== 100) {
            throw new HttpError(400, "Allocation must add up to 100%.");
          }
          return a;
        },
        false
      ]
    },
    { partial: true }
  );

  // Build dotted paths so only the provided settings change.
  const $set = {};
  if (body.name !== undefined) $set.name = body.name;
  if (body.currency) $set["settings.currency"] = body.currency;
  if (body.usdToKes) $set["settings.usdToKes"] = body.usdToKes;
  if (body.savingsApr !== undefined) $set["settings.savingsApr"] = body.savingsApr;
  if (body.emergencyMonths) $set["settings.emergencyMonths"] = body.emergencyMonths;
  if (body.allocation) $set["settings.allocation"] = body.allocation;

  const user = await User.findByIdAndUpdate(req.userId, { $set }, { returnDocument: "after", runValidators: true });
  if (!user) throw new HttpError(401, "Please log in.");
  res.json({ success: true, data: publicUser(user) });
};

// POST /api/auth/recover: set a new password with the recovery code (for a forgotten password).
export const recover = async (req, res) => {
  const body = parseBody(req.body, {
    email: [email, true],
    recoveryCode: [(v) => str(v, "recoveryCode", { max: 40, required: true }), true],
    newPassword: [password, true]
  });
  const user = await User.findOne({ email: body.email }).select("+recoveryHash");
  const ok = await verifyPassword(normalizeRecoveryCode(body.recoveryCode), user?.recoveryHash || DUMMY_HASH);
  // One generic message for "no such account", "no code set" and "wrong code".
  if (!user || !user.recoveryHash || !ok) throw new HttpError(401, "That email and recovery code do not match.");

  // The old code is single-use: replace it with a fresh one together with the new password.
  const [recoveryCode, recovery] = await newRecovery();
  user.passwordHash = await hashPassword(body.newPassword);
  user.recoveryHash = recovery.recoveryHash;
  user.recoveryCreatedAt = recovery.recoveryCreatedAt;
  await user.save();
  setAuthCookie(res, user._id);
  res.json({ success: true, data: publicUser(user), recoveryCode });
};

// Loads the logged-in user with their password hash and checks the password they just typed.
async function confirmPassword(req, typed) {
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) throw new HttpError(401, "Please log in.");
  if (!(await verifyPassword(typed, user.passwordHash))) throw new HttpError(403, "Your current password is not correct.");
  return user;
}

const typedPassword = (v) => str(v, "password", { max: 128, required: true });

// POST /api/auth/password: change the password (needs the current one).
export const changePassword = async (req, res) => {
  const body = parseBody(req.body, { currentPassword: [typedPassword, true], newPassword: [password, true] });
  const user = await confirmPassword(req, body.currentPassword);
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  res.json({ success: true });
};

// POST /api/auth/recovery-code: replace the recovery code (needs the password). Shown once.
export const regenerateRecoveryCode = async (req, res) => {
  const body = parseBody(req.body, { password: [typedPassword, true] });
  const user = await confirmPassword(req, body.password);
  const [recoveryCode, recovery] = await newRecovery();
  user.recoveryHash = recovery.recoveryHash;
  user.recoveryCreatedAt = recovery.recoveryCreatedAt;
  await user.save();
  res.json({ success: true, data: publicUser(user), recoveryCode });
};

// DELETE /api/auth/account: permanently delete the account and everything in it (needs the password).
export const deleteAccount = async (req, res) => {
  const body = parseBody(req.body, { password: [typedPassword, true] });
  const user = await confirmPassword(req, body.password);
  await Promise.all([Transaction.deleteMany({ user: user._id }), Goal.deleteMany({ user: user._id }), Bill.deleteMany({ user: user._id })]);
  await user.deleteOne();
  clearAuthCookie(res);
  res.json({ success: true });
};
