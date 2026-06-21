import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { Briefcase, CheckCircle, ShieldAlert } from 'lucide-react';

interface SecondaryBuyerViewProps {
  assets: any[];
  transfers: any[];
  onRefresh: () => void;
}

export const SecondaryBuyerView: React.FC<SecondaryBuyerViewProps> = ({ assets, transfers, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleAcceptTransfer = async (rfqContractId: string) => {
    try {
      setLoading(true);
      await ApiService.acceptTransfer({ rfqContractId });
      alert('Atomic Settlement Complete! You now own the Capacity Asset.');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to accept transfer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dark Pool RFQs */}
      <div className="card border-primary/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Briefcase className="text-primary" />
          Dark Pool: Incoming RFQs
        </h3>
        
        {transfers.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No capacity transfer offers available.</div>
        ) : (
          <div className="space-y-4">
            {transfers.map((rfq) => (
              <div key={rfq.contractId} className="bg-background border border-primary/50 p-5 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Privacy Active
                </div>
                
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-2">
                  <div>
                    <h4 className="text-lg font-bold text-white">{rfq.payload.assetId}</h4>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500 block">Seller</span>
                        <span className="text-gray-300">{rfq.payload.seller.split('-')[0]}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Node</span>
                        <span className="text-primary font-medium">{rfq.payload.technologyNode}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Wafer Starts</span>
                        <span className="text-gray-300">{rfq.payload.waferStartsPerMonth.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-surface-hover p-4 rounded-lg min-w-[200px] border border-gray-800">
                    <div className="text-center mb-3">
                      <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">Asking Price</span>
                      <span className="text-2xl font-bold text-white">${parseFloat(rfq.payload.askingPriceTotal).toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={() => handleAcceptTransfer(rfq.contractId)}
                      disabled={loading}
                      className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept & Settle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owned Assets */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Acquired Capacity</h3>
        {assets.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No capacity acquired yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <div key={asset.contractId} className="bg-background border border-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white">{asset.payload.assetId}</h4>
                    <p className="text-sm text-primary">{asset.payload.technologyNode}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">${parseFloat(asset.payload.costBasisPerWafer).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">New Cost Basis</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-success bg-success/10 px-2 py-1 rounded inline-block">
                  Privacy Preserved: Previous cost basis wiped
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
