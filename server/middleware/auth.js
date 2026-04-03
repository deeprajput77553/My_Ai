import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_TOKEN_MISSING",
          message: "Authentication token is required",
          timestamp: new Date(),
        },
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_USER_NOT_FOUND",
          message: "User not found",
          timestamp: new Date(),
        },
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_INVALID_TOKEN",
          message: "Invalid authentication token",
          timestamp: new Date(),
        },
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_TOKEN_EXPIRED",
          message: "Authentication token has expired",
          timestamp: new Date(),
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (user) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Admin authorization middleware
 * Must be used AFTER authenticate middleware
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
  }
  next();
};

/**
 * Active user check middleware
 * Blocks pending or blocked users from accessing the app
 * Must be used AFTER authenticate middleware
 */
export const isActive = (req, res, next) => {
  if (!req.user) return next();
  if (req.user.status === "blocked") {
    return res.status(403).json({
      success: false,
      error: { code: "ACCOUNT_BLOCKED", message: "Your account has been blocked. Contact admin." },
    });
  }
  if (req.user.status === "pending") {
    return res.status(403).json({
      success: false,
      error: { code: "ACCOUNT_PENDING", message: "Your account is pending admin approval." },
    });
  }
  next();
};
