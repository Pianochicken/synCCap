import React, { useState } from 'react';
import { PackageOpen, Send, FileWarning, TrendingUp, Lock, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ConfirmModal';
import { ApiService } from '../../api/client';
import { useBackendQuery } from '../../hooks/useBackendQuery';
import { TransactionToast } from '../TransactionToast';
import { ContractIdDisplay } from '../ContractIdDisplay';
import { PartyLabel } from '../PartyLabel';


const fmt2 = (v: string | number) =>
  parseFloat(String(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Active: 'status-active',
    PendingTransfer: 'status-pending',
    Transferred: 'status-transferred',
    Penalized: 'status-penalized',
  };
  const label: Record<string, string> = {
    Active: 'Active',
    PendingTransfer: 'Awaiting Response',
    Transferred: 'Transferred',
    Penalized: 'Penalised',
  };
  return (
    <span className={`status-badge ${map[status] ?? 'status-inactive'}`}>
      {label[status] ?? status}
    </span>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PrimaryBuyerView: React.FC<{ partyId: string }> = ({ partyId: primaryPartyId }) => {
  const fingerprint = primaryPartyId?.split('::')[1] || '';

  const {
    assets, financials, transfers, rejectedLogs, withdrawnLogs, penalties,
    loadingAssets, loadingFinancials, loadingTransfers, loadingRejected, loadingWithdrawn, loadingPenalties,
  } = useBackendQuery();

  const [loading, setLoading] = useState(false);
  const [transferForms, setTransferForms] = useState<Record<string, { price: string; buyer: string }>>({});

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedWithdrawRfqId, setSelectedWithdrawRfqId] = useState<string | null>(null);

  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [selectedPenaltyAssetId, setSelectedPenaltyAssetId] = useState<string | null>(null);
  const [selectedPenaltyAmount, setSelectedPenaltyAmount] = useState<number>(0);

  const portfolioAssets = assets.filter(
    (a) => a.payload.status !== 'Transferred' && a.payload.status !== 'Sub-Leased' && a.payload.status !== 'Penalized' && a.payload.status !== 'PendingTransfer',
  ).reverse();
  const subLeasedAssets = assets.filter((a) => a.payload.status === 'Transferred' || a.payload.status === 'Sub-Leased').reverse();
  const sortedRejectedLogs = [...rejectedLogs].reverse();
  const sortedWithdrawnLogs = [...withdrawnLogs].reverse();
  const sortedPenalties = [...penalties].reverse();

  const [activeHistoryTab, setActiveHistoryTab] = useState<'sold' | 'rejected' | 'withdrawn' | 'penalized'>('sold');

  const handleWithdrawTransfer = (rfqContractId: string) => {
    setSelectedWithdrawRfqId(rfqContractId);
    setWithdrawModalOpen(true);
  };

  const confirmWithdrawTransfer = async () => {
    if (!selectedWithdrawRfqId) return;
    try {
      setLoading(true);
      const res = await ApiService.withdrawTransfer({ rfqContractId: selectedWithdrawRfqId });
      toast.success(
        (t) => <TransactionToast message="Transfer cancelled and capacity reclaimed." updateId={res.data?.updateId} toastId={t.id} />,
        { duration: 600000 }
      );
      setWithdrawModalOpen(false);
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
      const res = await ApiService.acknowledgeRejection({ logContractId });
      toast.success(
        (t) => <TransactionToast message="Capacity reclaimed successfully." updateId={res.data?.updateId} toastId={t.id} />,
        { duration: 600000 }
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to reclaim capacity.');
    } finally {
      setLoading(false);
    }
  };

  const getForm = (contractId: string) =>
    transferForms[contractId] ?? { price: '21500.00', buyer: 'synccap-secondary-buyer-1' };

  const handleProposeTransfer = async (assetContractId: string) => {
    const form = getForm(assetContractId);
    if (!form.price || !form.buyer) {
      toast.error('Please fill out the transfer details.');
      return;
    }
    try {
      setLoading(true);
      const secondaryBuyerId = form.buyer.includes('::')
        ? form.buyer
        : `${form.buyer}::${fingerprint}`;

      const res = await ApiService.proposeTransfer({
        assetContractId,
        secondaryBuyer: secondaryBuyerId,
        askingPricePerWafer: form.price,
      });
      toast.success(
        (t) => <TransactionToast message="Transfer RFQ posted to the Dark Pool!" updateId={res.data?.updateId} toastId={t.id} />,
        { duration: 600000 }
      );
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
      const res = await ApiService.initiatePenalty({
        assetContractId: selectedPenaltyAssetId,
        penaltyRate: '0.25',
        cancellationReason: 'Business strategy pivot requires capacity cancellation.',
      });
      toast.success(
        (t) => <TransactionToast message="Penalty Agreement Initiated (Private)" updateId={res.data?.updateId} toastId={t.id} />,
        { duration: 600000 }
      );
      setPenaltyModalOpen(false);
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
        message={`Are you sure you want to cancel this capacity commitment? A 25% penalty fee of $${selectedPenaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be charged to compensate the foundry. This action cannot be undone.`}
        confirmText="Confirm Penalty"
        icon="alert"
        isLoading={loading}
        onConfirm={confirmInitiatePenalty}
        onCancel={() => {
          setPenaltyModalOpen(false);
          setSelectedPenaltyAssetId(null);
        }}
      />

      {/* ── My Capacity Portfolio ── */}
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

        {loadingAssets || loadingFinancials ? (
          <div className="text-center text-sm py-4 text-gray-500">Loading assets...</div>
        ) : portfolioAssets.length === 0 ? (
          <div
            className="text-sm text-center py-12 rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-color)',
            }}
          >
            You don't own any active capacity assets.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-auto pr-2 custom-scrollbar">
            {portfolioAssets.map((asset) => {
              const fin = financials.find((f) => f.payload.assetId === asset.payload.assetId);
              const unitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
              const wafers = Number(asset.payload.waferStartsPerMonth) || 0;
              const monthlyValue = wafers * unitPrice;
              const totalValue = monthlyValue * 12;
              const estimatedPenalty = totalValue * 0.25;
              const form = getForm(asset.contractId);

              const ts = asset.payload.timestamp
                  ? new Date(asset.payload.timestamp).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })
                : '—';

              return (
                <div key={asset.contractId} className="list-item-card flex flex-col md:flex-row gap-6 items-start">
                  {/* Asset Details */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {asset.payload.assetId}
                      </div>
                      {statusBadge(asset.payload.status)}
                    </div>
                    <ContractIdDisplay contractId={asset.contractId} />

                    <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      Manufacturer:&nbsp;
                      <PartyLabel partyId={asset.payload.manufacturer} />
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Issued: {ts}
                    </div>

                    <div className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Category: <span className="font-medium text-purple-400">{asset.payload.technologyNode}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-4 pt-4 border-t border-[var(--border-color)]">
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                        <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {wafers.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)] relative overflow-hidden group">
                        <div className="absolute top-1.5 right-1.5 text-purple-500/30 group-hover:text-purple-500/70 transition-colors">
                          <Lock className="w-3 h-3" />
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>Original Unit Price</div>
                        <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          ${fmt2(unitPrice)}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Monthly Value</div>
                        <div className="font-mono font-medium mt-0.5 text-blue-500">
                          ${monthlyValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Total Contract Value</div>
                        <div className="font-mono font-bold mt-0.5 text-emerald-500">
                          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Panel */}
                  <div className="flex-1 w-full bg-[var(--bg-page)] p-4 rounded-xl border border-[var(--border-color)]">
                    <h4 className="text-sm font-semibold mb-3 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                      <span className="flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-blue-500" />
                        Transfer Capacity (Dark Pool)
                      </span>
                    </h4>

                    {asset.payload.status === 'PendingTransfer' ? (
                      /* ── Already proposed: show locked state ── */
                      <div
                        className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl text-center"
                        style={{ background: 'var(--bg-surface-2)', border: '1px dashed var(--border-color)' }}
                      >
                        <span className="status-badge status-pending text-sm px-3 py-1">
                          Awaiting Response
                        </span>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          An offer is already pending for this asset.<br />
                          Withdraw it below before proposing a new one.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                              Asking Price ($ / wafer)
                            </label>
                            <input
                              type="text"
                              className="input-field py-1.5 text-sm"
                              value={form.price}
                              onChange={(e) =>
                                setTransferForms({
                                  ...transferForms,
                                  [asset.contractId]: { ...form, price: e.target.value.replace(/[^0-9.]/g, '') },
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                              Target Buyer
                            </label>
                            <select
                              className="input-field py-1.5 text-sm"
                              value={form.buyer}
                              onChange={(e) =>
                                setTransferForms({
                                  ...transferForms,
                                  [asset.contractId]: { ...form, buyer: e.target.value },
                                })
                              }
                            >
                              <option value="synccap-secondary-buyer-1">Secondary Buyer</option>
                            </select>
                          </div>
                        </div>

                        {/* Price summary */}
                        {form.price && (
                          <div
                            className="text-xs rounded-lg px-3 py-2 space-y-0.5"
                            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                          >
                            <div className="flex justify-between">
                              <span>Monthly Value at Ask</span>
                              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                ${(wafers * parseFloat(form.price || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-0.5" style={{ borderColor: 'var(--border-color)' }}>
                              <span>Total Contract Value at Ask</span>
                              <span className="font-bold text-blue-400">
                                ${(wafers * parseFloat(form.price || '0') * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleProposeTransfer(asset.contractId)}
                            disabled={loading}
                            className="btn-primary w-full py-2 text-sm"
                            style={{ background: '#2563eb' }}
                          >
                            {loading ? 'Proposing...' : 'Propose Transfer'}
                          </button>
                          <button
                            onClick={() => handleInitiatePenalty(asset.contractId, estimatedPenalty)}
                            disabled={loading}
                            className="btn-secondary whitespace-nowrap text-red-500 hover:text-red-600 hover:border-red-200 border-gray-200 dark:border-gray-700 dark:hover:border-red-900/50"
                            title={`Cancel Commitment — Est. penalty: $${fmt2(estimatedPenalty)}`}
                          >
                            <FileWarning className="w-4 h-4" />
                          </button>
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

      {/* ── Transfers + History ── */}
      <div className="space-y-6">

        {/* Active Transfers */}
        <div className="card">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Active Transfers
          </h3>

          {loadingTransfers ? (
            <div className="text-center text-sm py-4 text-gray-500">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No active transfer RFQs.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {[...transfers].reverse().map((rfq) => {
                const askPrice = parseFloat(rfq.payload.askingPricePerWafer ?? '0');
                const wafers = parseInt(rfq.payload.waferStartsPerMonth ?? '0');
                const fin = financials.find((f) => f.payload.assetId === rfq.payload.assetId);
                const originalUnitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                
                const origMonthlyValue = wafers * originalUnitPrice;
                const transMonthlyValue = wafers * askPrice;
                const origTotalValue = origMonthlyValue * 12;
                const transTotalValue = transMonthlyValue * 12;

                const ts = rfq.payload.timestamp
                  ? new Date(rfq.payload.timestamp).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric', 
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })
                  : '—';

                return (
                  <div key={rfq.contractId} className="list-item-card border-l-4 border-l-blue-500 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-1 relative z-10">
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {rfq.payload.assetId}
                        </div>
                        <ContractIdDisplay contractId={rfq.contractId} />

                        <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          Proposed to:&nbsp;<PartyLabel partyId={rfq.payload.buyer} />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Submitted: {ts}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Category: <span className="font-medium text-purple-400">{rfq.payload.technologyNode}</span>
                        </div>
                      </div>
                      <span className="status-badge status-pending">
                        Awaiting Response
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-[var(--border-color)] relative z-10">
                      {/* Wafers */}
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                        <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {wafers.toLocaleString()}
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div>
                        <div style={{ color: 'var(--text-muted)' }} className="mb-1">Unit Price / Wafer</div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                            <span className="text-[0.65rem] text-gray-500">Original</span>
                            <span className="font-mono text-gray-500">${fmt2(originalUnitPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                            <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(askPrice)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Value */}
                      <div>
                        <div style={{ color: 'var(--text-muted)' }} className="mb-1">Monthly Value</div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                            <span className="text-[0.65rem] text-gray-500">Original</span>
                            <span className="font-mono text-gray-500">${fmt2(origMonthlyValue)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                            <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transMonthlyValue)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Value */}
                      <div>
                        <div style={{ color: 'var(--text-muted)' }} className="mb-1">Total Contract Value</div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                            <span className="text-[0.65rem] text-gray-500">Original</span>
                            <span className="font-mono text-gray-500">${fmt2(origTotalValue)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800/30">
                            <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">Asking</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${fmt2(transTotalValue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-3 relative z-10">
                      <button
                        onClick={() => handleWithdrawTransfer(rfq.contractId)}
                        disabled={loading}
                        className="btn-secondary text-xs px-3 py-1.5 text-gray-600 hover:text-red-600 hover:border-red-200 dark:text-gray-400 dark:hover:text-red-400 dark:hover:border-red-900/50"
                      >
                        Withdraw RFQ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transfer History */}
        <div className="card">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            Transfer History
          </h3>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
            <button
              onClick={() => setActiveHistoryTab('sold')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeHistoryTab === 'sold'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Sold ({subLeasedAssets.length})
            </button>
            <button
              onClick={() => setActiveHistoryTab('rejected')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeHistoryTab === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Rejected ({sortedRejectedLogs.length})
            </button>
            <button
              onClick={() => setActiveHistoryTab('withdrawn')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeHistoryTab === 'withdrawn'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Withdrawn ({sortedWithdrawnLogs.length})
            </button>
            <button
              onClick={() => setActiveHistoryTab('penalized')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeHistoryTab === 'penalized'
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Penalised ({sortedPenalties.length})
            </button>
          </div>

          <div className="space-y-4">
            {/* Sub-Leased */}
            {activeHistoryTab === 'sold' && (
            <div>
              {loadingAssets ? (
                <div className="text-center text-sm py-2 text-gray-500">Loading...</div>
              ) : subLeasedAssets.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">No assets sold yet.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {subLeasedAssets.map((asset) => {
                    const fin = financials.find((f) => f.payload.assetId === asset.payload.assetId);
                    const originalUnitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                    const transferUnitPrice = parseFloat(asset.payload.costBasisPerWafer ?? '0');
                    const wafers = parseInt(asset.payload.waferStartsPerMonth) || 0;
                    const category = asset.payload.technologyNode ?? 'Unknown';

                    const origMonthlyValue = wafers * originalUnitPrice;
                    const transMonthlyValue = wafers * transferUnitPrice;
                    const origTotalValue = origMonthlyValue * 12;
                    const transTotalValue = transMonthlyValue * 12;

                    const ts = asset.payload.timestamp
                      ? new Date(asset.payload.timestamp).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                      : '—';

                    return (
                      <div key={asset.contractId} className="list-item-card py-4 px-4 border-l-2 border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-mono text-sm font-bold">{asset.payload.assetId}</div>
                            <ContractIdDisplay contractId={asset.contractId} />
                            <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              Buyer:&nbsp;
                              <PartyLabel partyId={asset.payload.owner} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Transferred: {ts}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              Category: <span className="font-medium text-purple-400">{category}</span>
                            </div>
                          </div>
                          <span className="status-badge status-active">Transferred</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-[var(--border-color)]">
                          {/* Wafers */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                            <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                              {wafers.toLocaleString()}
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Unit Price / Wafer</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(originalUnitPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Transfer</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transferUnitPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Monthly Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Monthly Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origMonthlyValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Transfer</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transMonthlyValue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Total Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Total Contract Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origTotalValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800/30">
                                <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">Transfer</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${fmt2(transTotalValue)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Rejected */}
            {activeHistoryTab === 'rejected' && (
            <div>
              {loadingRejected ? (
                <div className="text-center text-sm py-2 text-gray-500">Loading...</div>
              ) : rejectedLogs.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">No rejected offers.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedRejectedLogs.map((log) => {
                    const fin = financials.find((f) => f.payload.assetId === log.payload.assetId);
                    const originalUnitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                    const transferUnitPrice = parseFloat(log.payload.askingPricePerWafer ?? '0');
                    const wafers = parseInt(log.payload.waferStartsPerMonth ?? '0');
                    const category = fin ? fin.payload.technologyNode : 'Unknown';
                    
                    const origMonthlyValue = wafers * originalUnitPrice;
                    const transMonthlyValue = wafers * transferUnitPrice;
                    const origTotalValue = origMonthlyValue * 12;
                    const transTotalValue = transMonthlyValue * 12;

                    const ts = log.payload.timestamp
                      ? new Date(log.payload.timestamp).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                      : '—';

                    return (
                      <div key={log.contractId} className="list-item-card py-4 px-4 border-l-2 border-l-red-400 bg-red-50/30 dark:bg-red-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-mono text-sm font-bold">{log.payload.assetId}</div>
                            <ContractIdDisplay contractId={log.contractId} />
                            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              Buyer:&nbsp;
                              <PartyLabel partyId={log.payload.buyer} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Rejected: {ts}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              Category: <span className="font-medium text-purple-400">{category}</span>
                            </div>
                          </div>
                          {log.payload.isReclaimed ? (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Reclaimed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAcknowledgeRejection(log.contractId)}
                              disabled={loading}
                              className="btn-primary text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-[var(--border-color)]">
                          {/* Wafers */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                            <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                              {wafers.toLocaleString()}
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Unit Price / Wafer</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(originalUnitPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transferUnitPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Monthly Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Monthly Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origMonthlyValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transMonthlyValue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Total Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Total Contract Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origTotalValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800/30">
                                <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">Asking</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${fmt2(transTotalValue)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Withdrawn */}
            {activeHistoryTab === 'withdrawn' && (
            <div>
              {loadingWithdrawn ? (
                <div className="text-center text-sm py-2 text-gray-500">Loading...</div>
              ) : withdrawnLogs.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">No withdrawn offers.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedWithdrawnLogs.map((log) => {
                    const fin = financials.find((f) => f.payload.assetId === log.payload.assetId);
                    const originalUnitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                    const transferUnitPrice = parseFloat(log.payload.askingPricePerWafer ?? '0');
                    const wafers = parseInt(log.payload.waferStartsPerMonth ?? '0');
                    const category = fin ? fin.payload.technologyNode : 'Unknown';

                    const origMonthlyValue = wafers * originalUnitPrice;
                    const transMonthlyValue = wafers * transferUnitPrice;
                    const origTotalValue = origMonthlyValue * 12;
                    const transTotalValue = transMonthlyValue * 12;

                    const ts = log.payload.timestamp
                      ? new Date(log.payload.timestamp).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                      : '—';

                    return (
                      <div key={log.contractId} className="list-item-card py-4 px-4 border-l-2 border-l-orange-400 bg-orange-50/30 dark:bg-orange-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-mono text-sm font-bold">{log.payload.assetId}</div>
                            <ContractIdDisplay contractId={log.contractId} />
                            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              Target Buyer:&nbsp;
                              <PartyLabel partyId={log.payload.buyer} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Withdrawn: {ts}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              Category: <span className="font-medium text-purple-400">{category}</span>
                            </div>
                          </div>
                          <span className="status-badge status-withdrawn">Withdrawn</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-[var(--border-color)]">
                          {/* Wafers */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                            <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                              {wafers.toLocaleString()}
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Unit Price / Wafer</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(originalUnitPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transferUnitPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Monthly Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Monthly Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origMonthlyValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/30">
                                <span className="text-[0.65rem] text-blue-600 dark:text-blue-400">Asking</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${fmt2(transMonthlyValue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Total Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Total Contract Value</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between bg-[var(--bg-page)] px-2 py-1 rounded">
                                <span className="text-[0.65rem] text-gray-500">Original</span>
                                <span className="font-mono text-gray-500">${fmt2(origTotalValue)}</span>
                              </div>
                              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800/30">
                                <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">Asking</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${fmt2(transTotalValue)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Penalties */}
            {activeHistoryTab === 'penalized' && (
            <div>
              {loadingPenalties ? (
                <div className="text-center text-sm py-2 text-gray-500">Loading...</div>
              ) : sortedPenalties.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">No penalised capacity.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedPenalties.map((penalty) => {
                    const ts = penalty.payload.timestamp
                      ? new Date(penalty.payload.timestamp).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                      : '—';
                    
                    const wafers = parseInt(penalty.payload.waferStartsPerMonth ?? '0');
                    const originalUnitPrice = parseFloat(penalty.payload.costBasisPerWafer ?? '0');
                    const origMonthlyValue = wafers * originalUnitPrice;
                    const origTotalValue = origMonthlyValue * 12;
                    const penaltyAmount = parseFloat(penalty.payload.penaltyAmount ?? '0');
                    const penaltyRate = parseFloat(penalty.payload.penaltyRate ?? '0') * 100;

                    return (
                      <div key={penalty.contractId} className="list-item-card py-4 px-4 border-l-2 border-l-orange-400 bg-orange-50/30 dark:bg-orange-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-mono text-sm font-bold">{penalty.payload.assetId}</div>
                            <ContractIdDisplay contractId={penalty.contractId} />
                            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              Manufacturer:&nbsp;
                              <PartyLabel partyId={penalty.payload.manufacturer} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Canceled: {ts}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              Category: <span className="font-medium text-purple-400">{penalty.payload.technologyNode}</span>
                            </div>
                          </div>
                          {penalty.payload.isSettled ? (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Settled
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                              Pending Settlement
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-[var(--border-color)]">
                          {/* Wafers */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                            <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                              {wafers.toLocaleString()}
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Original Price</div>
                            <div className="font-mono font-medium mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                              ${fmt2(originalUnitPrice)}
                            </div>
                          </div>

                          {/* Total Value */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Total Contract Value</div>
                            <div className="font-mono font-medium mt-1 text-sm text-gray-500">
                              ${fmt2(origTotalValue)}
                            </div>
                          </div>

                          {/* Penalty */}
                          <div>
                            <div style={{ color: 'var(--text-muted)' }} className="mb-1">Penalty ({penaltyRate}%)</div>
                            <div className="font-mono font-bold mt-1 text-sm text-orange-500">
                              ${fmt2(penaltyAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
