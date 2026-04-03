import authService from "../services/authService.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import UserData from "../models/UserData.js";
import bcrypt from "bcryptjs";

// ── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register({ email, password, name });
    res.status(201).json({ success: true, user: result.user, token: result.token });
  } catch (error) {
    const statusCode = error.message.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: { code: "REGISTRATION_FAILED", message: error.message },
    });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    // Check if user is blocked
    const user = await User.findById(result.user._id);
    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_BLOCKED", message: "Your account has been blocked. Contact admin." },
      });
    }
    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_PENDING", message: "Your account is pending admin approval. Please wait." },
      });
    }

    res.json({
      success: true,
      user: { ...result.user, role: user.role, status: user.status },
      token: result.token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: "AUTH_INVALID_CREDENTIALS", message: error.message },
    });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    await authService.logout();
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: "LOGOUT_FAILED", message: error.message } });
  }
};

// ── Request password reset ────────────────────────────────────────────────────
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email is required" } });
    }
    const result = await authService.generatePasswordResetToken(email);
    res.json({ success: true, message: "Password reset token generated.", resetToken: result.resetToken });
  } catch (error) {
    res.json({ success: true, message: "If the email exists, a password reset link has been sent." });
  }
};

// ── Confirm password reset ────────────────────────────────────────────────────
export const confirmPasswordReset = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Reset token and new password are required" } });
    }
    await authService.resetPassword(resetToken, newPassword);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: "PASSWORD_RESET_FAILED", message: error.message } });
  }
};

// ── Get current user ──────────────────────────────────────────────────────────
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    res.json({ success: true, user });
  } catch (error) {
    res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: error.message } });
  }
};

// ── Update profile (name) ─────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: { message: "Name is required" } });
    const user = await User.findByIdAndUpdate(req.userId, { name: name.trim() }, { new: true }).select("-passwordHash");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Update email ──────────────────────────────────────────────────────────────
export const updateEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) return res.status(400).json({ success: false, error: { message: "Email and password are required" } });
    
    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, error: { message: "Incorrect password" } });

    // Check if email is already taken
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.userId } });
    if (existing) return res.status(409).json({ success: false, error: { message: "Email already in use" } });

    user.email = email.toLowerCase().trim();
    await user.save();
    const safeUser = user.toObject(); delete safeUser.passwordHash;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Change password ───────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: { message: "Current and new password required" } });

    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, error: { message: "Current password is incorrect" } });

    const validation = authService.validatePassword(newPassword);
    if (!validation.valid) return res.status(400).json({ success: false, error: { message: validation.errors.join(". ") } });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Delete account ────────────────────────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: { message: "Password is required to confirm deletion" } });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, error: { message: "Incorrect password" } });

    await Promise.all([
      Chat.deleteMany({ userId: req.userId }),
      UserData.deleteMany({ userId: req.userId }),
      User.findByIdAndDelete(req.userId),
    ]);

    res.json({ success: true, message: "Account and all data deleted permanently" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

// ── List all users ────────────────────────────────────────────────────────────
export const adminListUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Update user status (approve / block) ──────────────────────────────────────
export const adminUpdateUser = async (req, res) => {
  try {
    const { status, role } = req.body;
    const update = {};
    if (status && ["active", "blocked", "pending"].includes(status)) update.status = status;
    if (role && ["user", "admin"].includes(role)) update.role = role;
    
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Admin delete user ─────────────────────────────────────────────────────────
export const adminDeleteUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId.toString()) {
      return res.status(400).json({ success: false, error: { message: "Cannot delete your own admin account" } });
    }
    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });

    await Promise.all([
      Chat.deleteMany({ userId: targetId }),
      UserData.deleteMany({ userId: targetId }),
      User.findByIdAndDelete(targetId),
    ]);
    res.json({ success: true, message: `User ${user.email} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ── Admin create user ─────────────────────────────────────────────────────────
export const adminCreateUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const result = await authService.register({ email, password, name });
    
    // Set role and mark as active (admin-created users skip approval)
    const user = await User.findByIdAndUpdate(
      result.user._id,
      { role: role === "admin" ? "admin" : "user", status: "active" },
      { new: true }
    ).select("-passwordHash");
    
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
