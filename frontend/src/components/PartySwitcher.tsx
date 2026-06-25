import React from 'react';
import { LogOut, User } from 'lucide-react';

export type PartyRole = 'Manufacturer' | 'PrimaryBuyer' | 'SecondaryBuyer' | null;

export const PARTIES = [
  {
    id: 'TSMC',
    name: 'TSMC',
    role: 'Manufacturer' as PartyRole,
    desc: 'Issues & Settles Capacity',
    color: '#4f8dff',
    emoji: '🏭',
  },
  {
    id: 'AppleInc',
    name: 'Apple Inc.',
    role: 'PrimaryBuyer' as PartyRole,
    desc: 'Initial Capacity Purchaser',
    color: '#a78bfa',
    emoji: '🍎',
  },
  {
    id: 'QualcommInc',
    name: 'Qualcomm Inc.',
    role: 'SecondaryBuyer' as PartyRole,
    desc: 'Dark Pool Acquirer',
    color: '#10d97e',
    emoji: '📡',
  },
];

interface PartySwitcherProps {
  currentPartyId: string | null;
  onSwitchParty: (partyId: string, role: PartyRole) => void;
}

export const PartySwitcher: React.FC<PartySwitcherProps> = ({ currentPartyId, onSwitchParty }) => {
  return (
    <div className="card mb-8">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}
          >
            <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Canton Privacy Demonstration
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Switch parties to observe how Canton physically segregates state on a need-to-know basis.
            </p>
          </div>
        </div>

        {currentPartyId && (
          <button
            onClick={() => onSwitchParty('', null)}
            className="btn-ghost text-sm shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Clear Session
          </button>
        )}
      </div>

      {/* Party cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PARTIES.map((party) => {
          const isActive = currentPartyId?.startsWith(party.id) ?? false;
          return (
            <button
              key={party.id}
              onClick={() => onSwitchParty(party.id, party.role)}
              className="text-left p-4 rounded-xl border transition-all duration-200 w-full"
              style={{
                background: isActive ? `${party.color}12` : 'var(--bg-surface-2)',
                borderColor: isActive ? party.color : 'var(--border-color)',
                boxShadow: isActive ? `0 0 20px ${party.color}20` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{party.emoji}</span>
                  <span
                    className="font-bold text-base"
                    style={{ color: isActive ? party.color : 'var(--text-primary)' }}
                  >
                    {party.name}
                  </span>
                </div>
                {isActive && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: party.color }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ background: party.color }}
                    />
                  </span>
                )}
              </div>
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                style={{ color: isActive ? party.color : 'var(--text-muted)' }}
              >
                {party.role}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {party.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
