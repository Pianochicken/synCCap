import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { Server, Globe } from 'lucide-react';

export const NetworkSelector: React.FC = () => {
  const { network, setNetwork } = useNetwork();

  const handleToggle = () => {
    setNetwork(network === 'local' ? 'devnet' : 'local');
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
        network === 'devnet'
          ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
          : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
      }`}
      title={`Currently on ${network === 'local' ? 'Local Sandbox' : 'Seaport Devnet'}`}
    >
      {network === 'local' ? (
        <>
          <Server className="w-4 h-4" />
          <span className="hidden sm:inline-block">Local</span>
        </>
      ) : (
        <>
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline-block">Devnet</span>
        </>
      )}
    </button>
  );
};
