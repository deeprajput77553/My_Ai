import express from "express";
import {
  register,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  getCurrentUser,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", requestPasswordReset);
router.post("/reset-password/confirm", confirmPasswordReset);

// Protected routes (authentication required)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);

export default router;
