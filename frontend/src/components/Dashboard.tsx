/**
 * @file components/Dashboard.tsx
 * @description The main application dashboard, scoped to the authenticated company.
 *
 * Data is fetched immediately on mount because this component only renders
 * when a valid AuthSession exists — the user is already authenticated.
 *
 * The dashboard renders the role-specific view (Manufacturer / PrimaryBuyer /
 * SecondaryBuyer) based on the session, with no in-page account switching.
 */

import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { ManufacturerView } from './views/ManufacturerView';
import { PrimaryBuyerView } from './views/PrimaryBuyerView';
import { SecondaryBuyerView } from './views/SecondaryBuyerView';
import { PrivacyAuditPanel } from './views/PrivacyAuditPanel';
import { ThemeToggle } from './ThemeToggle';
import { ApiService } from '../api/client';
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
  const [assets, setAssets] = useState<unknown[]>([]);
  const [transfers, setTransfers] = useState<unknown[]>([]);
  const [penalties, setPenalties] = useState<unknown[]>([]);
  const [rejectedLogs, setRejectedLogs] = useState<unknown[]>([]);
  const [withdrawnLogs, setWithdrawnLogs] = useState<unknown[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch data immediately on mount — user is authenticated
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.partyId]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const [assetsData, transfersData, penaltiesData, rejectedData, withdrawnData] = await Promise.all([
        ApiService.getAssets(),
        ApiService.getTransfers(),
        ApiService.getPenalties(),
        ApiService.getRejectedLogs(),
        ApiService.getWithdrawnLogs(),
      ]);
      setAssets(assetsData);
      setTransfers(transfersData);
      setPenalties(penaltiesData);
      setRejectedLogs(rejectedData);
      setWithdrawnLogs(withdrawnData);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoadingData(false);
    }
  };

  const roleColor = ROLE_COLORS[session.role];

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans"
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
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                syn<span className="gradient-text">CCap</span>
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Capacity Tokenization · Privacy-Preserving Settlement
              </p>
            </div>
          </div>

          {/* Account badge + controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

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
        {loadingData ? (
          <div className="text-center py-24 animate-in">
            <div
              className="w-10 h-10 border-2 rounded-full mx-auto mb-4 animate-spin"
              style={{ borderColor: roleColor, borderTopColor: 'transparent' }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>Syncing with Canton Ledger…</p>
          </div>
        ) : (
          <div className="animate-in">
            {session.role === 'Manufacturer' && (
              <ManufacturerView
                assets={assets as never[]}
                penalties={penalties as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            {session.role === 'PrimaryBuyer' && (
              <PrimaryBuyerView
                assets={assets as never[]}
                transfers={transfers as never[]}
                rejectedLogs={rejectedLogs as never[]}
                withdrawnLogs={withdrawnLogs as never[]}
                penalties={penalties as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            {session.role === 'SecondaryBuyer' && (
              <SecondaryBuyerView
                assets={assets as never[]}
                transfers={transfers as never[]}
                rejectedLogs={rejectedLogs as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            <PrivacyAuditPanel currentRole={session.role} />
          </div>
        )}
      </div>
    </div>
  );
};
