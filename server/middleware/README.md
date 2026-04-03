# Authentication Middleware

## Overview

This directory contains authentication middleware for protecting API routes with JWT tokens.

## Middleware Functions

### `authenticate`

Required authentication middleware. Validates JWT token and attaches user to request.

**Usage:**
```javascript
import { authenticate } from "./middleware/auth.js";

// Protect a single route
app.get("/api/protected", authenticate, (req, res) => {
  // req.user and req.userId are available
  res.json({ user: req.user });
});

// Protect all routes in a router
app.use("/api/chat", authenticate, chatRoutes);
```

**Request Properties Added:**
- `req.user` - Full user object (without passwordHash)
- `req.userId` - User's MongoDB ObjectId

**Error Responses:**
- `401 AUTH_TOKEN_MISSING` - No Authorization header
- `401 AUTH_INVALID_TOKEN` - Invalid JWT token
- `401 AUTH_TOKEN_EXPIRED` - Expired JWT token
- `401 AUTH_USER_NOT_FOUND` - User no longer exists
- `500 INTERNAL_ERROR` - Server error

### `optionalAuth`

Optional authentication middleware. Attaches user if token is present, but doesn't fail if missing.

**Usage:**
```javascript
import { optionalAuth } from "./middleware/auth.js";

// Route works with or without authentication
app.get("/api/public", optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({ message: "Hello " + req.user.name });
  } else {
    // User is not authenticated
    res.json({ message: "Hello guest" });
  }
});
```

## Token Format

Tokens should be sent in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## JWT Payload

The JWT token contains:
```javascript
{
  userId: "user-mongodb-id",
  iat: 1234567890,  // issued at
  exp: 1234567890   // expiration (7 days from issue)
}
```

## Environment Variables

Required environment variable:
- `JWT_SECRET` - Secret key for signing JWT tokens (set in `.env`)

## Error Response Format

All authentication errors follow this format:

```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    timestamp: "2024-01-01T00:00:00.000Z"
  }
}
```

## Security Notes

1. **JWT_SECRET**: Use a long, random string in production (minimum 32 characters)
2. **HTTPS**: Always use HTTPS in production to protect tokens in transit
3. **Token Storage**: Store tokens securely on the client (httpOnly cookies or secure storage)
4. **Token Expiration**: Tokens expire after 7 days (configurable in AuthService)
5. **Password Hashing**: Passwords are hashed with bcrypt (10 rounds minimum)

## Example: Protected Route

```javascript
import express from "express";
import { authenticate } from "./middleware/auth.js";
import Chat from "./models/Chat.js";

const router = express.Router();

// All routes in this router require authentication
router.use(authenticate);

// Get user's chats
router.get("/", async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(50);
    
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to fetch chats",
        timestamp: new Date()
      }
    });
  }
});

export default router;
```

## Testing Authentication

### Valid Token
```bash
curl -H "Authorization: Bearer <valid-token>" \
  http://localhost:5000/api/protected
```

### Missing Token
```bash
curl http://localhost:5000/api/protected
# Returns: 401 AUTH_TOKEN_MISSING
```

### Invalid Token
```bash
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:5000/api/protected
# Returns: 401 AUTH_INVALID_TOKEN
```

## Next Steps

1. Implement AuthService for user registration and login (Task 2)
2. Apply authentication middleware to existing routes
3. Update frontend to include JWT tokens in requests
4. Implement token refresh mechanism (optional)
