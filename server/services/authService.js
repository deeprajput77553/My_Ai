import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * AuthService - Handles user authentication operations
 * 
 * Features:
 * - User registration with password hashing (bcrypt, 10 rounds)
 * - User login with JWT token generation (7-day expiration)
 * - Password complexity validation
 * - Password reset functionality
 */
class AuthService {
  /**
   * Validate password complexity
   * Requirements: 8+ characters, 1 uppercase letter, 1 number
   * 
   * @param {string} password - Password to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hash password using bcrypt with 10 rounds
   * 
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compare password with hash
   * 
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token with 7-day expiration
   * 
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  /**
   * Verify JWT token
   * 
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register a new user
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.name - User name
   * @returns {Promise<Object>} { user, token }
   * @throws {Error} If validation fails or user already exists
   */
  async register({ email, password, name }) {
    // Validate required fields
    if (!email || !password || !name) {
      throw new Error("Email, password, and name are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate password complexity
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(". "));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
    });

    // Generate token
    const token = this.generateToken(user);

    // Return user without password hash
    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Login user
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} { user, token }
   * @throws {Error} If credentials are invalid
   */
  async login({ email, password }) {
    // Validate required fields
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = this.generateToken(user);

    // Return user without password hash
    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Logout user (client-side token removal)
   * Note: JWT tokens are stateless, so logout is handled client-side
   * This method is provided for consistency and future enhancements
   * 
   * @returns {Promise<Object>} { success: true }
   */
  async logout() {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // This method can be extended to implement token blacklisting if needed
    return { success: true };
  }

  /**
   * Generate password reset token
   * 
   * @param {string} email - User email
   * @returns {Promise<Object>} { resetToken, user }
   * @throws {Error} If user not found
   */
  async generatePasswordResetToken(email) {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("User not found");
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user._id.toString(), type: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      resetToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Reset password using reset token
   * 
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} { success: true, user }
   * @throws {Error} If token is invalid or password validation fails
   */
  async resetPassword(resetToken, newPassword) {
    // Verify reset token
    const decoded = this.verifyToken(resetToken);
    if (!decoded || decoded.type !== "password-reset") {
      throw new Error("Invalid or expired reset token");
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(". "));
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    return {
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Get user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object without password hash
   * @throws {Error} If user not found
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export default new AuthService();
