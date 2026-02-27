// src/pages/VerifyOTPPage.jsx
// ============================================
// OTP verification page — handles email OTP
// verification from Supabase. Auto-focuses
// inputs, handles paste, and resend logic.
// ============================================
import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

function getVerifyErrorMessage(error) {
  const raw = error?.message || '';
  const msg = raw.toLowerCase();

  if (msg.includes('expired') || msg.includes('invalid')) {
    return 'Invalid or expired code. Please request a new code.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (msg.includes('email') && msg.includes('not found')) {
    return 'We could not find this pending verification email. Please sign up again.';
  }

  return raw || 'Verification failed. Please try again.';
}

function getResendErrorMessage(error) {
  const raw = error?.message || '';
  const msg = raw.toLowerCase();

  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Resend limit reached. Please wait before trying again.';
  }
  if (msg.includes('email') && msg.includes('disabled')) {
    return 'Email provider is disabled in Supabase. Enable it and try again.';
  }
  if (msg.includes('email')) {
    return 'Unable to send verification email. Check Supabase Email provider and SMTP settings.';
  }

  return raw || 'Failed to resend code. Please try again.';
}

// ── Brand Logo ────────────────────────────────
function BrandMark() {
  return (
    <div className="brand-mark">
      <div className="brand-icon">DA</div>
      <span className="brand-name">DevAssemble</span>
    </div>
  );
}

// ── Main OTP Page ─────────────────────────────
export default function VerifyOTPPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Get email/phone from navigation state (set in SignupPage or LoginPage)
  const { email = '', phone = '', type = 'email' } = location.state || {};
  const rememberedEmail = sessionStorage.getItem('pending_verification_email') || '';
  const targetEmail = (email || rememberedEmail).trim().toLowerCase();

  // OTP digits stored as array of strings
  const [digits,  setDigits]  = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  // Resend timer
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending,  setResending]  = useState(false);

  // Refs for each OTP input box
  const inputRefs = useRef([]);

  // ── Countdown timer for resend ───────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ── Auto-focus first input on mount ─────────
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── Handle digit input ───────────────────────
  const handleChange = (index, value) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Move focus to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join('');
      if (fullOtp.length === OTP_LENGTH && !newDigits.includes('')) {
        verifyOTP(fullOtp);
      }
    }
  };

  // ── Handle backspace ─────────────────────────
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        // Move to previous and clear
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // ── Handle paste (e.g., paste "123456") ──────
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus last filled input
    const lastIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[lastIndex]?.focus();

    // Auto verify if complete
    if (pasted.length === OTP_LENGTH) {
      verifyOTP(pasted);
    }
  };

  // ── Verify OTP via Supabase ──────────────────
  const verifyOTP = async (otpCode) => {
    if (!targetEmail) {
      setError('No email found for verification. Please go back to signup/login.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: targetEmail,     // or `phone` if verifying phone
      token: otpCode,
      type: 'signup',         // use 'email' for login email verification
    });

    setLoading(false);

    if (verifyError) {
      setError(getVerifyErrorMessage(verifyError));
      // Clear and re-focus
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }

    // ✅ Verified!
    sessionStorage.removeItem('pending_verification_email');
    setSuccess(true);
    setTimeout(() => navigate('/onboarding'), 1200);
  };

  // ── Manual submit button ─────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }
    verifyOTP(otp);
  };

  // ── Resend OTP ───────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    if (!targetEmail) {
      setError('No email found to resend code. Please go back and sign up again.');
      return;
    }

    setResending(true);
    setError('');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });

    setResending(false);

    if (resendError) {
      setError(getResendErrorMessage(resendError));
      return;
    }

    setCountdown(RESEND_COOLDOWN);
    setDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  // ── Mask email for display ───────────────────
  const maskedEmail = targetEmail
    ? targetEmail.replace(/(.{2}).+(@.+)/, '$1••••$2')
    : '';

  // ── Render ───────────────────────────────────
  return (
    <div className="auth-layout">
      <div className="auth-card fade-up" style={{ textAlign: 'center' }}>
        <BrandMark />

        {success ? (
          // ── Success state ──────────────────────
          <div style={{ padding: '20px 0' }}>
            <div
              className="success-icon"
              style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: 'var(--teal-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 28,
              }}
            >
              ✓
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--teal-900)', marginBottom: 8 }}>
              Email verified!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Redirecting you to setup your profile…
            </p>
          </div>
        ) : (
          // ── OTP entry state ────────────────────
          <>
            <div
              style={{
                width: 52, height: 52,
                borderRadius: '50%',
                background: 'var(--teal-100)',
                border: '2px solid var(--teal-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 22,
              }}
            >
              ✉️
            </div>

            <h1 className="auth-heading" style={{ textAlign: 'center' }}>
              Check your email
            </h1>
            <p className="auth-subheading" style={{ textAlign: 'center' }}>
              We sent a 6-digit code to<br />
              <strong style={{ color: 'var(--teal-700)' }}>{maskedEmail || 'your email address'}</strong>
            </p>

            {error && (
              <div className="alert alert-error" role="alert" style={{ textAlign: 'left' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* OTP digit inputs */}
              <div className="otp-container" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || digits.includes('')}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Verifying…
                  </>
                ) : (
                  'Verify email'
                )}
              </button>
            </form>

            {/* Resend */}
            <div style={{ marginTop: 20 }}>
              {countdown > 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  Resend code in <strong style={{ color: 'var(--teal-600)' }}>{countdown}s</strong>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: 14 }}
                >
                  {resending ? 'Sending…' : 'Resend verification code'}
                </button>
              )}
            </div>

            <p className="auth-footer" style={{ marginTop: 16 }}>
              Wrong email?{' '}
              <a href="/signup" className="auth-link">Go back</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
