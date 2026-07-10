import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ContractIdDisplayProps {
  contractId: string;
}

export const ContractIdDisplay: React.FC<ContractIdDisplayProps> = ({ contractId }) => {
  return (
    <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
      Contract:&nbsp;
      <a
        href={`https://lighthouse.devnet.cantonloop.com/contracts/${contractId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-1 font-mono font-medium hover:text-blue-500 transition-colors cursor-pointer"
        style={{ color: 'var(--text-primary)' }}
        title="View Contract Details on Lighthouse"
      >
        {contractId.slice(0, 6)}..{contractId.slice(-4)}
        <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 group-hover:text-blue-500 transition-opacity" />
      </a>
    </div>
  );
};
