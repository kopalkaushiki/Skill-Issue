// src/pages/SignupPage.jsx
// ============================================
// Signup page — email + password + phone.
// Creates account via Supabase then routes to
// OTP verification. Full field-level validation.
// ============================================
import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ── Country phone prefixes ────────────────────
const COUNTRY_CODES = [
  { code: '+1',   label: '🇺🇸 +1'  },
  { code: '+44',  label: '🇬🇧 +44' },
  { code: '+91',  label: '🇮🇳 +91' },
  { code: '+61',  label: '🇦🇺 +61' },
  { code: '+49',  label: '🇩🇪 +49' },
  { code: '+33',  label: '🇫🇷 +33' },
  { code: '+81',  label: '🇯🇵 +81' },
  { code: '+55',  label: '🇧🇷 +55' },
  { code: '+62',  label: '🇮🇩 +62' },
  { code: '+234', label: '🇳🇬 +234'},
  { code: '+27',  label: '🇿🇦 +27' },
  { code: '+60',  label: '🇲🇾 +60' },
];

// ── Brand Logo ────────────────────────────────
function BrandMark() {
  return (
    <div className="brand-mark">
      <div className="brand-icon">DA</div>
      <span className="brand-name">DevAssemble</span>
    </div>
  );
}

// ── Field-level error helper ──────────────────
function FieldError({ message }) {
  if (!message) return null;
  return <p className="field-error">⚠ {message}</p>;
}

function getSignupErrorMessage(error) {
  const raw = error?.message || '';
  const msg = raw.toLowerCase();

  if (msg.includes('already registered')) {
    return 'An account with this email already exists. Try logging in.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('email')) {
    return 'Account created, but verification email could not be sent. Check Supabase Email provider settings and try resend.';
  }

  return raw || 'Signup failed. Please try again.';
}

// ── Main Signup Component ─────────────────────
export default function SignupPage() {
  const navigate = useNavigate();

  // Form values
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone,       setPhone]       = useState('');

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Global state
  const [globalError, setGlobalError] = useState('');
  const [loading,     setLoading]     = useState(false);

  // ── Validators ──────────────────────────────
  const validators = {
    email: (v) => {
      if (!v.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    password: (v) => {
      if (!v) return 'Password is required.';
      if (v.length < 8) return 'Password must be at least 8 characters.';
      if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.';
      if (!/[0-9]/.test(v)) return 'Include at least one number.';
      return '';
    },
    confirmPass: (v, pw) => {
      if (!v) return 'Please confirm your password.';
      if (v !== pw) return 'Passwords do not match.';
      return '';
    },
    phone: (v) => {
      if (!v.trim()) return 'Phone number is required.';
      if (!/^\d{7,15}$/.test(v.replace(/[\s\-()]/g, '')))
        return 'Enter a valid phone number (digits only).';
      return '';
    },
  };

  // ── Blur validation (field-level) ────────────
  const handleBlur = (field) => {
    let msg = '';
    if (field === 'email')       msg = validators.email(email);
    if (field === 'password')    msg = validators.password(password);
    if (field === 'confirmPass') msg = validators.confirmPass(confirmPass, password);
    if (field === 'phone')       msg = validators.phone(phone);

    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  // ── Full form validation ─────────────────────
  const validateAll = () => {
    const errors = {
      email:       validators.email(email),
      password:    validators.password(password),
      confirmPass: validators.confirmPass(confirmPass, password),
      phone:       validators.phone(phone),
    };
    setFieldErrors(errors);
    return Object.values(errors).every((e) => !e);
  };

  // ── Submit handler ───────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setGlobalError('');

    if (!validateAll()) return;

    setLoading(true);

    // Build full phone number
    const fullPhone = `${countryCode}${phone.replace(/[\s\-()]/g, '')}`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          phone_number: fullPhone,
        },
        // Supabase will send a verification email
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setLoading(false);

    if (error) {
      setGlobalError(getSignupErrorMessage(error));
      return;
    }

    // ✅ Account created — go to OTP verification
    // Pass email and phone in navigation state so the verify page
    // knows what to display
    const normalizedEmail = email.trim().toLowerCase();
    sessionStorage.setItem('pending_verification_email', normalizedEmail);

    navigate('/verify-otp', {
      state: {
        email: normalizedEmail,
        phone: fullPhone,
        type: 'email', // verify email first
      },
    });
  };

  // ── Password strength indicator ──────────────
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8)          score++;
    if (/[A-Z]/.test(password))        score++;
    if (/[0-9]/.test(password))        score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#e05050', '#e09030', '#c0b030', '#2d8a5a'];

  // ── Render ───────────────────────────────────
  return (
    <div className="auth-layout">
      <div className="auth-card fade-up">
        <BrandMark />

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-subheading">Join DevAssemble and start collaborating</p>

        {globalError && (
          <div className="alert alert-error" role="alert">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSignup} noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              type="email"
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              autoComplete="email"
              autoFocus
            />
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className={`form-input ${fieldErrors.password ? 'error' : ''}`}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              autoComplete="new-password"
            />
            {/* Strength meter */}
            {password && (
              <div style={{ marginTop: 6 }}>
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 4
                }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength ? strengthColors[strength] : 'var(--border)',
                      transition: 'background 0.3s'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: strengthColors[strength], fontWeight: 600 }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}
            <FieldError message={fieldErrors.password} />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPass" className="form-label">Confirm password</label>
            <input
              id="confirmPass"
              type="password"
              className={`form-input ${fieldErrors.confirmPass ? 'error' : ''}`}
              placeholder="Repeat your password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onBlur={() => handleBlur('confirmPass')}
              autoComplete="new-password"
            />
            <FieldError message={fieldErrors.confirmPass} />
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone number</label>
            <div className="phone-input-wrapper">
              <select
                className="phone-prefix"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <input
                id="phone"
                type="tel"
                className={`form-input ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => handleBlur('phone')}
                autoComplete="tel"
                style={{ flex: 1 }}
              />
            </div>
            <FieldError message={fieldErrors.phone} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          By creating an account you agree to our{' '}
          <a href="#" className="auth-link" style={{ fontSize: 12 }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="auth-link" style={{ fontSize: 12 }}>Privacy Policy</a>.
        </p>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
