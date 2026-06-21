import { useEffect, useState } from 'react';
import { PartySwitcher } from './components/PartySwitcher';
import type { PartyRole } from './components/PartySwitcher';
import { ManufacturerView } from './components/views/ManufacturerView';
import { PrimaryBuyerView } from './components/views/PrimaryBuyerView';
import { SecondaryBuyerView } from './components/views/SecondaryBuyerView';
import { PrivacyAuditPanel } from './components/views/PrivacyAuditPanel';
import { ApiService } from './api/client';
import { Layers } from 'lucide-react';

function App() {
  const [currentPartyId, setCurrentPartyId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<PartyRole>(null);
  
  // Data States
  const [assets, setAssets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedPartyId = localStorage.getItem('synccap_partyId');
    if (savedPartyId) {
      setCurrentPartyId(savedPartyId);
      if (savedPartyId.startsWith('TSMC')) setCurrentRole('Manufacturer');
      else if (savedPartyId.startsWith('AppleInc')) setCurrentRole('PrimaryBuyer');
      else if (savedPartyId.startsWith('QualcommInc')) setCurrentRole('SecondaryBuyer');
    }
  }, []);

  // Fetch data whenever party changes
  useEffect(() => {
    if (currentPartyId) {
      fetchDashboardData();
    } else {
      // Clear data if logged out
      setAssets([]);
      setTransfers([]);
      setPenalties([]);
    }
  }, [currentPartyId]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const [assetsData, transfersData, penaltiesData] = await Promise.all([
        ApiService.getAssets(),
        ApiService.getTransfers(),
        ApiService.getPenalties()
      ]);
      setAssets(assetsData);
      setTransfers(transfersData);
      setPenalties(penaltiesData);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      alert('Could not fetch ledger state. Make sure Canton Sandbox and Backend are running.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSwitchParty = async (partyId: string, role: PartyRole) => {
    if (!partyId) {
      ApiService.logout();
      setCurrentPartyId(null);
      setCurrentRole(null);
      return;
    }
    
    try {
      // Get new token
      const auth = await ApiService.login(partyId);
      setCurrentPartyId(auth.partyId);
      setCurrentRole(role);
    } catch (err) {
      console.error('Login failed', err);
      alert('Failed to switch party. Check backend logs.');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-10 pb-6 border-b border-gray-800">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">synCCap</h1>
            <p className="text-sm font-medium text-gray-400">Universal Capacity Tokenization & Privacy-Preserving Settlement</p>
          </div>
        </header>

        {/* Identity Switcher */}
        <PartySwitcher 
          currentPartyId={currentPartyId} 
          onSwitchParty={handleSwitchParty} 
        />

        {/* Dashboard Content */}
        {!currentPartyId ? (
          <div className="text-center py-20 px-4">
            <Layers className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-300 mb-2">Select a Party to Begin</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              You are currently viewing the system as an unauthenticated external observer. 
              Because Canton Network provides sub-transaction privacy, you can see absolutely nothing on the ledger.
            </p>
          </div>
        ) : loadingData ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Syncing with Canton Ledger...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentRole === 'Manufacturer' && (
              <ManufacturerView 
                assets={assets} 
                penalties={penalties} 
                onRefresh={fetchDashboardData} 
              />
            )}
            
            {currentRole === 'PrimaryBuyer' && (
              <PrimaryBuyerView 
                assets={assets} 
                onRefresh={fetchDashboardData} 
              />
            )}
            
            {currentRole === 'SecondaryBuyer' && (
              <SecondaryBuyerView 
                assets={assets} 
                transfers={transfers} 
                onRefresh={fetchDashboardData} 
              />
            )}

            {/* Privacy Matrix */}
            <PrivacyAuditPanel currentRole={currentRole} />
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
