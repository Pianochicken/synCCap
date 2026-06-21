import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { Cpu, DollarSign, Activity, FileWarning, CheckCircle } from 'lucide-react';

interface ManufacturerViewProps {
  assets: any[];
  penalties: any[];
  onRefresh: () => void;
}

export const ManufacturerView: React.FC<ManufacturerViewProps> = ({ assets, penalties, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    owner: 'AppleInc', // Default to PrimaryBuyer
    technologyNode: 'N3nm',
    waferStartsPerMonth: 10000,
    costBasisPerWafer: '18500.00',
  });

  const handleIssueAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await ApiService.createAsset({
        owner: formData.owner,
        assetId: `WAFER-BATCH-${Math.floor(Math.random() * 100000)}`,
        technologyNode: formData.technologyNode as any,
        waferStartsPerMonth: formData.waferStartsPerMonth,
        costBasisPerWafer: formData.costBasisPerWafer,
        commitmentStartDate: new Date().toISOString(),
        commitmentEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to issue asset.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettlePenalty = async (contractId: string) => {
    try {
      setLoading(true);
      await ApiService.settlePenalty({ penaltyContractId: contractId });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to settle penalty.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Capacity Form */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Cpu className="text-primary" />
            Issue Foundry Capacity
          </h3>
          <form onSubmit={handleIssueAsset} className="space-y-4">
            <div>
              <label className="label">Primary Buyer (Owner)</label>
              <select 
                className="input-field" 
                value={formData.owner}
                onChange={(e) => setFormData({...formData, owner: e.target.value})}
              >
                <option value="AppleInc">Apple Inc.</option>
                <option value="QualcommInc">Qualcomm Inc.</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Technology Node</label>
                <select 
                  className="input-field"
                  value={formData.technologyNode}
                  onChange={(e) => setFormData({...formData, technologyNode: e.target.value})}
                >
                  <option value="N3nm">N3nm</option>
                  <option value="N5nm">N5nm</option>
                  <option value="N7nm">N7nm</option>
                  <option value="N14nm">N14nm</option>
                </select>
              </div>
              <div>
                <label className="label">Wafer Starts / Month</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={formData.waferStartsPerMonth}
                  onChange={(e) => setFormData({...formData, waferStartsPerMonth: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <label className="label">Cost Basis Per Wafer (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input 
                  type="text" 
                  className="input-field pl-8" 
                  value={formData.costBasisPerWafer}
                  onChange={(e) => setFormData({...formData, costBasisPerWafer: e.target.value})}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">This cost basis is private and will be severed upon secondary transfer.</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Issuing...' : 'Issue Capacity Token'}
            </button>
          </form>
        </div>

        {/* Issued Assets Table */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="text-success" />
            Issued Assets Matrix
          </h3>
          {assets.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No capacity assets issued yet.</div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.contractId} className="bg-background border border-gray-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white">{asset.payload.assetId}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Node: <span className="text-primary">{asset.payload.technologyNode}</span> | 
                      Owner: {asset.payload.owner.split('-')[0]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium flex items-center justify-end gap-1">
                      <DollarSign className="w-4 h-4 text-gray-500"/>
                      {parseFloat(asset.payload.costBasisPerWafer).toLocaleString()} / wafer
                    </div>
                    <div className="text-xs text-success bg-success/10 px-2 py-0.5 rounded mt-1 inline-block">
                      {asset.payload.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Penalties */}
      <div className="card border-warning/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileWarning className="text-warning" />
          Pending Penalty Agreements
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          These cancellation agreements are completely private. Only you (Manufacturer) and the specific buyer can see them.
        </p>
        
        {penalties.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No pending penalties.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {penalties.map(p => (
              <div key={p.contractId} className="bg-background p-4 rounded-lg border border-warning/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-warning flex items-center gap-2">
                      <DollarSign className="w-4 h-4"/>
                      {parseFloat(p.payload.penaltyAmount).toLocaleString()} USD
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Party: {p.payload.penalizedParty.split('-')[0]}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSettlePenalty(p.contractId)}
                    disabled={loading}
                    className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Settled
                  </button>
                </div>
                <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
                  Asset: {p.payload.assetId} @ {parseFloat(p.payload.penaltyRate) * 100}% penalty rate
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
