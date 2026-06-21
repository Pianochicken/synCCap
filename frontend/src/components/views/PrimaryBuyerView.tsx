import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { PackageOpen, Send, FileWarning, TrendingUp } from 'lucide-react';

interface PrimaryBuyerViewProps {
  assets: any[];
  onRefresh: () => void;
}

export const PrimaryBuyerView: React.FC<PrimaryBuyerViewProps> = ({ assets, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [transferForms, setTransferForms] = useState<Record<string, { price: string, buyer: string }>>({});

  const handleProposeTransfer = async (assetContractId: string) => {
    const form = transferForms[assetContractId];
    if (!form || !form.price || !form.buyer) {
      alert('Please fill out the transfer details.');
      return;
    }

    try {
      setLoading(true);
      await ApiService.proposeTransfer({
        assetContractId,
        secondaryBuyer: form.buyer,
        askingPriceTotal: form.price,
      });
      alert('Transfer RFQ posted to the Dark Pool!');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to propose transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePenalty = async (assetContractId: string) => {
    if (!confirm('Are you sure you want to cancel this capacity and initiate a penalty agreement?')) return;
    
    try {
      setLoading(true);
      await ApiService.initiatePenalty({
        assetContractId,
        penaltyRate: '0.25', // Hardcoded 25% for demo
      });
      alert('Penalty Agreement Initiated (Private)');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to initiate penalty.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <PackageOpen className="text-primary" />
          My Capacity Portfolio
        </h3>
        
        {assets.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No capacity assets in portfolio.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assets.map((asset) => {
              const form = transferForms[asset.contractId] || { price: '21500.00', buyer: 'QualcommInc' };
              
              return (
                <div key={asset.contractId} className="bg-background rounded-xl overflow-hidden border border-gray-800">
                  {/* Header */}
                  <div className="bg-surface-hover p-4 border-b border-gray-800 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{asset.payload.assetId}</h4>
                      <p className="text-sm text-primary">{asset.payload.technologyNode}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">${parseFloat(asset.payload.costBasisPerWafer).toLocaleString()}</div>
                      <p className="text-xs text-gray-500">Original Cost Basis</p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="p-4 space-y-4">
                    {/* Dark Pool Transfer Form */}
                    <div className="bg-surface border border-gray-800 p-3 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Propose Dark Pool Transfer
                      </div>
                      
                      <div className="flex gap-2">
                        <select 
                          className="input-field text-sm"
                          value={form.buyer}
                          onChange={(e) => setTransferForms({
                            ...transferForms,
                            [asset.contractId]: { ...form, buyer: e.target.value }
                          })}
                        >
                          <option value="QualcommInc">Qualcomm Inc.</option>
                        </select>
                        <input 
                          type="text" 
                          className="input-field text-sm" 
                          placeholder="Asking Price"
                          value={form.price}
                          onChange={(e) => setTransferForms({
                            ...transferForms,
                            [asset.contractId]: { ...form, price: e.target.value }
                          })}
                        />
                      </div>
                      
                      <button 
                        onClick={() => handleProposeTransfer(asset.contractId)}
                        disabled={loading}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send RFQ
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        The buyer will <span className="text-white font-medium">NOT</span> see your original cost basis.
                      </p>
                    </div>

                    {/* Penalty Action */}
                    <button 
                      onClick={() => handleInitiatePenalty(asset.contractId)}
                      disabled={loading}
                      className="btn-danger w-full text-sm flex items-center justify-center gap-2"
                    >
                      <FileWarning className="w-4 h-4" />
                      Cancel Capacity (25% Penalty)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
