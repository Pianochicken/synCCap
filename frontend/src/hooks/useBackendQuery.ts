import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../api/client';

export function useBackendQuery() {
  const [assets, setAssets] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [rejectedLogs, setRejectedLogs] = useState<any[]>([]);
  const [withdrawnLogs, setWithdrawnLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      setAssets(assetsData);
      setFinancials(financialsData);
      setTransfers(transfersData);
      setLocks(locksData);
      setPenalties(penaltiesData);
      setRejectedLogs(rejectedData);
      setWithdrawnLogs(withdrawnData);
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Setup WebSocket for event-driven refreshing
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';
    const wsUrl = backendUrl.replace(/^http/, 'ws');
      
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for real-time updates');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'REFRESH_DATA') {
          console.log('Received REFRESH_DATA event, fetching latest state...');
          fetchData();
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    // Fallback polling (every 60 seconds) just in case WebSocket disconnects silently
    const interval = setInterval(fetchData, 60000);
    
    return () => {
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
