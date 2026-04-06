/**
 * Auth Routes
 * Handles all authentication and password reset endpoints.
 *
 * Routes:
 *  POST /api/auth/register         - Register a new user (for testing)
 *  POST /api/auth/login            - Login user
 *  POST /api/auth/forgot-password  - Request password reset link
 *  GET  /api/auth/verify-token/:token - Verify reset token validity
 *  POST /api/auth/reset-password   - Submit new password with token
 */

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/emailService");
const {
  generateResetToken,
  hashToken,
  getTokenExpiry,
} = require("../utils/tokenUtils");

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/** Limit forgot-password requests to 5 per 15 minutes per IP */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many reset requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limit reset-password attempts to 10 per hour per IP */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again in an hour.",
  },
});

// ─── Validation Middleware ────────────────────────────────────────────────────

/** Extract and return validation errors as a clean response */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// ─── Route: Register (Test Utility) ──────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new user account for testing the reset flow.
 */
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      // Create new user (password hashed by pre-save hook)
      const user = await User.create({ name, email, password });

      return res.status(201).json({
        success: true,
        message: "Account created successfully.",
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ─── Route: Login ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Authenticates user credentials.
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Include password field (excluded by default via select: false)
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      return res.json({
        success: true,
        message: "Login successful.",
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ─── Route: Forgot Password ───────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * 1. Checks if user exists in DB
 * 2. Generates a secure reset token
 * 3. Hashes and stores the token with expiry in DB
 * 4. Sends reset link email to user
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email address"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Step 1: Check if user exists
      const user = await User.findOne({ email });

      if (!user) {
        // Return 404 — explicit error message as specified in task
        return res.status(404).json({
          success: false,
          message:
            "No account found with this email address. Please check and try again.",
        });
      }

      // Step 2: Generate a plain random token (sent in URL)
      const plainToken = generateResetToken();

      // Step 3: Hash the token before storing in DB (security best practice)
      const hashedToken = hashToken(plainToken);

      // Step 4: Set expiry from environment config (default: 15 minutes)
      const tokenExpiry = getTokenExpiry();

      // Step 5: Store hashed token + expiry in DB
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpiry = tokenExpiry;
      await user.save();

      // Step 6: Build reset link with plain (un-hashed) token
      const frontendURL =
        process.env.FRONTEND_URL || "http://localhost:3000";
      const resetLink = `${frontendURL}/reset-password/${plainToken}`;

      // Step 7: Send email
      await sendPasswordResetEmail(
        user.email,
        user.name,
        resetLink,
        parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 15
      );

      return res.json({
        success: true,
        message:
          "Password reset link has been sent to your email. Please check your inbox (and spam folder).",
        // Only expose preview URL in development
        ...(process.env.NODE_ENV === "development" && {
          devNote: "Check server console for Ethereal email preview URL",
        }),
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later.",
      });
    }
  }
);

// ─── Route: Verify Token ──────────────────────────────────────────────────────

/**
 * GET /api/auth/verify-token/:token
 * 1. Retrieves the plain token from URL
 * 2. Hashes it and looks up in DB
 * 3. Checks expiry — responds with validity status
 */
router.get("/verify-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is missing.",
      });
    }

    // Hash the incoming token to match DB-stored hash
    const hashedToken = hashToken(token);

    // Look up user by hashed token
    const user = await User.findOne({ resetPasswordToken: hashedToken });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset link. Please request a new password reset.",
        code: "INVALID_TOKEN",
      });
    }

    // Check expiry
    if (!user.isResetTokenValid()) {
      // Clear the expired token from DB
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "This reset link has expired. Please request a new password reset.",
        code: "TOKEN_EXPIRED",
      });
    }

    // Token is valid — return user's email (masked) for UI display
    const maskedEmail = user.email.replace(
      /(.{2})(.*)(?=@)/,
      (_, a, b) => a + "*".repeat(b.length)
    );

    return res.json({
      success: true,
      message: "Token is valid.",
      email: maskedEmail,
      expiresAt: user.resetPasswordExpiry,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ─── Route: Reset Password ────────────────────────────────────────────────────

/**
 * POST /api/auth/reset-password
 * 1. Validates new password
 * 2. Hashes the token from request body and looks up in DB
 * 3. Verifies token validity and expiry
 * 4. Updates password (hashed by pre-save hook)
 * 5. Clears reset token from DB
 */
router.post(
  "/reset-password",
  resetPasswordLimiter,
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must include at least one uppercase letter, one lowercase letter, and one number"
      ),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      // Hash the incoming token to match stored hash
      const hashedToken = hashToken(token);

      // Find user by hashed reset token (include password field for update)
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
      }).select("+password");

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid reset link. Please request a new password reset.",
          code: "INVALID_TOKEN",
        });
      }

      // Check if token has expired
      if (!user.isResetTokenValid()) {
        // Clean up expired token
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        await user.save();

        return res.status(400).json({
          success: false,
          message:
            "This reset link has expired. Please request a new password reset.",
          code: "TOKEN_EXPIRED",
        });
      }

      // Update password (pre-save hook will hash it)
      user.password = password;

      // Clear the reset token fields from DB
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;

      await user.save();

      return res.json({
        success: true,
        message:
          "Your password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  }
);

module.exports = router;
