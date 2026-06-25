import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { Briefcase, CheckCircle, ShieldAlert, EyeOff } from 'lucide-react';

interface AssetPayload {
  assetId: string;
  technologyNode: string;
  costBasisPerWafer: string;
}

interface Asset {
  contractId: string;
  payload: AssetPayload;
}

interface RFQPayload {
  assetId: string;
  seller: string;
  technologyNode: string;
  waferStartsPerMonth: number;
  askingPricePerWafer?: string;
  askingPriceTotal?: string;
}

interface RFQ {
  contractId: string;
  payload: RFQPayload;
}

interface SecondaryBuyerViewProps {
  assets: Asset[];
  transfers: RFQ[];
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

  const getAskingPrice = (rfq: RFQ) => {
    const raw = rfq.payload.askingPricePerWafer ?? rfq.payload.askingPriceTotal ?? '0';
    return parseFloat(raw).toLocaleString();
  };

  return (
    <div className="space-y-6">

      {/* Dark Pool RFQs */}
      <div className="card" style={{ borderColor: 'rgba(79,141,255,0.3)' }}>
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}
          >
            <Briefcase className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </div>
          Dark Pool: Incoming RFQs
        </h3>

        {transfers.length === 0 ? (
          <div
            className="text-sm text-center py-12 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            No capacity transfer offers available.
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((rfq) => (
              <div
                key={rfq.contractId}
                className="p-5 rounded-xl relative overflow-hidden"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid rgba(79,141,255,0.4)',
                }}
              >
                {/* Privacy badge */}
                <div
                  className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1"
                  style={{
                    background: 'var(--primary-glow)',
                    color: 'var(--primary)',
                    borderLeft: '1px solid rgba(79,141,255,0.3)',
                    borderBottom: '1px solid rgba(79,141,255,0.3)',
                  }}
                >
                  <ShieldAlert className="w-3 h-3" />
                  Privacy Active
                </div>

                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-2">
                  {/* Asset info */}
                  <div>
                    <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      {rfq.payload.assetId}
                    </h4>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Seller
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {rfq.payload.seller.split('::')[0]}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Node
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                          {rfq.payload.technologyNode}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Wafer Starts
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {rfq.payload.waferStartsPerMonth.toLocaleString()}/mo
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Seller's Cost Basis
                        </span>
                        <span className="font-semibold inline-flex items-center gap-1" style={{ color: '#f04d4d' }}>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hidden by Canton
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & action */}
                  <div
                    className="p-4 rounded-xl min-w-[190px] text-center"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                      Asking Price / Wafer
                    </span>
                    <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                      ${getAskingPrice(rfq)}
                    </span>
                    <button
                      onClick={() => handleAcceptTransfer(rfq.contractId)}
                      disabled={loading}
                      className="btn-primary w-full mt-3 text-sm"
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
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,217,126,0.12)', border: '1px solid #10d97e' }}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          Acquired Capacity
        </h3>

        {assets.length === 0 ? (
          <div
            className="text-sm text-center py-10 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            No capacity acquired yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.contractId}
                className="p-4 rounded-xl"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {asset.payload.assetId}
                    </h4>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--primary)' }}>
                      {asset.payload.technologyNode}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      ${parseFloat(asset.payload.costBasisPerWafer).toLocaleString()}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Your Cost Basis
                    </div>
                  </div>
                </div>
                <div className="badge-green text-xs">
                  ✓ Privacy Preserved — Seller's original cost basis wiped
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
