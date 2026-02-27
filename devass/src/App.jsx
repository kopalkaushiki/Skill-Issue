// src/App.jsx
// ============================================
// Root component — sets up React Router routes
// for all authentication pages. Includes a
// simple ProtectedRoute guard.
// ============================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import LoginPage      from './pages/LoginPage';
import SignupPage     from './pages/SignupPage';
import VerifyOTPPage  from './pages/VerifyOTPPage';
import OnboardingPage from './pages/OnboardingPage';

import './styles/globals.css';

// ── Protected Route ───────────────────────────
// Redirects to /login if user is not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-layout">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ── App ───────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/signup"     element={<SignupPage />} />
        <Route path="/verify-otp" element={<VerifyOTPPage />} />

        {/* Protected routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
