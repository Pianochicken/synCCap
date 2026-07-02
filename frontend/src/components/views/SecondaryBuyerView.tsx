import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { Briefcase, CheckCircle, ShieldAlert, EyeOff, FileWarning } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ConfirmModal';

interface AssetPayload {
  assetId: string;
  technologyNode: string;
  waferStartsPerMonth: string;
  costBasisPerWafer: string;
  timestamp?: string;
}

interface Asset {
  contractId: string;
  payload: AssetPayload;
}

interface RFQPayload {
  assetId: string;
  seller: string;
  technologyNode: string;
  waferStartsPerMonth: string;
  askingPricePerWafer?: string;
  askingPriceTotal?: string;
  timestamp?: string;
}

interface RFQ {
  contractId: string;
  payload: RFQPayload;
}

interface SecondaryBuyerViewProps {
  assets: Asset[];
  transfers: RFQ[];
  rejectedLogs?: any[];
  onRefresh: () => void;
}

export const SecondaryBuyerView: React.FC<SecondaryBuyerViewProps> = ({ assets, transfers, rejectedLogs = [], onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  const handleAcceptTransfer = async (rfqContractId: string, agreedPricePerWafer: string) => {
    try {
      setLoading(true);
      await ApiService.acceptTransfer({ rfqContractId, agreedPricePerWafer });
      toast.success('Atomic Settlement Complete! You now own the Capacity Asset.');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTransfer = (rfqContractId: string) => {
    setSelectedRfqId(rfqContractId);
    setRejectModalOpen(true);
  };

  const confirmRejectTransfer = async () => {
    if (!selectedRfqId) return;
    try {
      setLoading(true);
      await ApiService.rejectTransfer({ rfqContractId: selectedRfqId });
      toast.success('Transfer rejected.');
      setRejectModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject transfer.');
    } finally {
      setLoading(false);
      setSelectedRfqId(null);
    }
  };

  const getAskingPrice = (rfq: RFQ) => {
    const raw = rfq.payload.askingPricePerWafer ?? rfq.payload.askingPriceTotal ?? '0';
    return parseFloat(raw).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      
      <ConfirmModal
        isOpen={rejectModalOpen}
        title="Reject Transfer"
        message="Are you sure you want to reject this capacity transfer offer? This action cannot be undone."
        confirmText="Yes, Reject"
        icon="alert"
        isLoading={loading}
        onConfirm={confirmRejectTransfer}
        onCancel={() => {
          setRejectModalOpen(false);
          setSelectedRfqId(null);
        }}
      />

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
            {[...transfers]
              .sort((a, b) => {
                if (!a.payload.timestamp) return 1;
                if (!b.payload.timestamp) return -1;
                return new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime();
              })
              .map((rfq) => (
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
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {rfq.payload.assetId}
                      </h4>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {rfq.payload.timestamp ? new Date(rfq.payload.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
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
                          Monthly Wafers
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {parseInt(rfq.payload.waferStartsPerMonth).toLocaleString()}
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
                    <div className="mt-2 mb-1 p-2 bg-[var(--bg-page)] rounded border border-[var(--border-color)] space-y-2">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Monthly Transfer Value</span>
                        <span className="text-sm font-bold text-emerald-500">
                          ${(parseFloat(rfq.payload.askingPricePerWafer ?? rfq.payload.askingPriceTotal ?? '0') * parseInt(rfq.payload.waferStartsPerMonth)).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Contract Value</span>
                        <span className="text-sm font-bold text-emerald-500">
                          ${(parseFloat(rfq.payload.askingPricePerWafer ?? rfq.payload.askingPriceTotal ?? '0') * parseInt(rfq.payload.waferStartsPerMonth) * 12).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const raw = rfq.payload.askingPricePerWafer ?? rfq.payload.askingPriceTotal ?? '0';
                        handleAcceptTransfer(rfq.contractId, raw);
                      }}
                      disabled={loading}
                      className="btn-primary w-full mt-3 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept & Settle
                    </button>
                    <button
                      onClick={() => handleRejectTransfer(rfq.contractId)}
                      disabled={loading}
                      className="w-full mt-2 text-sm text-red-500 hover:text-red-400 py-1.5 transition-colors"
                    >
                      Reject Offer
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
            {[...assets]
              .sort((a, b) => {
                if (!a.payload.timestamp) return 1;
                if (!b.payload.timestamp) return -1;
                return new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime();
              })
              .map((asset) => (
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {asset.payload.timestamp ? new Date(asset.payload.timestamp).toLocaleString() : ''}
                      </span>
                      <span className="badge badge-green">Active</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {asset.payload.technologyNode}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      ${parseFloat(asset.payload.costBasisPerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Your Cost Basis
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)] mb-3">
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Monthly Wafers
                    </span>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {parseInt(asset.payload.waferStartsPerMonth).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Monthly Value
                    </span>
                    <span className="font-bold text-sm text-emerald-500">
                      ${(parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)] mb-3">
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Total Contract Value
                    </span>
                    <span className="font-bold text-sm text-emerald-500">
                      ${(parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth) * 12).toLocaleString()}
                    </span>
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

      {rejectedLogs.length > 0 && (
        <div className="card mt-6 border border-red-500/20">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20"
            >
              <FileWarning className="w-4 h-4 text-red-500" />
            </div>
            Transfer History Logs (Private)
          </h3>
          <div className="space-y-3">
            {rejectedLogs.map((log) => (
              <div key={log.contractId} className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-red-400">Rejected by You</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {log.payload.assetId}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Seller: {log.payload.seller.split('::')[0]}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {log.payload.timestamp ? new Date(log.payload.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-xs text-red-500/70 border border-red-500/20 px-2 py-1 rounded">
                    Rejected Offer
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-red-500/10">
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-red-500/70">Monthly Wafers</span>
                    <span className="font-medium text-sm text-red-400">{parseInt(log.payload.waferStartsPerMonth).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-red-500/70">Unit Price (Asking)</span>
                    <span className="font-medium text-sm text-red-400">${parseFloat(log.payload.askingPricePerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-red-500/70">Monthly Transfer Value</span>
                    <span className="font-bold text-sm text-red-400">${(parseFloat(log.payload.askingPricePerWafer) * parseInt(log.payload.waferStartsPerMonth)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-red-500/70">Total Contract Value</span>
                    <span className="font-bold text-sm text-red-400">${(parseFloat(log.payload.askingPricePerWafer) * parseInt(log.payload.waferStartsPerMonth) * 12).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
