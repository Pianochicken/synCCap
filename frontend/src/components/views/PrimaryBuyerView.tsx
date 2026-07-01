import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { PackageOpen, Send, FileWarning, TrendingUp, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ConfirmModal';

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
  buyer: string;
  technologyNode: string;
  askingPricePerWafer: string;
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
  onRefresh: () => void;
}

export const PrimaryBuyerView: React.FC<PrimaryBuyerViewProps> = ({ 
  assets, 
  transfers = [], 
  rejectedLogs = [],
  withdrawnLogs = [],
  onRefresh 
}) => {
  const [loading, setLoading] = useState(false);
  const [transferForms, setTransferForms] = useState<Record<string, { price: string; buyer: string }>>({});
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedWithdrawRfqId, setSelectedWithdrawRfqId] = useState<string | null>(null);

  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [selectedPenaltyAssetId, setSelectedPenaltyAssetId] = useState<string | null>(null);

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

  const handleInitiatePenalty = (assetContractId: string) => {
    setSelectedPenaltyAssetId(assetContractId);
    setPenaltyModalOpen(true);
  };

  const confirmInitiatePenalty = async () => {
    if (!selectedPenaltyAssetId) return;
    try {
      setLoading(true);
      await ApiService.initiatePenalty({ assetContractId: selectedPenaltyAssetId, penaltyRate: '0.25' });
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
        message="Are you sure you want to cancel this capacity commitment and initiate a penalty agreement?"
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

        {assets.length === 0 ? (
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
            {assets.map((asset) => {
              const form = getForm(asset.contractId);
              return (
                <div
                  key={asset.contractId}
                  className="rounded-xl overflow-hidden"
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
                      <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--primary)' }}>
                        {asset.payload.technologyNode}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        ${parseFloat(asset.payload.costBasisPerWafer).toLocaleString()}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Original Cost Basis
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 space-y-3">
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

                    {/* Cancel/Penalty */}
                    <button
                      onClick={() => handleInitiatePenalty(asset.contractId)}
                      disabled={loading}
                      className="btn-danger w-full text-sm"
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
            {transfers.map((rfq) => (
              <div
                key={rfq.contractId}
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
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {rfq.payload.assetId}
                    </h4>
                    <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: 'var(--primary)' }} title={rfq.payload.buyer}>
                      To: {rfq.payload.buyer.split('::')[0]}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <div>
                      <div className="font-bold text-sm text-yellow-500">
                        Pending Accept
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Asking: ${parseFloat(rfq.payload.askingPricePerWafer).toLocaleString()}
                      </p>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {(rejectedLogs.length > 0 || withdrawnLogs.length > 0) && (
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
              <div key={log.contractId} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-red-400">Rejected by {log.payload.buyer.split('::')[0]}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {log.payload.assetId}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-red-500/70 border border-red-500/20 px-2 py-1 rounded">
                    Asking Price: ${parseFloat(log.payload.askingPricePerWafer).toLocaleString()}
                  </div>
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
            ))}
            {withdrawnLogs.map((log) => (
              <div key={log.contractId} className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-orange-400">Withdrawn by You</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Asset: {log.payload.assetId}</div>
                </div>
                <div className="text-xs text-orange-500/70 border border-orange-500/20 px-2 py-1 rounded">
                  Cancelled Transfer
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
