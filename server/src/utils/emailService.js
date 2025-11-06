import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter - configure based on your email service
// For development, you can use Gmail, SendGrid, or any SMTP service
const createTransporter = () => {
  // Option 1: Gmail (for development/testing)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  // Option 2: Custom SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Option 3: Development mode - log email instead of sending
  return {
    sendMail: async (options) => {
      console.log('='.repeat(50));
      console.log('📧 EMAIL (Development Mode - Not Actually Sent)');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html);
      console.log('='.repeat(50));
      return { messageId: 'dev-mode-' + Date.now() };
    },
  };
};

const transporter = createTransporter();

export const sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@inventorymaster.com',
    to: email,
    subject: 'Reset Your Password - Inventory Master',
    html: `
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
    `,
    text: `
      Password Reset Request - Inventory Master
      
      We received a request to reset your password.
      
      Click this link to reset your password:
      ${resetLink}
      
      This link will expire in 30 minutes.
      
      If you didn't request this, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw - we don't want email failures to break the reset flow
    // In production, you might want to log this to a monitoring service
    return { success: false, error: error.message };
  }
};

