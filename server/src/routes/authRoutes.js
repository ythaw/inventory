import { Router } from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TOKEN_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

const insertUser = db.prepare(
  'INSERT INTO users (companyName, email, passwordHash) VALUES (@companyName, @email, @passwordHash)'
);
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const setResetToken = db.prepare(
  'UPDATE users SET resetToken = @resetToken, resetTokenExpires = @resetTokenExpires WHERE email = @email'
);
const updatePassword = db.prepare(
  'UPDATE users SET passwordHash = @passwordHash, resetToken = NULL, resetTokenExpires = NULL WHERE email = @email'
);

router.post('/signup', (req, res) => {
  const { companyName, email, password } = req.body || {};
  if (!companyName || !email || !password) {
    return res.status(400).json({ message: 'companyName, email and password are required' });
  }
  const existing = getUserByEmail.get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }
  const passwordHash = bcrypt.hashSync(String(password), 10);
  try {
    insertUser.run({ companyName, email: email.toLowerCase(), passwordHash });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to create user' });
  }
  return res.status(201).json({ message: 'Account created successfully' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const user = getUserByEmail.get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const valid = bcrypt.compareSync(String(password), user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ sub: user.id, email: user.email, companyName: user.companyName }, JWT_SECRET, {
    expiresIn: '7d'
  });
  return res.json({ token, user: { id: user.id, email: user.email, companyName: user.companyName } });
});

router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }
  const user = getUserByEmail.get(email.toLowerCase());
  if (!user) {
    // Do not reveal user existence
    return res.json({ message: 'If the email exists, a reset link has been sent to your email address' });
  }
  const resetToken = nanoid(32);
  const resetTokenExpires = Date.now() + TOKEN_EXPIRY_MS;
  setResetToken.run({ resetToken, resetTokenExpires, email: email.toLowerCase() });

  // Generate reset link
  // In production, FRONTEND_URL should be set to your actual domain
  // For development, it auto-detects from the request
  const baseUrl = process.env.FRONTEND_URL || 
    (process.env.NODE_ENV === 'production' 
      ? `${req.protocol}://${req.get('host')}`.replace(':5000', '')
      : `${req.protocol}://${req.get('host')}`.replace(':5000', ':5173'));
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

  // Send email with reset link (if email service is configured)
  const emailResult = await sendPasswordResetEmail(email.toLowerCase(), resetToken, resetLink);

  // If email service is not configured, return the reset link for the user to use
  if (!emailResult.success && !process.env.EMAIL_SERVICE && !process.env.SMTP_HOST) {
    // No email service configured - return the link for user to copy
    return res.json({ 
      message: 'Reset link generated. Copy the link below to reset your password.',
      resetLink: resetLink,
      resetToken: resetToken, // Also return token as fallback
      emailSent: false
    });
  }

  // Email service is configured - always return success message (don't reveal if email failed for security)
  return res.json({ 
    message: 'If the email exists, a reset link has been sent to your email address',
    emailSent: emailResult.success 
  });
});

router.post('/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body || {};
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: 'email, token and newPassword are required' });
  }
  const user = getUserByEmail.get(email.toLowerCase());
  if (!user || !user.resetToken || !user.resetTokenExpires) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
  if (user.resetToken !== token || Date.now() > Number(user.resetTokenExpires)) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
  const passwordHash = bcrypt.hashSync(String(newPassword), 10);
  updatePassword.run({ passwordHash, email: email.toLowerCase() });
  return res.json({ message: 'Password updated successfully' });
});

export default router;


