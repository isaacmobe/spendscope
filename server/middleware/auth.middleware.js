import jwt from "jsonwebtoken";
import { HttpError } from "../utils/validate.js";

export const COOKIE_NAME = "token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Sign a login token that only carries the user id.
export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" });

// The token lives in an httpOnly cookie so page scripts (and any XSS) cannot read it.
export const setAuthCookie = (res, userId) =>
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SEVEN_DAYS_MS
  });

export const clearAuthCookie = (res) =>
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

/**
 * requireAuth
 * -----------
 * Verifies the cookie and exposes req.userId. Every data route sits behind this,
 * and controllers always filter by req.userId so users only ever see their own data.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new HttpError(401, "Please log in."));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Session expired. Please log in again."));
  }
}
