# Email Setup for Password Reset

This guide explains how to configure email sending for password reset functionality.

## Quick Setup Options

### Option 1: Gmail (Easiest for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Inventory App" as the name
   - Copy the generated 16-character password

3. Add to `server/.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD="your-16-char-app-password"
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:5173
```

**Important:** If your password contains special characters (like `;`, `#`, `$`, `&`, etc.), wrap it in quotes:
```env
EMAIL_APP_PASSWORD="your-password;with;special;chars"
```

### Option 2: Custom SMTP (For Production)

Add to `server/.env`:
```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD="your-smtp-password"
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Important:** If your password contains special characters (like `;`, `#`, `$`, `&`, etc.), wrap it in quotes:
```env
SMTP_PASSWORD="your-password;with;special;chars"
```

### Option 3: Development Mode (No Email Service)

If no email configuration is provided, the system will:
- Log the reset link to the console
- Return the reset link in the API response (for development only)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EMAIL_SERVICE` | Set to `gmail` to use Gmail | No |
| `EMAIL_USER` | Your email address | Yes (if using email) |
| `EMAIL_APP_PASSWORD` | Gmail App Password (16 chars) | Yes (if using Gmail) |
| `SMTP_HOST` | SMTP server hostname | Yes (if using custom SMTP) |
| `SMTP_PORT` | SMTP port (usually 587) | Yes (if using custom SMTP) |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | No (default: `false`) |
| `SMTP_USER` | SMTP username | Yes (if using custom SMTP) |
| `SMTP_PASSWORD` | SMTP password | Yes (if using custom SMTP) |
| `EMAIL_FROM` | From email address | No (defaults to EMAIL_USER) |
| `FRONTEND_URL` | Your frontend URL | Yes (for reset links) |

## Testing

1. Start the server: `npm run dev`
2. Go to `/request-reset` page
3. Enter your email
4. Check your email inbox (or console if in dev mode)
5. Click the reset link to set a new password

## Handling Special Characters in Passwords

If your password contains special characters (semicolons, hashes, dollar signs, etc.), you **must** wrap the value in quotes in your `.env` file:

**✅ Correct:**
```env
EMAIL_APP_PASSWORD="mypassword;with;special;chars"
SMTP_PASSWORD="password#with$special&chars"
```

**❌ Incorrect (will break):**
```env
EMAIL_APP_PASSWORD=mypassword;with;special;chars
SMTP_PASSWORD=password#with$special&chars
```

The quotes ensure the entire password is read correctly, including all special characters.

## Troubleshooting

**Gmail not working?**
- Make sure you're using an App Password, not your regular password
- Check that 2FA is enabled
- Verify the email address is correct
- If your password has special characters, wrap it in quotes: `EMAIL_APP_PASSWORD="your-password"`

**SMTP not working?**
- Check firewall settings
- Verify port number (587 for TLS, 465 for SSL)
- Test credentials with an email client first
- If your password has special characters, wrap it in quotes: `SMTP_PASSWORD="your-password"`

**Reset link not working?**
- Make sure `FRONTEND_URL` matches your frontend domain
- Check that the token hasn't expired (30 minutes)
