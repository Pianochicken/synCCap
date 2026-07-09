/**
 * @file context/DemoSessionContext.tsx
 * @description Global context for the Demo Session isolation mechanism.
 *
 * Provides demoSessionId and resetSession() to all components.
 * Used in Devnet mode to ensure each visitor's contracts are isolated.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getOrCreateSessionId, clearSessionId, setSessionId as persistSessionId } from '../hooks/useDemoSession';

interface DemoSessionContextValue {
  /** The current 8-char demo session ID (e.g. "xk9p2q3m") */
  demoSessionId: string;
  /** Clears the current session and generates a fresh one */
  resetSession: () => void;
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export const DemoSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    // 1. Check URL synchronously to avoid React Router redirect race conditions
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    
    if (sessionParam && sessionParam.length === 8) {
      persistSessionId(sessionParam);
      return sessionParam;
    }
    return getOrCreateSessionId();
  });

  // Clean up URL parameter if it was present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('session')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // 2. Cross-tab sync: Listen for changes to localStorage in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'synccap_demo_session_id' && e.newValue) {
        setSessionId(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const resetSession = useCallback(() => {
    const newId = clearSessionId();
    setSessionId(newId);
  }, []);

  return (
    <DemoSessionContext.Provider value={{ demoSessionId: sessionId, resetSession }}>
      {children}
    </DemoSessionContext.Provider>
  );
};

/** Hook to consume the DemoSession context. */
export function useDemoSessionContext(): DemoSessionContextValue {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) throw new Error('useDemoSessionContext must be used within DemoSessionProvider');
  return ctx;
}
