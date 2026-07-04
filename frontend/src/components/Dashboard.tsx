import React from 'react';
import { LogOut } from 'lucide-react';
import { ManufacturerView } from './views/ManufacturerView';
import { PrimaryBuyerView } from './views/PrimaryBuyerView';
import { SecondaryBuyerView } from './views/SecondaryBuyerView';
import { PrivacyAuditPanel } from './views/PrivacyAuditPanel';
import type { AuthSession } from '../types/AuthSession';

const ROLE_LABELS = {
  Manufacturer: 'Foundry',
  PrimaryBuyer: 'Primary Buyer',
  SecondaryBuyer: 'Secondary Buyer',
};

const ROLE_COLORS = {
  Manufacturer: '#4f8dff',
  PrimaryBuyer: '#a78bfa',
  SecondaryBuyer: '#10d97e',
};

const ROLE_ICONS = {
  Manufacturer: '🏭',
  PrimaryBuyer: '🍎',
  SecondaryBuyer: '📡',
};

interface DashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const roleColor = ROLE_COLORS[session.role];

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans pt-16" // added pt-16 to account for the fixed nav bar
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div
        className="glow-orb w-[600px] h-[600px] top-[-200px] left-[-100px] opacity-10"
        style={{ background: `radial-gradient(circle, ${roleColor}, transparent 70%)` }}
      />
      <div
        className="glow-orb w-[400px] h-[400px] bottom-0 right-[-100px] opacity-10"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <header
          className="flex items-center justify-between mb-10 pb-5 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="synCCap Logo" 
              className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(79,141,255,0.5)] transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_16px_rgba(79,141,255,0.7)]" 
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                synCCap
              </h1>
              <div className="text-[0.65rem] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Carbon Credit Capacity
              </div>
            </div>
          </div>

          {/* Account badge + controls */}
          <div className="flex items-center gap-3">
            {/* Account badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{
                background: `${roleColor}10`,
                borderColor: `${roleColor}40`,
              }}
            >
              <span className="text-base">{ROLE_ICONS[session.role]}</span>
              <div className="leading-tight">
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {session.displayName}
                </div>
                <div className="text-xs" style={{ color: roleColor }}>
                  {ROLE_LABELS[session.role]}
                </div>
              </div>
            </div>

            {/* Logout */}
            <button onClick={onLogout} className="btn-ghost text-sm">
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="animate-in">
          {session.role === 'Manufacturer' && (
            <ManufacturerView partyId={session.partyId} />
          )}
          {session.role === 'PrimaryBuyer' && (
            <PrimaryBuyerView partyId={session.partyId} />
          )}
          {session.role === 'SecondaryBuyer' && (
            <SecondaryBuyerView />
          )}
          <PrivacyAuditPanel currentRole={session.role} />
        </div>
      </div>
    </div>
  );
};
