import express from "express";
import {
  register, login, logout,
  requestPasswordReset, confirmPasswordReset,
  getCurrentUser, deleteAccount,
  updateProfile, updateEmail, changePassword,
  adminListUsers, adminUpdateUser, adminDeleteUser, adminCreateUser,
} from "../controllers/authController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", requestPasswordReset);
router.post("/reset-password/confirm", confirmPasswordReset);

// Protected routes (auth required)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);
router.delete("/account", authenticate, deleteAccount);
router.put("/profile", authenticate, updateProfile);
router.put("/email", authenticate, updateEmail);
router.put("/password", authenticate, changePassword);

// Admin routes (auth + admin role required)
router.get("/admin/users", authenticate, isAdmin, adminListUsers);
router.put("/admin/users/:id", authenticate, isAdmin, adminUpdateUser);
router.delete("/admin/users/:id", authenticate, isAdmin, adminDeleteUser);
router.post("/admin/users", authenticate, isAdmin, adminCreateUser);

export default router;
