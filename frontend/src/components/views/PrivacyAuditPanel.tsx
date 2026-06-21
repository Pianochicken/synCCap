import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import type { PartyRole } from '../PartySwitcher';

interface PrivacyAuditPanelProps {
  currentRole: PartyRole;
}

export const PrivacyAuditPanel: React.FC<PrivacyAuditPanelProps> = ({ currentRole }) => {
  if (!currentRole) return null;

  const getVisibility = (dataPoint: string) => {
    switch (dataPoint) {
      case 'Original Cost Basis':
        if (currentRole === 'Manufacturer' || currentRole === 'PrimaryBuyer') return true;
        return false;
      case 'Penalty Cancellation Agreements':
        if (currentRole === 'Manufacturer' || currentRole === 'PrimaryBuyer') return true;
        return false;
      case 'Dark Pool Transfer Prices':
        if (currentRole === 'PrimaryBuyer' || currentRole === 'SecondaryBuyer') return true;
        return false; // Actually Manufacturer might see it if they are signatory to RFQ, but let's highlight Canton privacy here.
      default:
        return false;
    }
  };

  const rows = [
    { label: 'Original Wafer Cost Basis', key: 'Original Cost Basis' },
    { label: 'Penalty Cancellation Agreements', key: 'Penalty Cancellation Agreements' },
    { label: 'Dark Pool Transfer Prices', key: 'Dark Pool Transfer Prices' },
  ];

  return (
    <div className="mt-12 border-t border-gray-800 pt-8">
      <h3 className="text-lg font-bold text-gray-300 mb-4 px-2">Canton Privacy Audit Matrix</h3>
      <div className="bg-surface/50 rounded-xl overflow-hidden border border-gray-800/50">
        <div className="grid grid-cols-2 bg-black/40 p-3 border-b border-gray-800/50">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Point</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Your Visibility</div>
        </div>
        {rows.map((row, idx) => {
          const isVisible = getVisibility(row.key);
          return (
            <div key={idx} className="grid grid-cols-2 p-3 border-b border-gray-800/50 last:border-0 items-center hover:bg-surface transition-colors">
              <div className="text-sm text-gray-300 font-medium">{row.label}</div>
              <div className="flex justify-center">
                <div className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                  isVisible ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
                )}>
                  {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
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
