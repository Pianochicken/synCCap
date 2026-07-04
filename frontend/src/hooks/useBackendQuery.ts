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
    // Poll every 3 seconds
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
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
