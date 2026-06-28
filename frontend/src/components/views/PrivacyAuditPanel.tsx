import React from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { PartyRole } from '../../types/AuthSession';

interface PrivacyAuditPanelProps {
  currentRole: PartyRole;
}

const getVisibility = (dataPoint: string, currentRole: PartyRole): boolean => {
  switch (dataPoint) {
    case 'Original Cost Basis':
      return currentRole === 'Manufacturer' || currentRole === 'PrimaryBuyer';
    case 'Penalty Cancellation Agreements':
      return currentRole === 'Manufacturer' || currentRole === 'PrimaryBuyer';
    case 'Dark Pool Transfer Prices':
      return currentRole === 'PrimaryBuyer' || currentRole === 'SecondaryBuyer';
    default:
      return false;
  }
};

const rows = [
  { label: 'Original Wafer Cost Basis',       key: 'Original Cost Basis' },
  { label: 'Penalty Cancellation Agreements', key: 'Penalty Cancellation Agreements' },
  { label: 'Dark Pool Transfer Prices',        key: 'Dark Pool Transfer Prices' },
];

export const PrivacyAuditPanel: React.FC<PrivacyAuditPanelProps> = ({ currentRole }) => {
  if (!currentRole) return null;

  return (
    <div
      className="mt-8 pt-8"
      style={{ borderTop: '1px solid var(--border-color)' }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}
        >
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Canton Privacy Audit Matrix
        </h3>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border-color)' }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-2 px-5 py-3"
          style={{
            background: 'var(--bg-surface-2)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Data Point
          </div>
          <div
            className="text-xs font-bold uppercase tracking-wider text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Your Visibility
          </div>
        </div>

        {/* Table rows */}
        {rows.map((row, idx) => {
          const isVisible = getVisibility(row.key, currentRole);
          return (
            <div
              key={idx}
              className="grid grid-cols-2 px-5 py-3.5 items-center transition-colors"
              style={{
                borderBottom: idx < rows.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: idx % 2 === 1 ? 'var(--bg-surface-2)' : 'var(--bg-surface)',
              }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {row.label}
              </div>
              <div className="flex justify-center">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={
                    isVisible
                      ? {
                          background: 'rgba(16,217,126,0.10)',
                          color: '#10d97e',
                          border: '1px solid rgba(16,217,126,0.25)',
                        }
                      : {
                          background: 'rgba(240,77,77,0.10)',
                          color: '#f04d4d',
                          border: '1px solid rgba(240,77,77,0.25)',
                        }
                  }
                >
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  {isVisible ? 'VISIBLE' : 'HIDDEN'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
