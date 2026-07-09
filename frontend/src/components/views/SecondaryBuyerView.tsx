import React, { useState } from 'react';
import { Briefcase, CheckCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ConfirmModal';
import { ApiService } from '../../api/client';
import { useBackendQuery } from '../../hooks/useBackendQuery';
import { PartyLabel } from '../PartyLabel';

const fmt2 = (v: string | number) =>
  parseFloat(String(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ──────────────────────────────────────────────────────────────

export const SecondaryBuyerView: React.FC = () => {
  const { assets, financials, transfers, locks, loadingAssets, loadingFinancials, loadingTransfers } = useBackendQuery();

  const [loading, setLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  const handleAcceptTransfer = async (rfqContractId: string, agreedPricePerWafer: string) => {
    try {
      setLoading(true);
      const rfq = transfers.find((t) => t.contractId === rfqContractId);
      if (!rfq) throw new Error('RFQ not found');
      const lock = locks.find((l) => l.payload.assetId === rfq.payload.assetId);
      if (!lock) throw new Error('Lock not found');

      await ApiService.acceptTransfer({ rfqContractId, agreedPricePerWafer });
      toast.success('Atomic Settlement Complete! You now own the Capacity Asset.');
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject transfer.');
    } finally {
      setLoading(false);
      setSelectedRfqId(null);
    }
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

      {/* ── Dark Pool RFQs ── */}
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

        {loadingTransfers ? (
          <div className="text-center text-sm py-4 text-gray-500">Loading RFQs...</div>
        ) : transfers.length === 0 ? (
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
          <div className="space-y-4 max-h-[600px] overflow-auto pr-2 custom-scrollbar">
            {[...transfers].reverse().map((rfq) => {
              const askPrice = parseFloat(rfq.payload.askingPricePerWafer ?? '0');
              const wafers = parseInt(rfq.payload.waferStartsPerMonth ?? '0');
              const monthlyValue = askPrice * wafers;
              const totalValue = monthlyValue * 12;
              const ts = rfq.payload.timestamp
                ? new Date(rfq.payload.timestamp).toLocaleString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })
                : '—';

              return (
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

                  {/* Top row */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mt-2">
                    {/* Left: Asset info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                          {rfq.payload.assetId}
                        </h4>
                        <span className="status-badge status-pending">Pending</span>
                      </div>
                      <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                        Received: {ts}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <div>
                          <span className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Seller
                          </span>
                          <PartyLabel partyId={rfq.payload.seller} />
                        </div>
                        <div>
                          <span className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Category
                          </span>
                          <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                            {rfq.payload.technologyNode}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Monthly Wafers
                          </span>
                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {wafers.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Seller's Unit Price
                          </span>
                          {/* Dark Pool privacy: seller's cost basis is intentionally hidden from buyer */}
                          <span
                            className="font-semibold inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <ShieldAlert className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                            Hidden (Dark Pool)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Price + actions */}
                    <div className="flex flex-col items-end gap-3 min-w-[220px]">
                      <div className="text-right">
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Asking Price (Per Wafer)
                        </span>
                        <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          ${fmt2(askPrice)}
                        </span>
                      </div>

                      {/* Financial summary */}
                      <div
                        className="w-full text-xs rounded-lg px-3 py-2 space-y-0.5"
                        style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                      >
                        <div className="flex justify-between">
                          <span>Monthly Value</span>
                          <span className="font-semibold text-blue-400">
                            ${monthlyValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-0.5" style={{ borderColor: 'var(--border-color)' }}>
                          <span>Total Contract Value</span>
                          <span className="font-bold text-emerald-400">
                            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full mt-1">
                        <button
                          onClick={() => handleRejectTransfer(rfq.contractId)}
                          disabled={loading}
                          className="btn-secondary flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptTransfer(rfq.contractId, rfq.payload.askingPricePerWafer ?? '0')}
                          disabled={loading}
                          className="btn-primary flex-1"
                        >
                          Accept & Settle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Acquired Assets ── */}
      <div className="card">
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,217,126,0.12)', border: '1px solid #10d97e' }}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          Acquired Capacity Assets
        </h3>

        {loadingAssets || loadingFinancials ? (
          <div className="text-center text-sm py-4 text-gray-500">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div
            className="text-sm text-center py-12 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-color)',
            }}
          >
            You have not acquired any capacity assets yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...assets].reverse().map((asset) => {
              const fin = financials.find((f) => f.payload.assetId === asset.payload.assetId);
              const acquisitionPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
              const wafers = parseInt(asset.payload.waferStartsPerMonth) || 0;
              const monthlyValue = acquisitionPrice * wafers;
              const totalValue = monthlyValue * 12;
              const ts = asset.payload.timestamp
                ? new Date(asset.payload.timestamp).toLocaleString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })
                : '—';

              return (
                <div key={asset.contractId} className="list-item-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {asset.payload.assetId}
                    </div>
                    <span className="status-badge status-active">Active</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Acquired: {ts}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Category</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{asset.payload.technologyNode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Wafers</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{wafers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Unit Price / Wafer</span>
                      <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>${fmt2(acquisitionPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Value</span>
                      <span className="font-mono font-semibold text-blue-500">${monthlyValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Contract Value</span>
                      <span className="font-bold text-emerald-500">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
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
