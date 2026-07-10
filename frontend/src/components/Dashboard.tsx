import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Server, Globe, Zap, RefreshCw, Copy, Check } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { useDemoSessionContext } from '../context/DemoSessionContext';
import { ThemeToggle } from './ThemeToggle';
import { ManufacturerView } from './views/ManufacturerView';
import { PrimaryBuyerView } from './views/PrimaryBuyerView';
import { SecondaryBuyerView } from './views/SecondaryBuyerView';
import { PrivacyAuditPanel } from './views/PrivacyAuditPanel';
import type { AuthSession } from '../types/AuthSession';

export const ROLE_LABELS = {
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
  PrimaryBuyer: '🏢',
  SecondaryBuyer: '📡',
};

interface DashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const { demoSessionId, resetSession } = useDemoSessionContext();
  const [copied, setCopied] = useState(false);
  const isDevnetSession = Boolean(session.demoSessionId);
  const roleColor = ROLE_COLORS[session.role];
  const { network } = useNetwork();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard?session=${demoSessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-12 h-20 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src="/logo.png" 
            alt="synCCap Logo" 
            className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(79,141,255,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_rgba(79,141,255,0.7)]" 
          />
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            syn<span className="gradient-text">CCap</span>
          </span>
        </Link>

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
              <div className="leading-tight flex items-center h-full">
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {session.displayName}
                </div>
              </div>
            </div>

            {/* Demo Session ID chip (Devnet only) */}
            {isDevnetSession && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs"
                style={{
                  background: 'rgba(16,217,126,0.06)',
                  borderColor: 'rgba(16,217,126,0.25)',
                  color: 'var(--text-muted)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#10d97e] animate-pulse" />
                <span className="font-mono tracking-wider">#{demoSessionId}</span>
                <button
                  onClick={handleCopyLink}
                  title="Copy session invite link"
                  className="ml-1 hover:opacity-70 transition-opacity"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
                <div className="w-px h-3 bg-green-500/20 mx-1" />
                <button
                  onClick={resetSession}
                  title="Reset demo session"
                  className="hover:opacity-70 transition-opacity"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Logout */}
            <button onClick={onLogout} className="btn-ghost text-sm">
              <LogOut className="w-4 h-4" />
              Log Out
            </button>

            {/* Canton Network Badge */}
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
              style={{
                background: 'var(--primary-glow)',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
              }}
            >
              <Zap className="w-3 h-3" />
              Canton Network
            </span>

            {/* Network Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium ${
                network === 'devnet'
                  ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              }`}
              title="Current Network"
            >
              {network === 'local' ? <Server className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span className="hidden sm:inline-block capitalize">{network}</span>
            </div>

            <ThemeToggle />

          </div>
        </nav>

      <div className="relative max-w-6xl mx-auto px-4 py-8">
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
