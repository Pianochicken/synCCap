import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../api/client';
import { useDemoSessionContext } from '../context/DemoSessionContext';

/**
 * Determines whether to apply the demo session filter.
 * Only active in Devnet mode. In Local Sandbox, Canton provides
 * physical isolation per party — no UI filtering needed.
 */
function isDevnetMode(): boolean {
  const stored = sessionStorage.getItem('synccap_session');
  if (!stored) return false;
  try {
    const session = JSON.parse(stored);
    return Boolean(session?.demoSessionId);
  } catch {
    return false;
  }
}

export function useBackendQuery() {
  const [assets, setAssets] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [rejectedLogs, setRejectedLogs] = useState<any[]>([]);
  const [withdrawnLogs, setWithdrawnLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { demoSessionId } = useDemoSessionContext();

  /**
   * Filters data by the demo session ID when in Devnet mode.
   * Contracts created in this session have their assetId suffixed with _SID_<sessionId>.
   * In Local Sandbox mode, all data is returned unfiltered.
   */
  const filterBySession = useCallback(<T extends { payload?: any }>(
    items: T[],
    field: string = 'assetId'
  ): T[] => {
    if (!isDevnetMode() || !demoSessionId) return items;
    const suffix = `_SID_${demoSessionId}`;
    return items.filter((item) => {
      const value = item?.payload?.[field] as string | undefined;
      return value?.includes(suffix) ?? false;
    });
  }, [demoSessionId]);

  const fetchData = useCallback(async () => {
    try {
      const [
        assetsData,
        financialsData,
        transfersData,
        locksData,
        penaltiesData,
        rejectedData,
        withdrawnData
      ] = await Promise.all([
        ApiService.getAssets(),
        ApiService.getFinancials(),
        ApiService.getTransfers ? ApiService.getTransfers() : Promise.resolve([]),
        ApiService.getLocks(),
        ApiService.getPenalties ? ApiService.getPenalties() : Promise.resolve([]),
        ApiService.getRejectedLogs ? ApiService.getRejectedLogs() : Promise.resolve([]),
        ApiService.getWithdrawnLogs ? ApiService.getWithdrawnLogs() : Promise.resolve([])
      ]);

      setAssets(filterBySession(assetsData));
      setFinancials(filterBySession(financialsData));
      setTransfers(filterBySession(transfersData));
      setLocks(filterBySession(locksData));
      setPenalties(filterBySession(penaltiesData));
      setRejectedLogs(filterBySession(rejectedData));
      setWithdrawnLogs(filterBySession(withdrawnData));
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, [filterBySession]);

  useEffect(() => {
    fetchData();

    // Setup WebSocket for event-driven refreshing
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';
    const wsUrl = backendUrl.replace(/^http/, 'ws');
      
    const ws = new WebSocket(wsUrl);

    let isCleaningUp = false;

    ws.onopen = () => {
      console.log('WebSocket connected for real-time updates');
      if (demoSessionId) {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId: demoSessionId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'REFRESH_DATA') {
          console.log('Received REFRESH_DATA event, fetching latest state with jitter...');
          // Add 0-1 seconds of random delay to prevent thundering herd problem while keeping UX responsive
          setTimeout(fetchData, Math.random() * 1000);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onerror = (err) => {
      if (!isCleaningUp) {
        console.error('WebSocket error:', err);
      }
    };

    ws.onclose = () => {
      if (!isCleaningUp) {
        console.log('WebSocket disconnected');
      }
    };

    // Fallback polling (every 60 seconds) in case WebSocket disconnects silently
    const interval = setInterval(() => {
      // Only fetch data if the tab is currently visible to save resources
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 60000);

    return () => {
      isCleaningUp = true;
      clearInterval(interval);
      ws.close();
    };
  }, [fetchData]);

  return {
    assets,
    financials,
    transfers,
    locks,
    penalties,
    rejectedLogs,
    withdrawnLogs,
    loadingAssets: loading,
    loadingFinancials: loading,
    loadingTransfers: loading,
    loadingPenalties: loading,
    loadingLocks: loading,
    loadingRejected: loading,
    loadingWithdrawn: loading
  };
}
