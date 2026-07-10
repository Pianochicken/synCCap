/**
 * @file components/LandingPage.tsx
 * @description The marketing / intro landing page for synCCap.
 *
 * Sections:
 *  1. Hero — headline + CTA
 *  2. Problem Statement — why existing solutions fail
 *  3. How it Works — 3-step flow diagram
 *  4. Canton Privacy Deep-dive — privacy guarantee visualisation
 *  5. Roles — TSMC / Apple / Qualcomm personas
 *  6. CTA — Enter the Demo
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Building2,
  Cpu,
  Globe,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';


/* ─── tiny reusable pieces ────────────────────────────────────────────────── */



const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-muted)' }}>
    {children}
  </p>
);

/* ─── Step card ────────────────────────────────────────────────────────────── */

interface StepCardProps {
  step: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
}

const StepCard: React.FC<StepCardProps> = ({ step, title, desc, icon, accent }) => (
  <div className="card-glow relative flex flex-col gap-4 overflow-hidden group">
    {/* step number watermark */}
    <span
      className="absolute top-4 right-5 text-7xl font-black leading-none select-none pointer-events-none transition-opacity duration-300 opacity-5 group-hover:opacity-10"
      style={{ color: accent }}
    >
      {step}
    </span>
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
      style={{ background: accent }}
    >
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {desc}
      </p>
    </div>
  </div>
);

/* ─── Privacy comparison table ─────────────────────────────────────────────── */

const privacyRows = [
  { label: "Qualcomm sees Apple's cost basis?", publicChain: true, traditionalDB: true, canton: false },
  { label: 'Trustless atomic settlement?',      publicChain: true, traditionalDB: false, canton: true },
  { label: 'Bilateral private penalties?',       publicChain: false, traditionalDB: true,  canton: true },
  { label: 'No central operator needed?',        publicChain: true,  traditionalDB: false, canton: true },
  { label: 'Institutional-grade privacy?',       publicChain: false, traditionalDB: false, canton: true },
];

const Tick: React.FC<{ ok: boolean; invert?: boolean }> = ({ ok, invert = false }) => {
  const positive = invert ? !ok : ok;
  return positive
    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
    : <XCircle className="w-5 h-5 text-red-400 mx-auto" />;
};

/* ─── Role card ────────────────────────────────────────────────────────────── */

interface RoleCardProps {
  emoji: string;
  name: string;
  role: string;
  color: string;
  sees: string[];
  blind: string[];
}

const RoleCard: React.FC<RoleCardProps> = ({ emoji, name, role, color, sees, blind }) => (
  <div className="card flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow"
        style={{ background: `${color}18` }}
      >
        {emoji}
      </div>
      <div>
        <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{name}</div>
        <div className="text-xs font-medium" style={{ color }}>{role}</div>
      </div>
    </div>
    <div className="space-y-2">
      {sees.map((s) => (
        <div key={s} className="flex items-start gap-2 text-sm">
          <Eye className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
        </div>
      ))}
      {blind.map((b) => (
        <div key={b} className="flex items-start gap-2 text-sm">
          <EyeOff className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <span style={{ color: 'var(--text-muted)' }}>{b}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Main component ────────────────────────────────────────────────────────── */

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--bg-page)' }}>

      {/* ── Background decoration ── */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div
        className="glow-orb w-[700px] h-[700px] top-[-200px] left-[10%] opacity-20"
        style={{ background: 'radial-gradient(circle, #4f8dff, transparent 70%)' }}
      />
      <div
        className="glow-orb w-[500px] h-[500px] bottom-[0px] right-[-100px] opacity-15"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
      />

      {/* ─────────────── NAVBAR ─────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 h-20 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="synCCap Logo" 
            className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(79,141,255,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_rgba(79,141,255,0.7)]" 
          />
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            syn<span className="gradient-text">CCap</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <button
            onClick={() => navigate('/login')}
            className="btn-primary hidden sm:inline-flex"
          >
            Access Platform <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative z-10 text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">

        <div className="flex justify-center mb-6 animate-in" style={{ animationDelay: '40ms' }}>
          <img src="/logo.png" alt="synCCap Logo" className="w-64 h-64 object-contain" />
        </div>

        <h1
          className="mt-6 text-5xl md:text-7xl font-black leading-[1.05] tracking-tight animate-in"
          style={{ animationDelay: '80ms', color: 'var(--text-primary)' }}
        >
          The Dark Pool for{' '}
          <span className="gradient-text">Semiconductor</span>
          {' '}Capacity
        </h1>

        <p
          className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto animate-in"
          style={{ animationDelay: '160ms', color: 'var(--text-secondary)' }}
        >
          synCCap tokenizes Real-World semiconductor fab capacity as on-chain assets and enables
          confidential secondary market trading — where buyer margins are mathematically invisible
          to competitors, enforced by the{' '}
          <strong style={{ color: 'var(--primary)' }}>Canton Network's sub-transaction privacy</strong>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in" style={{ animationDelay: '240ms' }}>
          <button onClick={() => navigate('/login')} className="btn-primary text-base px-8 py-3">
            Access Platform <ChevronRight className="w-5 h-5" />
          </button>
          <a
            href="https://www.canton.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-base px-8 py-3"
          >
            Learn about Canton
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-xl mx-auto animate-in" style={{ animationDelay: '320ms' }}>
          {[
            { v: '3', label: 'Roles Demonstrated' },
            { v: '100%', label: 'Privacy Preserved' },
            { v: 'Atomic', label: 'Settlement' },
          ].map(({ v, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-black gradient-text">{v}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── PROBLEM ─────────────── */}
      <section className="relative z-10 px-6 py-20" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel>The Problem</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
            Billions in stranded capacity — with no safe exit
          </h2>
          <p className="text-base leading-relaxed max-w-2xl mb-12" style={{ color: 'var(--text-secondary)' }}>
            Tech giants commit years in advance for semiconductor fab capacity. When demand shifts,
            they face a brutal choice: absorb huge cancellation penalties, or resell on a secondary
            market — but publicly, where rivals can see every detail.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Globe className="w-5 h-5" />,
                title: 'Public Chains Leak BI',
                color: '#f04d4d',
                body: "Reselling on Ethereum means competitors can see exactly what the primary buyer paid the manufacturer. The supplier pricing is their most sensitive trade secret.",
              },
              {
                icon: <Building2 className="w-5 h-5" />,
                title: 'Centralized DBs Require Trust',
                color: '#f59e0b',
                body: "Traditional OTC platforms require trusting a central operator to not leak data. A single breach exposes the entire supply chain.",
              },
              {
                icon: <Lock className="w-5 h-5" />,
                title: 'Current Process: Manual & Slow',
                color: '#94a3b8',
                body: "Today, capacity transfers happen via spreadsheets, NDAs, and law firms. Settlement takes weeks and has no atomicity guarantee.",
              },
            ].map(({ icon, title, color, body }) => (
              <div key={title} className="card flex flex-col gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, color }}
                >
                  {icon}
                </div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── HOW IT WORKS ─────────────── */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
            Three steps. One atomic settlement.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* connector line (desktop only) */}
          <div className="hidden md:block absolute top-[3.5rem] left-[33%] right-[33%] h-px" style={{ background: 'var(--border-strong)' }} />

          <StepCard
            step={1}
            accent="#4f8dff"
            icon={<Cpu className="w-6 h-6" />}
            title="Manufacturer Issues Capacity Token"
            desc="The foundry mints a CapacityAsset on the Canton ledger — a legally-backed RWA representing a wafer lot. The cost basis is encoded and visible only to the manufacturer and the primary buyer."
          />
          <StepCard
            step={2}
            accent="#a78bfa"
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Primary Buyer Opens a Dark Pool RFQ"
            desc="The primary buyer exercises ProposeTransfer. This atomically archives the original asset and creates a TransferRFQ where the secondary buyer can see the asking price — but never the original cost. Privacy firewall enforced at the ledger."
          />
          <StepCard
            step={3}
            accent="#10d97e"
            icon={<Zap className="w-6 h-6" />}
            title="Secondary Buyer Accepts — Settlement in ≤1s"
            desc="The secondary buyer exercises AcceptTransfer. Canton atomically archives the RFQ and creates a new CapacityAsset owned by the new buyer. No partial states. No intermediaries. Finality in under one second."
          />
        </div>
      </section>

      {/* ─────────────── PRIVACY TABLE ─────────────── */}
      <section className="relative z-10 px-6 py-20" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Canton Privacy Advantage</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
              Why Canton, and not alternatives?
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface-2)' }}>
                  <th className="text-left px-6 py-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Property</th>
                  <th className="text-center px-4 py-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Public Chain</th>
                  <th className="text-center px-4 py-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Centralized DB</th>
                  <th className="text-center px-4 py-4 font-bold" style={{ color: 'var(--primary)' }}>Canton ✓</th>
                </tr>
              </thead>
              <tbody>
                {privacyRows.map(({ label, publicChain, traditionalDB, canton }, i) => (
                  <tr
                    key={label}
                    style={{
                      borderBottom: i < privacyRows.length - 1 ? '1px solid var(--border-color)' : 'none',
                      background: i % 2 === 1 ? 'var(--bg-surface-2)' : undefined,
                    }}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{label}</td>
                    <td className="text-center px-4 py-4">
                      <Tick ok={publicChain} invert={label.includes("sees Apple")} />
                    </td>
                    <td className="text-center px-4 py-4">
                      <Tick ok={traditionalDB} invert={label.includes("sees Apple")} />
                    </td>
                    <td className="text-center px-4 py-4">
                      <Tick ok={canton} invert={label.includes("sees Apple")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────────── ROLES ─────────────── */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>Demo Roles</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
            Three parties, one shared ledger — with zero information leakage
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RoleCard
            emoji="🏭"
            name="Manufacturer"
            role="Foundry"
            color="#4f8dff"
            sees={['All assets they issued', 'Full costBasisPerWafer', 'All penalty agreements']}
            blind={['Internal margins of buyers']}
          />
          <RoleCard
            emoji="🏢"
            name="Primary Buyer"
            role="Tier-1 Consumer"
            color="#a78bfa"
            sees={['Assets they own', 'Their own cost basis', 'Asking price on RFQs they create']}
            blind={["Secondary's agreed price after transfer", "Other buyer's contracts"]}
          />
          <RoleCard
            emoji="🛒"
            name="Secondary Buyer"
            role="Tier-2 Consumer"
            color="#10d97e"
            sees={['Incoming RFQ details', 'Asking price per wafer', 'Assets they own post-settlement']}
            blind={["Primary's original cost basis (forever!)", 'The archived CapacityAsset contract']}
          />
        </div>
      </section>

      {/* ─────────────── CTA ─────────────── */}
      <section
        className="relative z-10 px-6 py-24 text-center"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)' }}
      >
        <div
          className="glow-orb w-[400px] h-[400px] top-[-100px] left-[50%] -translate-x-1/2 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4f8dff, transparent 70%)' }}
        />
        <div className="relative max-w-xl mx-auto">
          <SectionLabel>Interactive Demo</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
            See Canton privacy <span className="gradient-text">in action</span>
          </h2>
          <p className="text-base mb-10" style={{ color: 'var(--text-secondary)' }}>
            Switch between parties and watch how the Canton Ledger physically segregates
            state on a need-to-know basis — all in real-time against a live sandbox.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-10 py-4">
            Launch Live Demo <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer
        className="relative z-10 px-6 py-8 text-center text-xs"
        style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}
      >
        <p>synCCap · Built on Canton Network · Apache 2.0 License</p>
      </footer>
    </div>
  );
};
