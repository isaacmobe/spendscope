import User, { CURRENCIES } from "../models/User.js";
import { clearAuthCookie, setAuthCookie } from "../middleware/auth.middleware.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { HttpError, num, oneOf, parseBody, str } from "../utils/validate.js";

// Shape returned to the client: never includes the password hash.
const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name, settings: u.settings });

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
  const user = await User.create({
    email: body.email,
    name: body.name || "",
    passwordHash: await hashPassword(body.password)
  });
  setAuthCookie(res, user._id);
  res.status(201).json({ success: true, data: publicUser(user) });
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
  if (body.allocation) $set["settings.allocation"] = body.allocation;

  const user = await User.findByIdAndUpdate(req.userId, { $set }, { returnDocument: "after", runValidators: true });
  if (!user) throw new HttpError(401, "Please log in.");
  res.json({ success: true, data: publicUser(user) });
};
