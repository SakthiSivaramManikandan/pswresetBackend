/**
 * User Model
 * Defines the MongoDB schema for users including
 * password reset token and expiry fields.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },

    // --- Password Reset Fields ---
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: true, // For simplicity; extend with email verification if needed
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: Hash password before saving to DB
 */
userSchema.pre("save", async function (next) {
  // Only hash if the password field was modified
  if (!this.isModified("password")) return next();

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method: Compare entered password with hashed password
 * @param {string} enteredPassword - Plain text password to compare
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance method: Check if reset token is still valid (not expired)
 * @returns {boolean}
 */
userSchema.methods.isResetTokenValid = function () {
  return (
    this.resetPasswordToken !== null &&
    this.resetPasswordExpiry !== null &&
    this.resetPasswordExpiry > Date.now()
  );
};

/**
 * Instance method: Clear reset token fields after use
 */
userSchema.methods.clearResetToken = async function () {
  this.resetPasswordToken = null;
  this.resetPasswordExpiry = null;
  await this.save();
};

module.exports = mongoose.model("User", userSchema);
