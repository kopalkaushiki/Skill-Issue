# DevAssemble — Authentication Setup Guide

## 📁 Recommended Folder Structure

```
devassemble/
├── public/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── VerifyOTPPage.jsx
│   │   └── OnboardingPage.jsx
│   ├── components/
│   │   └── ui/
│   │       ├── InputField.jsx
│   │       ├── Button.jsx
│   │       └── SkillBadge.jsx
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── hooks/
│   │   └── useAuth.js
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── .env
├── package.json
└── vite.config.js
```

---

## ⚙️ React Setup Commands

```bash
# 1. Create project with Vite
npm create vite@latest devassemble -- --template react

cd devassemble

# 2. Install dependencies
npm install @supabase/supabase-js react-router-dom

# 3. Install dev tools
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Start dev server
npm run dev
```

---

## 🗄️ Supabase Setup Steps

### 1. Create a Supabase Project
- Go to https://supabase.com and create a new project
- Note your **Project URL** and **anon public key**

### 2. Enable Authentication Providers
- In Supabase Dashboard → Authentication → Providers
- Enable **Email** (with "Confirm email" turned ON)
- Enable **Phone** (requires Twilio setup for SMS OTP)

### 3. Configure Email Templates (optional but recommended)
- Authentication → Email Templates
- Customize the OTP/verification email to match DevAssemble branding

### 4. Create `.env` file
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Run the SQL Schema (see supabase_schema.sql)

---

## 🔐 Authentication Flow Architecture

```
User visits /signup
    ↓
Fills email + password + phone
    ↓
Supabase creates unverified user
    ↓
Email verification OTP sent
    ↓
User lands on /verify-otp
    ↓
Enters OTP → Supabase verifies
    ↓
On success → redirect to /onboarding
    ↓
User fills profile info
    ↓
Data saved to Supabase `profiles` table
    ↓
🎉 Setup complete (stops here per Step 1 scope)
```

Login Flow:
```
User visits /login
    ↓
Email + password submitted
    ↓
Supabase authenticates
    ↓
If email not verified → redirect to /verify-otp
If verified → redirect to /onboarding (or dashboard later)
```
