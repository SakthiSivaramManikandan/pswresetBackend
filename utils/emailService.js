// emailService.js
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendPasswordResetEmail = async (toEmail, userName, resetLink, expiryMinutes = 15) => {
  try {
    const emailData = {
      sender: {
        name: process.env.SENDER_NAME || "Password Reset App",
        email: process.env.PASS_MAIL,
      },
      to: [{ email: toEmail }],
      subject: "🔐 Password Reset Request",
      htmlContent: `
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
    .expiry-box { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #7a5c00; }
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
      <p class="message">We received a request to reset your password. Click the button below to choose a new password.</p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn">Reset My Password</a>
      </div>
      <div class="expiry-box">
        ⏱️ This link expires in <strong>${expiryMinutes} minutes</strong>. Request a new one if it expires.
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

    await tranEmailApi.sendTransacEmail(emailData);
    console.log(`Password reset email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

export default sendPasswordResetEmail;