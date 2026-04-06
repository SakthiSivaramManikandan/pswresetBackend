/**
 * Token Utility
 * Generates cryptographically secure random tokens for password reset.
 */

const crypto = require("crypto");

/**
 * Generate a secure random token string
 * @returns {string} - Hex-encoded 32-byte random token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash a token before storing in DB (adds a layer of security)
 * @param {string} token - Plain token to hash
 * @returns {string} - SHA-256 hashed token
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Calculate token expiry timestamp
 * @param {number} minutes - Minutes until expiry (default: from env or 15)
 * @returns {Date} - Expiry Date object
 */
const getTokenExpiry = (minutes = null) => {
  const expiryMinutes =
    minutes ||
    parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES) ||
    15;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

module.exports = {
  generateResetToken,
  hashToken,
  getTokenExpiry,
};
