# Inventory App (Auth scaffold)

This project contains a React (Vite + Tailwind) frontend and an Express backend for authentication (signup, login, password reset). It is the foundation for a small business inventory tracker.

## Getting Started

Requirements:
- Node.js 18+

### 1) Install dependencies

```bash
npm run install-all
```

Alternatively, install each app:
```bash
cd server && npm i
cd ../client && npm i
```

### 2) Configure environment

Create `server/.env` (optional but recommended):
```
PORT=5000
JWT_SECRET=change_me_to_a_long_random_string
```

### 3) Run in development

```bash
npm run dev
```

This starts:
- Backend at `http://localhost:5000`
- Frontend at `http://localhost:5173` (proxying `/api` to the backend)

## Auth API

- `POST /api/auth/signup` { companyName, email, password }
- `POST /api/auth/login` { email, password }
- `POST /api/auth/request-password-reset` { email }
- `POST /api/auth/reset-password` { email, token, newPassword }

Notes:
- Password reset emails are sent automatically. In development, emails are logged to console. For production, configure email credentials (see `server/EMAIL_SETUP.md`).
- SQLite database file is created at `server/data/auth.db`.

## Frontend routes

- `/login` – Sign in
- `/signup` – Create account
- `/request-reset` – Request password reset token
- `/reset-password` – Submit token and new password
