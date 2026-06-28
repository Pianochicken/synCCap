/**
 * @file components/LoginPage.tsx
 * @description Enterprise login page for the synCCap platform.
 *
 * Displays the three pre-registered companies on the platform.
 * Each company is a distinct legal entity on the Canton permissioned
 * network, authenticated via Canton JWT tokens scoped to their party.
 *
 * In production, this would integrate with the Canton participant node's
 * IAM system (OAuth2 / OpenID Connect). For the Canton sandbox environment,
 * we simulate authentication by allocating parties and issuing dev tokens.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, Zap, ArrowLeft, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ApiService } from '../api/client';
import type { AuthSession, CompanyConfig, PartyRole } from '../types/AuthSession';

// ---------------------------------------------------------------------------
// Pre-registered Companies
// ---------------------------------------------------------------------------

const COMPANIES: CompanyConfig[] = [
  {
    id: 'TSMC',
    displayName: 'TSMC',
    role: 'Manufacturer',
    description: 'Semiconductor foundry. Issue and settle capacity tokens on the Canton ledger.',
    icon: '🏭',
    accentColor: '#4f8dff',
  },
  {
    id: 'AppleInc',
    displayName: 'Apple Inc.',
    role: 'PrimaryBuyer',
    description: 'Primary capacity purchaser. Acquire foundry capacity and access the dark pool.',
    icon: '🍎',
    accentColor: '#a78bfa',
  },
  {
    id: 'QualcommInc',
    displayName: 'Qualcomm',
    role: 'SecondaryBuyer',
    description: 'Secondary market acquirer. Purchase capacity through the privacy-preserving dark pool.',
    icon: '📡',
    accentColor: '#10d97e',
  },
];

const ROLE_LABELS: Record<PartyRole, string> = {
  Manufacturer: 'Foundry',
  PrimaryBuyer: 'Primary Buyer',
  SecondaryBuyer: 'Secondary Buyer',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoginPageProps {
  onLogin: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loadingCompanyId, setLoadingCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCompany = async (company: CompanyConfig) => {
    setLoadingCompanyId(company.id);
    setError(null);

    try {
      // For the Manufacturer, we request additional actAs for the buyers.
      // This grants the foundry the ability to issue assets directly to buyer
      // parties as co-signatories — a Canton sandbox-specific convenience.
      const additionalActAs = company.role === 'Manufacturer'
        ? ['AppleInc', 'QualcommInc']
        : [];

      const { partyId } = await ApiService.login(company.id, additionalActAs);

      const session: AuthSession = {
        partyId,
        displayName: company.displayName,
        role: company.role,
      };

      onLogin(session);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Login failed', err);
      setError('Could not connect to the Canton network. Ensure the sandbox and backend are running.');
      setLoadingCompanyId(null);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div
        className="glow-orb w-[600px] h-[600px] top-[-200px] left-[5%] opacity-15"
        style={{ background: 'radial-gradient(circle, #4f8dff, transparent 70%)' }}
      />
      <div
        className="glow-orb w-[400px] h-[400px] bottom-[-100px] right-[-50px] opacity-10"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
      />

      {/* Navbar */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-shadow group-hover:shadow-lg"
            style={{ background: 'var(--primary)', boxShadow: '0 0 20px var(--primary-glow)' }}
          >
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            syn<span className="gradient-text">CCap</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              background: 'var(--primary-glow)',
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
            }}
          >
            <Zap className="w-3 h-3" />
            Canton Network
          </span>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Permissioned Platform Access
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            Select your{' '}
            <span className="gradient-text">company account</span>
          </h1>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            Each company operates as an independent legal entity on the Canton permissioned network.
            Your session is scoped exclusively to your company's ledger perspective.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-8 px-4 py-3 rounded-xl text-sm border"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* Company cards — 3-column grid, square 1:1 */}
        <div className="grid grid-cols-3 gap-6">
          {COMPANIES.map((company) => {
            const isLoading = loadingCompanyId === company.id;
            const isDisabled = loadingCompanyId !== null;

            return (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                disabled={isDisabled}
                className="aspect-square rounded-2xl border p-6 transition-all duration-200 group flex flex-col items-center justify-center gap-4 text-center"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: isLoading ? company.accentColor : 'var(--border-color)',
                  boxShadow: isLoading ? `0 0 24px ${company.accentColor}25` : 'none',
                  opacity: isDisabled && !isLoading ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = company.accentColor;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 24px ${company.accentColor}20`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }
                }}
              >
                {/* Company icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: `${company.accentColor}15`, border: `1px solid ${company.accentColor}30` }}
                >
                  {isLoading ? (
                    <div
                      className="w-7 h-7 border-2 rounded-full animate-spin"
                      style={{ borderColor: company.accentColor, borderTopColor: 'transparent' }}
                    />
                  ) : company.icon}
                </div>

                {/* Company name & role */}
                <div>
                  <div className="font-bold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {company.displayName}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${company.accentColor}20`, color: company.accentColor }}
                  >
                    {ROLE_LABELS[company.role]}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {isLoading ? 'Authenticating with Canton Network…' : company.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Privacy note */}
        <div
          className="mt-10 flex items-start gap-3 px-4 py-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Canton Sub-Transaction Privacy:</strong>{' '}
            After login, your session is cryptographically scoped to your company's participant node.
            Ledger state from other companies is physically inaccessible — not just hidden by the UI.
          </p>
        </div>
      </main>
    </div>
  );
};
