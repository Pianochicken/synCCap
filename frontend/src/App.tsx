/**
 * @file App.tsx
 * @description Root application component — URL-based routing via React Router.
 *
 * Routes:
 *   /          → LandingPage
 *   /login     → LoginPage (company account selection)
 *   /dashboard → Dashboard (requires active AuthSession)
 *
 * The AuthSession (partyId, displayName, role) is stored in sessionStorage
 * so it persists across page refreshes within the same tab but is cleared
 * when the tab is closed — consistent with enterprise session management.
 */

import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'react-hot-toast';
import type { AuthSession } from './types/AuthSession';
import { NetworkProvider } from './context/NetworkContext';
import { LedgerProvider } from './components/LedgerProvider';
import { NetworkSelector } from './components/NetworkSelector';
import { ThemeToggle } from './components/ThemeToggle';

const SESSION_KEY = 'synccap_session';

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  const handleLogin = (newSession: AuthSession) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('synccap_token');
    sessionStorage.removeItem('synccap_partyId');
    setSession(null);
  };

  return (
    <NetworkProvider>
      <Toaster position="bottom-right" toastOptions={{ className: 'text-sm shadow-xl' }} />
      
      {/* Global Navigation Bar / Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <NetworkSelector />
        <ThemeToggle />
      </div>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route
          path="/dashboard"
          element={
            session ? (
              <LedgerProvider partyId={session.partyId}>
                <Dashboard session={session} onLogout={handleLogout} />
              </LedgerProvider>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NetworkProvider>
  );
}

export default App;
