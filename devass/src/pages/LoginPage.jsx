// src/pages/LoginPage.jsx
// ============================================
// Login page — email + password auth via
// Supabase. Handles errors, loading state,
// and redirects verified users to onboarding.
// ============================================
import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ── Brand Logo Component ──────────────────────
function BrandMark() {
  return (
    <div className="brand-mark">
      <div className="brand-icon">DA</div>
      <span className="brand-name">DevAssemble</span>
    </div>
  );
}

// ── Main Login Page ───────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // ── Field-level validation ──────────────────
  const validate = () => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!password)     return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  // ── Form submit handler ─────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (authError) {
      // Map Supabase error codes to friendly messages
      if (authError.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (authError.message.includes('Email not confirmed')) {
        // User exists but hasn't verified email — send them to OTP page
        sessionStorage.setItem('pending_verification_email', email);
        navigate('/verify-otp', { state: { email, type: 'email' } });
      } else {
        setError(authError.message);
      }
      return;
    }

    // ✅ Success — redirect to onboarding
    // (In Step 2+ you can check if onboarding is already done and skip)
    navigate('/onboarding');
  };

  // ── Render ──────────────────────────────────
  return (
    <div className="auth-layout">
      <div className="auth-card fade-up">
        <BrandMark />

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Log in to your DevAssemble account</p>

        {/* Global error alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              type="email"
              className={`form-input ${error && !email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
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
                Logging in…
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Footer links */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
