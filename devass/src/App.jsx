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
import DashboardPage from './pages/app/DashboardPage';
import ProfilePage from './pages/app/ProfilePage';
import ProjectsPage from './pages/app/ProjectsPage';
import ProjectDetailPage from './pages/app/ProjectDetailPage';
import MessagesPage from './pages/app/MessagesPage';
import PublishRequestPage from './pages/app/PublishRequestPage';

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

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/publish-collaboration-request"
          element={
            <ProtectedRoute>
              <PublishRequestPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/"  element={<RootRedirect />} />
        <Route path="*"  element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
