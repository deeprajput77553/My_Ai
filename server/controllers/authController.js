import authService from "../services/authService.js";

/**
 * Register a new user
 * POST /api/auth/register
 * 
 * Body: { email, password, name }
 * Response: { success: true, user, token }
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const result = await authService.register({ email, password, name });

    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    // Determine appropriate status code
    let statusCode = 400;
    if (error.message.includes("already exists")) {
      statusCode = 409; // Conflict
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: "REGISTRATION_FAILED",
        message: error.message,
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 * 
 * Body: { email, password }
 * Response: { success: true, user, token }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: error.message,
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 * 
 * Response: { success: true }
 */
export const logout = async (req, res) => {
  try {
    const result = await authService.logout();

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "LOGOUT_FAILED",
        message: error.message,
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Request password reset
 * POST /api/auth/reset-password
 * 
 * Body: { email }
 * Response: { success: true, message, resetToken }
 * 
 * Note: In production, resetToken should be sent via email, not returned in response
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email is required",
          timestamp: new Date(),
        },
      });
    }

    const result = await authService.generatePasswordResetToken(email);

    // In production, send resetToken via email instead of returning it
    // For development/testing, we return it in the response
    res.status(200).json({
      success: true,
      message: "Password reset token generated. In production, this would be sent via email.",
      resetToken: result.resetToken, // Remove this in production
    });
  } catch (error) {
    // Return success even if user not found (security best practice)
    // Don't reveal whether email exists in the system
    res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent.",
    });
  }
};

/**
 * Confirm password reset
 * POST /api/auth/reset-password/confirm
 * 
 * Body: { resetToken, newPassword }
 * Response: { success: true, message }
 */
export const confirmPasswordReset = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Reset token and new password are required",
          timestamp: new Date(),
        },
      });
    }

    await authService.resetPassword(resetToken, newPassword);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: "PASSWORD_RESET_FAILED",
        message: error.message,
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 * 
 * Headers: { Authorization: 'Bearer <token>' }
 * Response: { success: true, user }
 */
export const getCurrentUser = async (req, res) => {
  try {
    // req.userId is set by authenticate middleware
    const user = await authService.getUserById(req.userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: error.message,
        timestamp: new Date(),
      },
    });
  }
};
