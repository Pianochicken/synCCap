/**
 * @file App.tsx
 * @description Root application component — URL-based routing via React Router.
 *
 * Routes:
 *   /            → LandingPage
 *   /dashboard   → Dashboard (party-switcher + views)
 *
 * Auth state (currentPartyId, currentRole) lives here so it persists across
 * client-side navigation without re-fetching tokens.
 */

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { PartyRole } from './components/PartySwitcher';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ApiService } from './api/client';

function App() {
  const [currentPartyId, setCurrentPartyId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<PartyRole>(null);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const savedPartyId = localStorage.getItem('synccap_partyId');
    if (savedPartyId) {
      setCurrentPartyId(savedPartyId);
      if (savedPartyId.startsWith('TSMC')) setCurrentRole('Manufacturer');
      else if (savedPartyId.startsWith('AppleInc')) setCurrentRole('PrimaryBuyer');
      else if (savedPartyId.startsWith('QualcommInc')) setCurrentRole('SecondaryBuyer');
    }
  }, []);

  const handleSwitchParty = async (partyId: string, role: PartyRole) => {
    if (!partyId) {
      ApiService.logout();
      setCurrentPartyId(null);
      setCurrentRole(null);
      return;
    }

    try {
      const auth = await ApiService.login(partyId);
      setCurrentPartyId(auth.partyId);
      setCurrentRole(role);
    } catch (err) {
      console.error('Login failed', err);
      alert('Failed to switch party. Check backend logs.');
    }
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <Dashboard
            currentPartyId={currentPartyId}
            currentRole={currentRole}
            onSwitchParty={handleSwitchParty}
          />
        }
      />
      {/* Redirect any unknown path to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
