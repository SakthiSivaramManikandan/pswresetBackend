/**
 * Email Utility
 * Handles sending password reset emails using Nodemailer.
 * Supports both real SMTP and Ethereal (test) accounts.
 */

const nodemailer = require("nodemailer");

/**
 * Create a Nodemailer transporter based on environment config
 * Uses Ethereal for development if no SMTP credentials are set
 */
const createTransporter = async () => {
  // Use real SMTP if credentials are provided
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fall back to Ethereal only when no credentials exist
  const testAccount = await nodemailer.createTestAccount();
  console.log("📧 Using Ethereal test account:", testAccount.user);
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

/**
 * Send a password reset email to the user
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - Recipient's name
 * @param {string} resetLink - Full password reset URL
 * @param {number} expiryMinutes - How long the link is valid (for display)
 * @returns {Promise<object>} - Nodemailer info object
 */
const sendPasswordResetEmail = async (
  toEmail,
  userName,
  resetLink,
  expiryMinutes = 15
) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || "Password Reset <noreply@passwordreset.app>",
    to: toEmail,
    subject: "🔐 Password Reset Request",
    text: `
Hi ${userName},

We received a request to reset your password.

Click the link below to reset your password:
${resetLink}

This link will expire in ${expiryMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email.
Your password will not be changed.

— The Support Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 32px; text-align: center; }
    .lock-icon { font-size: 48px; margin-bottom: 12px; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .header p { color: #a0b4cc; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 17px; color: #1a1a2e; font-weight: 600; margin-bottom: 12px; }
    .message { color: #555; line-height: 1.6; font-size: 15px; margin-bottom: 28px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e94560, #c4172e); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; }
    .expiry-box { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 12px 16px; margin: 20px 0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #7a5c00; }
    .link-fallback { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; word-break: break-all; font-size: 12px; color: #666; margin-top: 16px; }
    .footer { background: #f8f8f8; padding: 20px 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="lock-icon">🔐</div>
      <h1>Password Reset</h1>
      <p>Secure account recovery</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${userName},</p>
      <p class="message">
        We received a request to reset your password. Click the button below to choose a new password.
      </p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn">Reset My Password</a>
      </div>
      <div class="expiry-box">
        ⏱️ This link expires in <strong>&nbsp;${expiryMinutes} minutes</strong>. Request a new one if it expires.
      </div>
      <p class="message" style="font-size:13px; color:#888;">
        If you didn't request a password reset, no action is needed — your account is still secure.
      </p>
      <div class="link-fallback">
        <strong>Can't click the button?</strong> Copy and paste this link:<br>
        <span>${resetLink}</span>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Password Reset App &bull; This is an automated email, please do not reply.
    </div>
  </div>
</body>
</html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  // Log preview URL for Ethereal test accounts
  if (nodemailer.getTestMessageUrl(info)) {
    console.log("📧 Email Preview URL:", nodemailer.getTestMessageUrl(info));
  }

  return info;
};

module.exports = { sendPasswordResetEmail };