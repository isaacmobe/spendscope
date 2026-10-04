import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.middleware.js";
import { changePassword, deleteAccount, login, logout, me, recover, register, regenerateRecoveryCode, updateSettings } from "../controllers/auth.controller.js";

const router = express.Router();

// Brute-force protection: login and signup attempts are throttled hard per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again later." }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/recover", authLimiter, recover);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.patch("/settings", requireAuth, updateSettings);
// Sensitive actions re-check the password and share the strict limiter.
router.post("/password", requireAuth, authLimiter, changePassword);
router.post("/recovery-code", requireAuth, authLimiter, regenerateRecoveryCode);
router.delete("/account", requireAuth, authLimiter, deleteAccount);

export default router;
