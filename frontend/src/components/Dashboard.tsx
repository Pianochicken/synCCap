import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';
import { PartySwitcher } from './PartySwitcher';
import type { PartyRole } from './PartySwitcher';
import { ManufacturerView } from './views/ManufacturerView';
import { PrimaryBuyerView } from './views/PrimaryBuyerView';
import { SecondaryBuyerView } from './views/SecondaryBuyerView';
import { PrivacyAuditPanel } from './views/PrivacyAuditPanel';
import { ThemeToggle } from './ThemeToggle';
import { ApiService } from '../api/client';

interface DashboardProps {
  currentPartyId: string | null;
  currentRole: PartyRole;
  onSwitchParty: (partyId: string, role: PartyRole) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentPartyId,
  currentRole,
  onSwitchParty,
}) => {
  const navigate = useNavigate();
  // Data States scoped strictly to the Dashboard component
  const [assets, setAssets] = useState<unknown[]>([]);
  const [transfers, setTransfers] = useState<unknown[]>([]);
  const [penalties, setPenalties] = useState<unknown[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Only fetch data if the component is mounted AND a party is selected
  useEffect(() => {
    if (currentPartyId) {
      fetchDashboardData();
    } else {
      setAssets([]);
      setTransfers([]);
      setPenalties([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPartyId]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const [assetsData, transfersData, penaltiesData] = await Promise.all([
        ApiService.getAssets(),
        ApiService.getTransfers(),
        ApiService.getPenalties(),
      ]);
      setAssets(assetsData);
      setTransfers(transfersData);
      setPenalties(penaltiesData);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      alert('Could not fetch ledger state. Make sure Canton Sandbox and Backend are running, or clear your session and log in again.');
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Glow orbs */}
      <div
        className="glow-orb w-[600px] h-[600px] top-[-200px] left-[-100px] opacity-10"
        style={{ background: 'radial-gradient(circle, #4f8dff, transparent 70%)' }}
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
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'var(--primary)', boxShadow: '0 0 20px var(--primary-glow)' }}
            >
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                syn<span className="gradient-text">CCap</span>
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Capacity Tokenization · Privacy-Preserving Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/')}
              className="btn-ghost text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Overview
            </button>
          </div>
        </header>

        {/* Party Switcher */}
        <PartySwitcher
          currentPartyId={currentPartyId}
          onSwitchParty={onSwitchParty}
        />

        {/* Dashboard Content */}
        {!currentPartyId ? (
          <div className="text-center py-24 px-4 animate-in">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)' }}
            >
              <Layers className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Select a Party to Begin
            </h2>
            <p className="max-w-md mx-auto text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You are currently an unauthenticated observer. Because Canton enforces
              sub-transaction privacy, you see{' '}
              <strong style={{ color: 'var(--primary)' }}>zero ledger state</strong> — as intended.
            </p>
          </div>
        ) : loadingData ? (
          <div className="text-center py-24 animate-in">
            <div
              className="w-10 h-10 border-2 rounded-full mx-auto mb-4 animate-spin"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>Syncing with Canton Ledger…</p>
          </div>
        ) : (
          <div className="animate-in">
            {currentRole === 'Manufacturer' && (
              <ManufacturerView
                assets={assets as never[]}
                penalties={penalties as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            {currentRole === 'PrimaryBuyer' && (
              <PrimaryBuyerView
                assets={assets as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            {currentRole === 'SecondaryBuyer' && (
              <SecondaryBuyerView
                assets={assets as never[]}
                transfers={transfers as never[]}
                onRefresh={fetchDashboardData}
              />
            )}
            <PrivacyAuditPanel currentRole={currentRole} />
          </div>
        )}
      </div>
    </div>
  );
};
