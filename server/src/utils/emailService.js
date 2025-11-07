// server/src/utils/emailService.js (ESM)
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ----- Config helpers -----
const toBool = (v) => String(v).toLowerCase() === 'true';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev'; // or a verified domain
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = toBool(process.env.SMTP_SECURE) || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

const FALLBACK_FROM =
  process.env.EMAIL_FROM ||
  SMTP_USER ||
  RESEND_FROM ||
  'onboarding@resend.dev';

// ----- Providers -----
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

let smtpTransporter = null;
if (SMTP_HOST) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  // Optional: log once on boot so you see misconfig immediately
  smtpTransporter.verify()
    .then(() => console.log('SMTP ready'))
    .catch((e) => console.error('SMTP verify failed:', e));
}

// ----- Templates -----
const htmlTemplate = (resetLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #9B7EDE 0%, #7C5CB8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #9B7EDE; color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; }
    .button:hover { background: #7C5CB8; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .token { background: #fff; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Inventory Master</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password for your Inventory Master account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <div class="token">${resetLink}</div>
      <p><strong>This link will expire in 30 minutes.</strong></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The Inventory Master Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

const textTemplate = (resetLink) => `
Password Reset Request - Inventory Master

We received a request to reset your password.

Reset link:
${resetLink}

This link will expire in 30 minutes.

If you didn't request this, you can safely ignore this email.
`;

// ----- Public function -----
export async function sendPasswordResetEmail(to, resetLink) {
  // 1) Try Resend
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: RESEND_FROM, // use onboarding@resend.dev unless you verified your own domain
        to,
        subject: 'Reset Your Password - Inventory Master',
        html: htmlTemplate(resetLink),
        text: textTemplate(resetLink),
      });
      if (error) throw error;
      console.log('Resend sent:', data?.id);
      return { success: true, provider: 'resend', id: data?.id };
    } catch (e) {
      console.error('Resend error:', e);
      // fall through to SMTP if configured
    }
  }

  // 2) Fallback to SMTP (if available)
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: FALLBACK_FROM,
        to,
        subject: 'Reset Your Password - Inventory Master',
        html: htmlTemplate(resetLink),
        text: textTemplate(resetLink),
      });
      console.log('SMTP sent:', info.messageId);
      return { success: true, provider: 'smtp', id: info.messageId };
    } catch (e) {
      console.error('SMTP send error:', e);
    }
  }

  // 3) Dev fallback (no provider configured)
  console.log('==== DEV EMAIL (not sent) ====');
  console.log('To:', to);
  console.log('Link:', resetLink);
  console.log('===============================');
  return { success: true, provider: 'dev' };
}
