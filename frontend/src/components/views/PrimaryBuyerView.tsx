import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { PackageOpen, Send, FileWarning, TrendingUp, Lock, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ConfirmModal';

interface AssetPayload {
  assetId: string;
  technologyNode: string;
  waferStartsPerMonth: string;
  costBasisPerWafer: string;
  status?: string;
  owner?: string;
  timestamp?: string;
}

interface Asset {
  contractId: string;
  payload: AssetPayload;
}

interface RFQPayload {
  assetId: string;
  seller: string;
  buyer: string;
  technologyNode: string;
  waferStartsPerMonth: string;
  askingPricePerWafer: string;
  timestamp?: string;
}

interface RFQ {
  contractId: string;
  payload: RFQPayload;
}

interface PrimaryBuyerViewProps {
  assets: Asset[];
  transfers?: RFQ[];
  rejectedLogs?: any[];
  withdrawnLogs?: any[];
  penalties?: any[];
  onRefresh: () => void;
}

export const PrimaryBuyerView: React.FC<PrimaryBuyerViewProps> = ({ 
  assets, 
  transfers = [], 
  rejectedLogs = [],
  withdrawnLogs = [],
  penalties = [],
  onRefresh 
}) => {
  const [loading, setLoading] = useState(false);
  const [transferForms, setTransferForms] = useState<Record<string, { price: string; buyer: string }>>({});
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedWithdrawRfqId, setSelectedWithdrawRfqId] = useState<string | null>(null);

  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [selectedPenaltyAssetId, setSelectedPenaltyAssetId] = useState<string | null>(null);
  const [selectedPenaltyAmount, setSelectedPenaltyAmount] = useState<number>(0);

  const portfolioAssets = assets.filter(a => a.payload.status !== 'Sub-Leased');
  const subLeasedAssets = assets.filter(a => a.payload.status === 'Sub-Leased');

  const handleWithdrawTransfer = (rfqContractId: string) => {
    setSelectedWithdrawRfqId(rfqContractId);
    setWithdrawModalOpen(true);
  };

  const confirmWithdrawTransfer = async () => {
    if (!selectedWithdrawRfqId) return;
    try {
      setLoading(true);
      await ApiService.withdrawTransfer({ rfqContractId: selectedWithdrawRfqId });
      toast.success('Transfer cancelled and capacity reclaimed.');
      setWithdrawModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to withdraw transfer.');
    } finally {
      setLoading(false);
      setSelectedWithdrawRfqId(null);
    }
  };

  const handleAcknowledgeRejection = async (logContractId: string) => {
    try {
      setLoading(true);
      await ApiService.acknowledgeRejection({ logContractId });
      toast.success('Capacity reclaimed successfully.');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reclaim capacity.');
    } finally {
      setLoading(false);
    }
  };

  const getForm = (contractId: string) =>
    transferForms[contractId] ?? { price: '21500.00', buyer: 'QualcommInc' };

  const handleProposeTransfer = async (assetContractId: string) => {
    const form = getForm(assetContractId);
    if (!form.price || !form.buyer) {
      toast.error('Please fill out the transfer details.');
      return;
    }
    try {
      setLoading(true);
      await ApiService.proposeTransfer({
        assetContractId,
        secondaryBuyer: form.buyer,
        askingPricePerWafer: form.price,
      });
      toast.success('Transfer RFQ posted to the Dark Pool!');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to propose transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePenalty = (assetContractId: string, penaltyAmount: number) => {
    setSelectedPenaltyAmount(penaltyAmount);
    setSelectedPenaltyAssetId(assetContractId);
    setPenaltyModalOpen(true);
  };

  const confirmInitiatePenalty = async () => {
    if (!selectedPenaltyAssetId) return;
    try {
      setLoading(true);
      await ApiService.initiatePenalty({ 
        assetContractId: selectedPenaltyAssetId, 
        penaltyRate: '0.25',
        cancellationReason: 'Business strategy pivot requires capacity cancellation.'
      });
      toast.success('Penalty Agreement Initiated (Private)');
      setPenaltyModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to initiate penalty.');
    } finally {
      setLoading(false);
      setSelectedPenaltyAssetId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={withdrawModalOpen}
        title="Cancel Transfer"
        message="Are you sure you want to cancel this transfer and reclaim your capacity asset?"
        confirmText="Confirm Cancel"
        icon="warning"
        isLoading={loading}
        onConfirm={confirmWithdrawTransfer}
        onCancel={() => {
          setWithdrawModalOpen(false);
          setSelectedWithdrawRfqId(null);
        }}
      />
      <ConfirmModal
        isOpen={penaltyModalOpen}
        title="Initiate Penalty"
        message={`Are you sure you want to cancel this capacity commitment? A 25% penalty fee of $${selectedPenaltyAmount.toLocaleString()} will be charged to compensate the foundry. This action cannot be undone.`}
        confirmText="Confirm Penalty"
        icon="alert"
        isLoading={loading}
        onConfirm={confirmInitiatePenalty}
        onCancel={() => {
          setPenaltyModalOpen(false);
          setSelectedPenaltyAssetId(null);
        }}
      />
      <div className="card">
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid #a78bfa' }}
          >
            <PackageOpen className="w-4 h-4" style={{ color: '#a78bfa' }} />
          </div>
          My Capacity Portfolio
        </h3>

        {portfolioAssets.length === 0 ? (
          <div
            className="text-sm text-center py-12 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            No capacity assets in portfolio.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...portfolioAssets]
              .sort((a, b) => {
                if (!a.payload.timestamp) return 1;
                if (!b.payload.timestamp) return -1;
                return new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime();
              })
              .map((asset) => {
              const form = getForm(asset.contractId);
              return (
                <div
                  key={asset.contractId}
                  className="rounded-xl overflow-hidden flex flex-col"
                  style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface-2)' }}
                >
                  {/* Card header */}
                  <div
                    className="px-4 py-3 flex justify-between items-center"
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {asset.payload.assetId}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)]">
                          {asset.payload.timestamp ? new Date(asset.payload.timestamp).toLocaleString() : ''}
                        </span>
                        <span className={`badge ${asset.payload.status === 'Active' ? 'badge-green' : 'badge-amber'}`}>
                          {asset.payload.status || 'Active'}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                          {asset.payload.technologyNode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
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
                          Unit Cost Basis
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          ${parseFloat(asset.payload.costBasisPerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Total Contract Value
                        </span>
                        <span className="font-bold text-sm text-emerald-500">
                          ${(parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth) * 12).toLocaleString()}
                        </span>
                      </div>
                    </div>
                      {asset.payload.status !== 'Pending Transfer' && (
                        <button 
                          onClick={() => {
                            const totalValue = parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth) * 12;
                            const penaltyAmount = totalValue * 0.25;
                            handleInitiatePenalty(asset.contractId, penaltyAmount);
                          }}
                          disabled={loading} 
                          className="btn-danger w-full text-sm mt-1"
                        >
                          <FileWarning className="w-4 h-4" />
                          Cancel Capacity (25% Penalty)
                        </button>
                      )}
                    </div>

                  {/* Actions */}
                  <div className="mt-auto">
                    {asset.payload.status !== 'Pending Transfer' && (
                      <div className="p-4 space-y-3 border-t border-[var(--border-color)]">
                      {/* Dark Pool Transfer Form */}
                      <div
                        className="p-3 rounded-xl space-y-3"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                          Propose Dark Pool Transfer
                        </div>

                        <div className="flex gap-2">
                          <select
                            className="input-field text-sm"
                            value={form.buyer}
                            onChange={(e) =>
                              setTransferForms({ ...transferForms, [asset.contractId]: { ...form, buyer: e.target.value } })
                            }
                          >
                            <option value="QualcommInc">Qualcomm Inc.</option>
                          </select>
                          <input
                            type="text"
                            className="input-field text-sm"
                            placeholder="Asking Price"
                            value={form.price}
                            onChange={(e) =>
                              setTransferForms({ ...transferForms, [asset.contractId]: { ...form, price: e.target.value } })
                            }
                          />
                        </div>

                        <button
                          onClick={() => handleProposeTransfer(asset.contractId)}
                          disabled={loading}
                          className="btn-primary w-full text-sm"
                        >
                          <Send className="w-4 h-4" />
                          Send to Dark Pool
                        </button>

                        <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Lock className="w-3 h-3" />
                          Buyer will{' '}
                          <strong style={{ color: 'var(--text-primary)' }}>NOT</strong>{' '}
                          see your original cost basis.
                        </p>
                      </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid #38bdf8' }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: '#38bdf8' }} />
          </div>
          Active Sub-Leases (Secondary Market)
        </h3>

        {subLeasedAssets.length === 0 ? (
          <div
            className="text-sm text-center py-12 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            No active sub-leases.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...subLeasedAssets]
              .sort((a, b) => {
                if (!a.payload.timestamp) return 1;
                if (!b.payload.timestamp) return -1;
                return new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime();
              })
              .map((asset) => (
              <div
                key={asset.contractId}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface-2)' }}
              >
                <div
                  className="px-4 py-3 flex justify-between items-center"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {asset.payload.assetId}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {asset.payload.timestamp ? new Date(asset.payload.timestamp).toLocaleString() : ''}
                      </span>
                      <span className="badge badge-amber">Sub-Leased</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {asset.payload.technologyNode}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      Sub-Lease Details
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                          Sub-Leased To
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {asset.payload.owner?.split('::')[0]}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Selling Price (Sub-Lease)
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          ${parseFloat(asset.payload.costBasisPerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Monthly Sub-Lease Value
                        </span>
                        <span className="font-medium text-emerald-400">
                          ${(parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Total Contract Value
                        </span>
                        <span className="font-medium text-emerald-400">
                          ${(parseFloat(asset.payload.costBasisPerWafer) * parseInt(asset.payload.waferStartsPerMonth) * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {transfers.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid #eab308' }}
            >
              <Send className="w-4 h-4" style={{ color: '#eab308' }} />
            </div>
            Pending Dark Pool Transfers
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...transfers]
              .sort((a, b) => {
                if (!a.payload.timestamp) return 1;
                if (!b.payload.timestamp) return -1;
                return new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime();
              })
              .map((rfq) => (
              <div
                key={rfq.contractId}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface-2)' }}
              >
                <div
                  className="px-4 py-3 flex justify-between items-start"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {rfq.payload.assetId}
                    </h4>
                    <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: 'var(--primary)' }} title={rfq.payload.buyer}>
                      To: {rfq.payload.buyer.split('::')[0]}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {rfq.payload.timestamp ? new Date(rfq.payload.timestamp).toLocaleString() : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <div>
                      <div className="font-bold text-sm text-yellow-500">
                        Pending Accept
                      </div>
                    </div>
                    <button 
                      onClick={() => handleWithdrawTransfer(rfq.contractId)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Cancel Transfer
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
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
                        Unit Price (Asking)
                      </span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                        ${parseFloat(rfq.payload.askingPricePerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        Monthly Transfer Value
                      </span>
                      <span className="font-bold text-sm text-emerald-500">
                        ${(parseFloat(rfq.payload.askingPricePerWafer) * parseInt(rfq.payload.waferStartsPerMonth)).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        Total Contract Value
                      </span>
                      <span className="font-bold text-sm text-emerald-500">
                        ${(parseFloat(rfq.payload.askingPricePerWafer) * parseInt(rfq.payload.waferStartsPerMonth) * 12).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(rejectedLogs.length > 0 || withdrawnLogs.length > 0 || penalties.length > 0) && (
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
                    <div className="font-semibold text-sm text-red-400">Rejected by {log.payload.buyer.split('::')[0]}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {log.payload.assetId}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {log.payload.timestamp ? new Date(log.payload.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!log.payload.isReclaimed ? (
                      <button
                        onClick={() => handleAcknowledgeRejection(log.contractId)}
                        disabled={loading}
                        className="text-xs px-3 py-1.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        Reclaim Asset
                      </button>
                    ) : (
                      <span className="text-xs text-green-500/80 italic">Reclaimed</span>
                    )}
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
            {withdrawnLogs.map((log) => (
              <div key={log.contractId} className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-orange-400">Withdrawn by You</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {log.payload.assetId}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {log.payload.timestamp ? new Date(log.payload.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-xs text-orange-500/70 border border-orange-500/20 px-2 py-1 rounded">
                    Cancelled Transfer
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-orange-500/10">
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-orange-500/70">Monthly Wafers</span>
                    <span className="font-medium text-sm text-orange-400">{parseInt(log.payload.waferStartsPerMonth).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-orange-500/70">Unit Price (Asking)</span>
                    <span className="font-medium text-sm text-orange-400">${parseFloat(log.payload.askingPricePerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-orange-500/70">Monthly Transfer Value</span>
                    <span className="font-bold text-sm text-orange-400">${(parseFloat(log.payload.askingPricePerWafer) * parseInt(log.payload.waferStartsPerMonth)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5 text-orange-500/70">Total Contract Value</span>
                    <span className="font-bold text-sm text-orange-400">${(parseFloat(log.payload.askingPricePerWafer) * parseInt(log.payload.waferStartsPerMonth) * 12).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {penalties.map((p) => (
              <div key={p.contractId} className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-orange-400">Cancelled by You (Penalty Initiated)</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {p.payload.assetId}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {p.payload.timestamp ? new Date(p.payload.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      Pending Settlement
                    </span>
                  </div>
                </div>
                
                {/* 2x2 Grid Information */}
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Monthly Wafers
                    </span>
                    <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {parseInt(p.payload.waferStartsPerMonth).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Unit Cost Basis
                    </span>
                    <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ${parseFloat(p.payload.costBasisPerWafer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Penalty Amount
                    </span>
                    <span className="font-bold text-xs text-orange-500">
                      ${parseFloat(p.payload.penaltyAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Penalty Rate
                    </span>
                    <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {parseFloat(p.payload.penaltyRate) * 100}%
                    </span>
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
