# 🔐 Password Reset Flow — Full Stack App

A complete, production-ready **Forgot Password / Reset Password** system built with:
- **Frontend**: React + Bootstrap 5 + Bootstrap Icons
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Email**: Nodemailer (SMTP / Ethereal test)
- **Deployment**: Netlify (frontend) + Render (backend)

---

## 📁 Project Structure

```
password-reset/
├── frontend/              # React app → deploy to Netlify
│   ├── public/
│   │   ├── index.html
│   │   └── _redirects     # Netlify SPA routing
│   ├── src/
│   │   ├── assets/
│   │   │   └── styles.css
│   │   ├── components/
│   │   │   └── PasswordStrength.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   ├── .env.example
│   ├── netlify.toml
│   └── package.json
│
└── backend/               # Express API → deploy to Render
    ├── config/
    │   └── database.js
    ├── models/
    │   └── User.js
    ├── routes/
    │   └── auth.js
    ├── utils/
    │   ├── emailService.js
    │   └── tokenUtils.js
    ├── .env.example
    ├── render.yaml
    ├── server.js
    └── package.json
```

---

## 🔄 Password Reset Flow

```
User enters email
      │
      ▼
API checks DB for user
      │
   ┌──┴──────────────────────────┐
   │ Not found                   │ Found
   ▼                             ▼
Return 404 error        Generate random token (32 bytes)
"No account found"              │
                                ▼
                    Hash token (SHA-256) → store in DB
                    Set expiry (15 min) → store in DB
                                │
                                ▼
                    Send email with plain token in URL
                    /reset-password/<plain_token>
                                │
                                ▼
                    User clicks link → frontend loads
                                │
                                ▼
                    API: hash token → look up in DB
                                │
                   ┌────────────┴───────────────┐
                   │ Not found / mismatch        │ Found
                   ▼                             ▼
            Show "Invalid link"          Check expiry
                                                │
                                 ┌──────────────┴──────────┐
                                 │ Expired                  │ Valid
                                 ▼                          ▼
                         Show "Link Expired"      Show reset form
                         + countdown timer        + live countdown
                                                           │
                                                           ▼
                                                  User submits new password
                                                           │
                                                           ▼
                                                  Hash + save new password
                                                  Clear token from DB
                                                           │
                                                           ▼
                                                  Show success → redirect login
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account (or local MongoDB)
- SMTP credentials (Gmail, SendGrid, etc.) or use Ethereal for testing

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

**Backend `.env` values:**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/password_reset_db
JWT_SECRET=your_super_secret_32_char_minimum_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Password Reset <noreply@yourapp.com>
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
RESET_TOKEN_EXPIRY_MINUTES=15
```

> **Gmail tip**: Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular Gmail password).

> **Development shortcut**: If no `EMAIL_HOST` is set and `NODE_ENV=development`, the app automatically uses [Ethereal](https://ethereal.email/) (fake SMTP). The email preview URL appears in the server console.

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env:
# REACT_APP_API_URL=http://localhost:5000/api
npm start
```

---

## 🌐 Deployment

### Frontend → Netlify

1. Push `frontend/` folder to a GitHub repo
2. Go to [Netlify](https://netlify.com) → New Site → Import from Git
3. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
4. Set environment variable in Netlify dashboard:
   - `REACT_APP_API_URL` = `https://your-backend.onrender.com/api`
5. Deploy!

### Backend → Render

1. Push `backend/` folder to a GitHub repo
2. Go to [Render](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Node
5. Set environment variables in Render dashboard (all values from `.env.example`)
6. Deploy!

> **Important**: After deploying frontend, set `FRONTEND_URL` in Render to your Netlify URL so reset emails contain the correct link.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/forgot-password` | Request reset email |
| `GET`  | `/api/auth/verify-token/:token` | Verify reset token |
| `POST` | `/api/auth/reset-password` | Submit new password |
| `GET`  | `/health` | Health check |

---

## 🔒 Security Features

- **Token hashing**: Reset tokens are SHA-256 hashed before DB storage — plain token only exists in the email URL
- **Token expiry**: Configurable expiry (default 15 min) with live countdown in UI
- **Rate limiting**: Forgot-password endpoint limited to 5 requests/15 min per IP
- **Password hashing**: bcrypt with 12 salt rounds
- **Input validation**: express-validator on all endpoints
- **CORS**: Restricted to frontend origin only
- **Security headers**: X-Frame-Options, XSS-Protection, Content-Type-Options

---

## 🎨 UI Features

- Deep navy dark theme with crimson accent
- **Sora** (display) + **DM Sans** (body) fonts
- Live password strength meter with requirement checklist
- Real-time password match indicator
- Token expiry countdown timer (turns amber when < 2 min)
- Responsive design (mobile-first Bootstrap grid)
- Animated card entrance + alert transitions
- Show/hide password toggle
- Loading spinners on all async actions

---

## 🧪 Testing the Flow

1. Go to `/register` and create an account
2. Go to `/forgot-password` and enter your email
3. Check server console for Ethereal email preview URL (development)
4. Click the reset link in the email
5. Enter a new password and submit
6. Login with the new password at `/login`
