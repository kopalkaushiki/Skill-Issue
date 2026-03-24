// src/pages/OnboardingPage.jsx
// ============================================
// Onboarding page — multi-step form to collect
// developer profile info after signup.
// Saves data to Supabase `profiles` table.
// ============================================
import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ── Developer roles ───────────────────────────
const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Engineer',
  'ML/AI Engineer',
  'Other',
];

// ── Availability options ──────────────────────
const AVAILABILITY = [
  'Available now',
  'Available part-time',
  'Available on weekends',
  'Not available',
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

// ── Progress Steps ────────────────────────────
function ProgressSteps({ current, total }) {
  return (
    <div className="progress-steps">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={`step-${i}`}>
          <div
            key={`dot-${i}`}
            className={`step-dot ${
              i + 1 < current ? 'complete' :
              i + 1 === current ? 'active' : ''
            }`}
          >
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div
              key={`line-${i}`}
              className={`step-line ${i + 1 < current ? 'complete' : ''}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Onboarding Component ─────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const TOTAL_STEPS = 3;

  // Step tracker
  const [step, setStep] = useState(1);

  // Step 1 — Basic info
  const [fullName,      setFullName]      = useState('');
  const [availability,  setAvailability]  = useState('');

  // Step 2 — Role
  const [role,   setRole]   = useState('');

  // Step 3 — Bio
  const [bio, setBio] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [errors,  setErrors]  = useState({});

  // ── Step validation ──────────────────────────
  const validateStep = () => {
    const e = {};

    if (step === 1) {
      if (!fullName.trim())   e.fullName    = 'Full name is required.';
      if (fullName.length > 80) e.fullName  = 'Name must be under 80 characters.';
      if (!availability)       e.availability = 'Please select your availability.';
    }

    if (step === 2) {
      if (!role)               e.role   = 'Please select your developer role.';
    }

    if (step === 3) {
      if (bio.length > 500) e.bio = 'Bio must be 500 characters or less.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Next step ────────────────────────────────
  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => s + 1);
    setError('');
  };

  // ── Submit to Supabase ───────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    // Upsert profile — handles both insert and update
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id:                   user.id,
        full_name:            fullName.trim(),
        developer_role:       role,
        bio:                  bio.trim() || null,
        availability:         availability,
        phone_number:         user.user_metadata?.phone_number || null,
        onboarding_completed: true,
      }, { onConflict: 'id' });

    setLoading(false);

    if (dbError) {
      setError('Failed to save your profile. Please try again.');
      console.error('Supabase profile upsert error:', dbError);
      return;
    }

    // ✅ Done — per Step 1 scope we stop here
    // Show a completion screen
    setStep(4);
  };

  // ── Render: Complete screen ──────────────────
  if (step === 4) {
    return (
      <div className="auth-layout">
        <div className="auth-card fade-up" style={{ textAlign: 'center' }}>
          <BrandMark />
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'var(--teal-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
          }}>
            🎉
          </div>
          <h1 className="auth-heading" style={{ textAlign: 'center', marginBottom: 10 }}>
            You're all set!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
            Welcome to DevAssemble, <strong>{fullName}</strong>!<br />
            Your profile has been saved successfully.
          </p>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            border: '1px solid var(--border)',
            textAlign: 'left',
            marginBottom: 24,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Profile Summary
            </p>
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              <strong>Role:</strong> {role}
            </p>
            <p style={{ fontSize: 14 }}>
              <strong>Status:</strong> {availability}
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Next: review your profile →
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/profile')}
            style={{ marginTop: 14 }}
          >
            Go to your profile
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Step forms ───────────────────────
  return (
    <div className="auth-layout">
      <div className="auth-card onboarding-card fade-up">
        <BrandMark />

        <ProgressSteps current={step} total={TOTAL_STEPS} />

        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <div>
            <h1 className="auth-heading">Let's build your profile</h1>
            <p className="auth-subheading">Tell us a bit about yourself</p>

            {/* Full name */}
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">Full name</label>
              <input
                id="fullName"
                type="text"
                className={`form-input ${errors.fullName ? 'error' : ''}`}
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
              {errors.fullName && <p className="field-error">⚠ {errors.fullName}</p>}
            </div>

            {/* Availability */}
            <div className="form-group">
              <label className="form-label">Collaboration availability</label>
              <div className="role-grid">
                {AVAILABILITY.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`role-option ${availability === opt ? 'selected' : ''}`}
                    onClick={() => setAvailability(opt)}
                    style={{ fontSize: 13 }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {errors.availability && <p className="field-error" style={{ marginTop: 8 }}>⚠ {errors.availability}</p>}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              style={{ marginTop: 8 }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Role ── */}
        {step === 2 && (
          <div>
            <h1 className="auth-heading">Your developer role</h1>
            <p className="auth-subheading">What is your main focus?</p>

            {/* Developer role */}
            <div className="form-group">
              <label className="form-label">Developer role</label>
              <div className="role-grid">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`role-option ${role === r ? 'selected' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {errors.role && <p className="field-error" style={{ marginTop: 8 }}>⚠ {errors.role}</p>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                style={{ flex: 2 }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Bio ── */}
        {step === 3 && (
          <div>
            <h1 className="auth-heading">About you</h1>
            <p className="auth-subheading">Write a short bio to help others understand what you're about</p>

            <div className="form-group">
              <label htmlFor="bio" className="form-label">Short bio (optional)</label>
              <textarea
                id="bio"
                className={`form-textarea ${errors.bio ? 'error' : ''}`}
                placeholder="e.g. Fullstack developer with 4 years experience building SaaS products. Love TypeScript, clean architecture, and open-source."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                autoFocus
              />
              <div className="char-count" style={{ color: bio.length > 450 ? 'var(--error)' : undefined }}>
                {bio.length} / 500
              </div>
              {errors.bio && <p className="field-error">⚠ {errors.bio}</p>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(2)}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Saving profile…
                  </>
                ) : (
                  'Complete setup ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
