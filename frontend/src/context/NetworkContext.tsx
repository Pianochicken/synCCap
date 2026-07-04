import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type NetworkType = 'local' | 'devnet';

interface NetworkConfig {
  ledgerUrl: string;
  isOidc: boolean;
  oidcAuthority?: string;
  oidcClientId?: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  local: {
    ledgerUrl: '',
    isOidc: false,
  },
  devnet: {
    ledgerUrl: '/devnet-api',
    isOidc: false, // We use the backend M2M proxy now
  }
};

interface NetworkContextValue {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  config: NetworkConfig;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

const NETWORK_STORAGE_KEY = 'synccap_network_pref';

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [network, setNetwork] = useState<NetworkType>(() => {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    return (saved === 'devnet' || saved === 'local') ? saved : 'local';
  });

  const handleSetNetwork = (n: NetworkType) => {
    localStorage.setItem(NETWORK_STORAGE_KEY, n);
    setNetwork(n);
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork: handleSetNetwork, config: NETWORKS[network] }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) throw new Error('useNetwork must be used within NetworkProvider');
  return context;
};
