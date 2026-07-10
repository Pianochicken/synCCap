import React from 'react';
import type { ReactNode } from 'react';
import { DamlLedger } from '@c7-digital/react';
import { AuthProvider, useAuth } from '@c7-digital/react/auth';
import { useNetwork } from '../context/NetworkContext';

// We import the generated package to pass it to versionedRegistry
import * as synccapPkg from '@daml.js/synccap-v5-0.1.0';

function base64UrlEncode(obj: any) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateLocalToken(partyId: string) {
  // Extract a valid user ID from the party ID (remove the ::fingerprint part)
  const userId = partyId.split('::')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
  
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncode({ 
    sub: userId || 'local-user', 
    exp: Math.floor(Date.now() / 1000) + 86400,
    "https://daml.com/ledger-api": {
      actAs: [partyId],
      readAs: [partyId],
      admin: true
    }
  });
  return `${header}.${payload}.mocksignature`;
}

export const LedgerProvider: React.FC<{ children: ReactNode; partyId?: string }> = ({ children, partyId }) => {
  const { network, config } = useNetwork();
  const [devnetToken, setDevnetToken] = React.useState<string | null>(null);
  const [devnetError, setDevnetError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (network === 'devnet') {
      setDevnetError(null);
      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/auth/devnet/token`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch devnet token from backend');
          return res.json();
        })
        .then(data => {
          if (data.token) {
            setDevnetToken(data.token);
          } else {
            throw new Error(data.error || 'Unknown error fetching token');
          }
        })
        .catch(err => {
          console.error(err);
          setDevnetError(err.message);
        });
    } else {
      setDevnetToken(null);
      setDevnetError(null);
    }
  }, [network]);

  if (config.isOidc) {
    return (
      <AuthProvider 
        oidcAuthority={config.oidcAuthority!}
        oidcClientId={config.oidcClientId!}
        httpBaseUrl={config.ledgerUrl}
      >
        <AuthenticatedLedger>{children}</AuthenticatedLedger>
      </AuthProvider>
    );
  }

  // If devnet and still loading token
  if (network === 'devnet' && !devnetToken && !devnetError) {
    return <div className="flex items-center justify-center h-screen text-blue-400">Loading Devnet M2M token...</div>;
  }

  // If devnet and failed to load token
  if (network === 'devnet' && devnetError) {
    return <div className="flex items-center justify-center h-screen text-red-500">Devnet Error: {devnetError}</div>;
  }

  // Determine token to use
  const token = network === 'devnet' ? devnetToken! : (partyId ? generateLocalToken(partyId) : 'dummy');

  return (
    <DamlLedger
      token={token}
      httpBaseUrl={config.ledgerUrl}
      versionedRegistry={synccapPkg as any}
    >
      {children}
    </DamlLedger>
  );
};

const AuthenticatedLedger: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const { config } = useNetwork();

  // If user is not authenticated, show login button
  if (auth.isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading authentication...</div>;
  }

  if (auth.error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Auth Error: {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Seaport Devnet Authentication Required</h2>
        <button
          onClick={() => auth.loginWithOidc()}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
        >
          Login to Devnet
        </button>
      </div>
    );
  }

  return (
    <DamlLedger
      token={auth.user?.access_token || ''}
      httpBaseUrl={config.ledgerUrl}
      versionedRegistry={synccapPkg as any}
    >
      {children}
    </DamlLedger>
  );
};
