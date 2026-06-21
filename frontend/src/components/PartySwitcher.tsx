import React from 'react';
import { LogOut, User } from 'lucide-react';
import clsx from 'clsx';

export type PartyRole = 'Manufacturer' | 'PrimaryBuyer' | 'SecondaryBuyer' | null;

export const PARTIES = [
  { id: 'TSMC', name: 'TSMC', role: 'Manufacturer' as PartyRole, desc: 'Issues & Settles Capacity' },
  { id: 'AppleInc', name: 'Apple Inc.', role: 'PrimaryBuyer' as PartyRole, desc: 'Initial Capacity Purchaser' },
  { id: 'QualcommInc', name: 'Qualcomm Inc.', role: 'SecondaryBuyer' as PartyRole, desc: 'Dark Pool Acquirer' },
];

interface PartySwitcherProps {
  currentPartyId: string | null;
  onSwitchParty: (partyId: string, role: PartyRole) => void;
}

export const PartySwitcher: React.FC<PartySwitcherProps> = ({ currentPartyId, onSwitchParty }) => {
  return (
    <div className="glass p-6 rounded-2xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Canton Privacy Demonstration
          </h2>
          <p className="text-gray-400 mt-1">
            Switch between parties to observe how the Canton Network physically segregates state on a need-to-know basis.
          </p>
        </div>
        
        {currentPartyId && (
          <button 
            onClick={() => onSwitchParty('', null)}
            className="mt-4 md:mt-0 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Clear Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PARTIES.map((party) => {
          const isActive = currentPartyId === party.id;
          return (
            <button
              key={party.id}
              onClick={() => onSwitchParty(party.id, party.role)}
              className={clsx(
                "text-left p-4 rounded-xl border transition-all duration-200",
                isActive 
                  ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-primary"
                  : "bg-surface-hover/50 border-gray-800 hover:border-gray-600 hover:bg-surface-hover"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={clsx(
                  "font-bold text-lg",
                  isActive ? "text-primary" : "text-white"
                )}>{party.name}</span>
                {isActive && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-400 mb-1">{party.role}</div>
              <div className="text-xs text-gray-500">{party.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
