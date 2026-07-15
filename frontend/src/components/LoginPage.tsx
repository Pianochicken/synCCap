/**
 * @file components/LoginPage.tsx
 * @description Enterprise B2B SaaS login page for the synCCap platform.
 *
 * Layout: Left-Right split (brand panel + auth panel).
 * - Left: Brand visual with tech feature highlights (decorative, dark gradient)
 * - Right: Standard enterprise login form (decorative) + Demo Quick Access section
 *
 * In production, the standard form would integrate with the participant
 * node's IAM (OAuth2 / OpenID Connect / SSO). For the Hackathon demo,
 * the "Quick Access" section allows one-click role selection.
 *
 * Demo Session Isolation:
 * In Devnet mode, each browser receives a unique demoSessionId. All assets
 * created during this session are tagged with _SID_<id>, and the UI filters
 * to only show that session's data — preventing data collision on the public URL.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap, Shield, ArrowRight, Building2, ChevronRight,
  Lock, RefreshCw, Eye, EyeOff, Activity, Layers, ArrowLeft
} from 'lucide-react';
import { ApiService } from '../api/client';
import type { AuthSession, CompanyConfig, PartyRole } from '../types/AuthSession';
import { useNetwork } from '../context/NetworkContext';
import { useDemoSessionContext } from '../context/DemoSessionContext';
import { ThemeToggle } from './ThemeToggle';
import { NetworkSelector } from './NetworkSelector';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPANIES: CompanyConfig[] = [
  {
    id: 'synccap-manufacturer-1',
    displayName: 'Manufacturer',
    role: 'Manufacturer',
    description: 'Semiconductor foundry. Issue and settle capacity tokens.',
    icon: '🏭',
    accentColor: '#4f8dff',
  },
  {
    id: 'synccap-primary-buyer-1',
    displayName: 'Primary Buyer',
    role: 'PrimaryBuyer',
    description: 'Primary capacity purchaser. Access the dark pool.',
    icon: '🏢',
    accentColor: '#a78bfa',
  },
  {
    id: 'synccap-secondary-buyer-1',
    displayName: 'Secondary Buyer',
    role: 'SecondaryBuyer',
    description: 'Secondary market acquirer. Privacy-preserving settlement.',
    icon: '📡',
    accentColor: '#10d97e',
  },
];

const ROLE_LABELS: Record<PartyRole, string> = {
  Manufacturer: 'Foundry',
  PrimaryBuyer: 'Primary Buyer',
  SecondaryBuyer: 'Secondary Buyer',
};

const TECH_FEATURES = [
  {
    icon: Shield,
    title: 'Sub-Transaction Privacy',
    desc: 'Canton ensures cost basis is cryptographically invisible to counterparties.',
  },
  {
    icon: Zap,
    title: 'Atomic Settlement',
    desc: 'All-or-nothing RFQ settlement. No partial fills, no front-running risk.',
  },
  {
    icon: Layers,
    title: 'Real-World Asset Tokenisation',
    desc: 'Semiconductor foundry capacity as on-chain verifiable contracts.',
  },
  {
    icon: Activity,
    title: 'Real-Time Ledger Events',
    desc: 'WebSocket-driven updates. Zero polling latency across all parties.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoginPageProps {
  onLogin: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { network } = useNetwork();
  const { demoSessionId, resetSession } = useDemoSessionContext();

  const [loadingCompanyId, setLoadingCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isDevnet = network === 'devnet';

  const handleSelectCompany = async (company: CompanyConfig) => {
    setLoadingCompanyId(company.id);
    setError(null);

    try {
      if (isDevnet) {
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/auth/devnet/token`);
        if (!res.ok) throw new Error('Failed to fetch devnet token from backend');

        const data = await res.json();
        const devnetNamespace =
          import.meta.env.VITE_DEVNET_NAMESPACE ||
          '1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
        const fqdnPartyId = `${company.id}::${devnetNamespace}`;

        if (data.token) {
          sessionStorage.setItem('synccap_token', data.token);
          sessionStorage.setItem('synccap_partyId', fqdnPartyId);
        }

        const session: AuthSession = {
          partyId: fqdnPartyId,
          displayName: company.displayName,
          role: company.role,
          demoSessionId,
        };
        onLogin(session);
        navigate('/dashboard');
        return;
      }

      const additionalActAs =
        company.role === 'Manufacturer'
          ? ['synccap-primary-buyer-1', 'synccap-secondary-buyer-1']
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
      setError(
        'Could not connect to the Canton network. Ensure the sandbox and backend are running.'
      );
      setLoadingCompanyId(null);
    }
  };

  const handleSsoClick = () => {
    setError('Enterprise SSO is not configured in demo mode. Use the Quick Access section below.');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      {/* ── LEFT PANEL — Brand / Visual ─────────────────────────────────── */}
      {/* sticky + h-screen + overflow-hidden keeps the left panel fixed in place
          so that right panel height changes (e.g. error messages) don't shift it */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col relative overflow-hidden sticky top-0 h-screen"
        style={{
          background: 'linear-gradient(145deg, #060810 0%, #0d1225 40%, #0f1628 100%)',
        }}
      >
        {/* Ambient glow orbs */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(79,141,255,0.12) 0%, transparent 65%)',
            top: '-150px',
            left: '-150px',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 65%)',
            bottom: '-100px',
            right: '-100px',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(79,141,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(79,141,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <img
              src="/logo.png"
              alt="synCCap"
              className="w-10 h-10 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(79,141,255,0.6))' }}
            />
            <span className="text-xl font-black tracking-tight text-white">
              syn<span className="gradient-text">CCap</span>
            </span>
          </div>

          {/* Main copy */}
          <div className="py-12">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
              style={{
                background: 'rgba(79,141,255,0.12)',
                borderColor: 'rgba(79,141,255,0.3)',
                color: '#4f8dff',
              }}
            >
              <Zap className="w-3 h-3" />
              Powered by Canton Network
            </div>

            <h1 className="text-3xl xl:text-4xl font-black leading-tight text-white mb-4">
              The institutional-grade{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #4f8dff, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                capacity market
              </span>{' '}
              for semiconductor supply chains.
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              synCCap brings privacy-preserving tokenisation and atomic settlement
              to foundry capacity allocation — on the Canton permissioned ledger.
            </p>
          </div>

          {/* Tech feature list */}
          <div className="space-y-4">
            {TECH_FEATURES.map((feat) => (
              <div key={feat.title} className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(79,141,255,0.12)',
                    border: '1px solid rgba(79,141,255,0.2)',
                  }}
                >
                  <feat.icon className="w-3.5 h-3.5" style={{ color: '#4f8dff' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{feat.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom attribution */}
          <div className="mt-auto pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Built for Canton Network Hackathon · 2026
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth Form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-8 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">

        {/* Top navbar strip: back link + theme toggle */}
        <div className="flex items-center justify-between pt-6 pb-2 mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Overview</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Mobile logo (only visible on small screens) */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.png" alt="synCCap" className="w-7 h-7 object-contain" />
              <span className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                syn<span className="gradient-text">CCap</span>
              </span>
            </div>
            <NetworkSelector />
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center py-8">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your institutional account.
            </p>
          </div>

          {/* Standard Login Form (decorative / enterprise placeholder) */}
          <div className="space-y-4 mb-5">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Work Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 pr-12"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSsoClick}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: 'var(--primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 20px var(--primary-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Lock className="w-4 h-4" />
              Sign In
            </button>
          </div>

          {/* SSO button */}
          <button
            onClick={handleSsoClick}
            className="w-full px-5 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 flex items-center justify-center gap-2.5 mb-8"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
          >
            <Building2 className="w-4 h-4" />
            Continue with Enterprise SSO
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-8">
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
            <span
              className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{
                background: 'var(--bg-surface-2)',
                color: 'var(--text-muted)',
              }}
            >
              Hackathon Demo Quick Access
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-xs border"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {/* Demo company buttons */}
          <div className="space-y-3 mb-6">
            {COMPANIES.map((company) => {
              const isLoading = loadingCompanyId === company.id;
              const isDisabled = loadingCompanyId !== null;

              return (
                <button
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  disabled={isDisabled}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 text-left group"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: isLoading ? company.accentColor : 'var(--border-color)',
                    boxShadow: isLoading ? `0 0 0 3px ${company.accentColor}20` : 'none',
                    opacity: isDisabled && !isLoading ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = company.accentColor;
                      e.currentTarget.style.background = 'var(--bg-surface-hover)';
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${company.accentColor}15`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.background = 'var(--bg-surface)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{
                      background: `${company.accentColor}15`,
                      border: `1px solid ${company.accentColor}30`,
                    }}
                  >
                    {isLoading ? (
                      <div
                        className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: company.accentColor, borderTopColor: 'transparent' }}
                      />
                    ) : (
                      company.icon
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {company.displayName}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${company.accentColor}18`,
                          color: company.accentColor,
                        }}
                      >
                        {ROLE_LABELS[company.role]}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {isLoading ? 'Authenticating with Canton Network…' : company.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  {!isLoading && (
                    <ArrowRight
                      className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                      style={{ color: company.accentColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Demo Session ID badge (Devnet only) */}
          {isDevnet && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl border"
              style={{
                background: 'var(--bg-surface-2)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#10d97e' }}
                />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Demo Session
                  </p>
                  <p
                    className="text-xs font-mono tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    #{demoSessionId}
                  </p>
                </div>
              </div>
              <button
                onClick={resetSession}
                className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="Reset session to get a fresh isolated workspace"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          )}

          {/* Canton privacy footnote */}
          <p className="mt-6 text-xs text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <Shield className="w-3 h-3 inline mr-1 -mt-0.5" style={{ color: 'var(--primary)' }} />
            Sessions are cryptographically scoped to your Canton party.
            {isDevnet && (
              <> Each visitor gets an isolated demo workspace on the shared ledger.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
