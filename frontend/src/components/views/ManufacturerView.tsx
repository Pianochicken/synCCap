import React, { useState } from 'react';
import { Cpu, Activity, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ApiService } from '../../api/client';
import { useBackendQuery } from '../../hooks/useBackendQuery';
import { PartyLabel } from '../PartyLabel';
import { useDemoSessionContext } from '../../context/DemoSessionContext';

// Helper: format number to 2 decimal places
const fmt2 = (v: string | number) =>
  parseFloat(String(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Map status to badge style
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Active: 'status-active',
    PendingTransfer: 'status-pending',
    Transferred: 'status-transferred',
    Penalized: 'status-penalized',
  };
  const label: Record<string, string> = {
    Active: 'Active',
    PendingTransfer: 'Pending Transfer',
    Transferred: 'Transferred',
    Penalized: 'Penalized',
  };
  return (
    <span className={`status-badge ${map[status] ?? 'status-inactive'}`}>
      {label[status] ?? status}
    </span>
  );
};

export const ManufacturerView: React.FC<{ partyId: string }> = ({ partyId: manufacturerPartyId }) => {
  const fingerprint = manufacturerPartyId?.split('::')[1] || '';

  const { assets, financials, penalties, loadingAssets, loadingFinancials, loadingPenalties } = useBackendQuery();
  const { demoSessionId } = useDemoSessionContext();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    owner: string;
    technologyNode: string;
    waferStartsPerMonth: number | string;
    unitPricePerWafer: string;
  }>({
    owner: 'synccap-primary-buyer-1',
    technologyNode: 'N3nm',
    waferStartsPerMonth: 10000,
    unitPricePerWafer: '18500.00',
  });

  const handleIssueAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let assetId = `WAFER-BATCH-${Math.floor(Math.random() * 100000)}`;
      if (demoSessionId) {
        assetId += `_SID_${demoSessionId}`;
      }
      
      const ownerPartyId = formData.owner.includes('::')
        ? formData.owner
        : `${formData.owner}::${fingerprint}`;

      await ApiService.createAsset({
        owner: ownerPartyId,
        assetId,
        technologyNode: formData.technologyNode as any,
        waferStartsPerMonth: Number(formData.waferStartsPerMonth),
        costBasisPerWafer: formData.unitPricePerWafer,
        commitmentStartDate: new Date().toISOString().slice(0, 10),
        commitmentEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });

      toast.success('Asset issued successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to issue asset. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettlePenalty = async (contractId: string) => {
    try {
      setLoading(true);
      await ApiService.settlePenalty({ penaltyContractId: contractId });
      toast.success('Penalty settled successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to settle penalty.');
    } finally {
      setLoading(false);
    }
  };

  const monthlyWafers = Number(formData.waferStartsPerMonth) || 0;
  const unitPrice = parseFloat(formData.unitPricePerWafer) || 0;
  const monthlyValue = monthlyWafers * unitPrice;
  const totalContractValue = monthlyValue * 12;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Issue Capacity Form ── */}
        <div className="card">
          <h3
            className="text-lg font-bold mb-5 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}
            >
              <Cpu className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            Issue Foundry Capacity
          </h3>

          <form onSubmit={handleIssueAsset} className="space-y-4">
            <div>
              <label className="label">Primary Buyer (Owner)</label>
              <select
                className="input-field"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              >
                <option value="synccap-primary-buyer-1">Primary Buyer</option>
                <option value="synccap-secondary-buyer-1">Secondary Buyer</option>
              </select>
            </div>

            <div>
              <label className="label">Category</label>
              <select
                className="input-field mb-3"
                value={formData.technologyNode}
                onChange={(e) => setFormData({ ...formData, technologyNode: e.target.value })}
              >
                <option value="N3nm">N3nm</option>
                <option value="N5nm">N5nm</option>
                <option value="N7nm">N7nm</option>
                <option value="N14nm">N14nm</option>
              </select>
            </div>
            
            <div>
              <label className="label">Monthly Wafers</label>
              <input
                type="number"
                className="input-field mb-3"
                value={formData.waferStartsPerMonth}
                onChange={(e) =>
                  setFormData({ ...formData, waferStartsPerMonth: e.target.value ? parseInt(e.target.value) : '' })
                }
              />
            </div>

            <div>
              <label className="label">Unit Price Per Wafer (USD)</label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  $
                </span>
                <input
                  type="text"
                  className="input-field pl-7"
                  value={formData.unitPricePerWafer}
                  onChange={(e) => setFormData({ ...formData, unitPricePerWafer: e.target.value.replace(/[^0-9.]/g, '') })}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                This unit price is private and will be severed upon secondary transfer.
              </p>
            </div>

            {/* Financial Summary */}
            <div
              className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Monthly Value</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ${monthlyValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Total Contract Value (12 mo.)
                </span>
                <span className="text-base font-bold text-emerald-500">
                  ${totalContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Issuing…' : 'Issue Capacity Token'}
            </button>
          </form>
        </div>

        {/* ── Issued Assets List ── */}
        <div className="card flex flex-col">
          <h3
            className="text-lg font-bold mb-5 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,217,126,0.12)', border: '1px solid #10d97e' }}
            >
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            Issued Assets Matrix
          </h3>

          <div className="flex-1 overflow-auto pr-2 custom-scrollbar space-y-3 max-h-[600px] min-h-[300px]">
            {loadingAssets || loadingFinancials ? (
              <div className="text-center text-sm py-8 text-gray-500">Loading assets...</div>
            ) : assets.length === 0 ? (
              <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                No capacity tokens issued yet.
              </div>
            ) : (
              [...assets].reverse().map((asset) => {
                const fin = financials.find((f) => f.payload.assetId === asset.payload.assetId);
                const unitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                const wafers = parseInt(asset.payload.waferStartsPerMonth) || 0;
                const monthlyVal = unitPrice * wafers;
                const totalVal = monthlyVal * 12;
                const ts = asset.payload.timestamp
                  ? new Date(asset.payload.timestamp).toLocaleString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })
                  : '—';

                return (
                  <div key={asset.contractId} className="list-item-card">
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {asset.payload.assetId}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Category: <span className="font-medium text-purple-400">{asset.payload.technologyNode}</span>
                        </div>
                        <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          Allocated to:&nbsp;
                          <PartyLabel partyId={asset.payload.owner} />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Issued: {ts}
                        </div>
                      </div>
                      {statusBadge(asset.payload.status)}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                        <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {parseInt(asset.payload.waferStartsPerMonth).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Unit Price / Wafer</div>
                        <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          ${fmt2(unitPrice)}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Monthly Value</div>
                        <div className="font-mono font-medium mt-0.5 text-blue-500">
                          ${monthlyVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Total Contract Value</div>
                        <div className="font-mono font-bold mt-0.5 text-emerald-500">
                          ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Active Penalties Section ── */}
      <div className="card mt-6">
        {(() => {
          const actionablePenalties = penalties.filter(p => !p.payload.isSettled);
          const settledPenalties = penalties.filter(p => p.payload.isSettled);

          const renderPenaltyCard = (penalty: any, isSettled: boolean) => {
            const ts = penalty.payload.timestamp
              ? new Date(penalty.payload.timestamp).toLocaleString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit'
                })
              : '—';
            const wafers = parseInt(penalty.payload.waferStartsPerMonth) || 0;
            const unitPrice = parseFloat(penalty.payload.costBasisPerWafer) || 0;
            const totalVal = wafers * unitPrice * 12;
            const penaltyRatePct = parseFloat(penalty.payload.penaltyRate) * 100;

            return (
              <div key={penalty.contractId} className={`list-item-card border-l-4 ${isSettled ? 'border-l-gray-400 bg-gray-50/10 dark:bg-gray-800/10 opacity-75' : 'border-l-red-500 bg-red-50/10 dark:bg-red-900/10'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {penalty.payload.assetId}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Category: <span className="font-medium text-purple-400">{penalty.payload.technologyNode}</span>
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      Penalized Party:&nbsp;
                      <PartyLabel partyId={penalty.payload.penalizedParty} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isSettled ? 'Settled:' : 'Cancelled:'} {ts}
                    </div>
                  </div>
                  {!isSettled ? (
                    <button
                      onClick={() => handleSettlePenalty(penalty.contractId)}
                      disabled={loading}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      Settle Payment
                    </button>
                  ) : (
                    <span className="status-badge status-transferred">Settled</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                    <div style={{ color: 'var(--text-muted)' }}>Monthly Wafers</div>
                    <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {wafers.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                    <div style={{ color: 'var(--text-muted)' }}>Unit Price / Wafer</div>
                    <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      ${fmt2(unitPrice)}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                    <div style={{ color: 'var(--text-muted)' }}>Total Contract Value</div>
                    <div className="font-mono font-bold mt-0.5 text-emerald-500">
                      ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`${isSettled ? 'bg-gray-100 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'} p-2 rounded border`}>
                    <div className={`${isSettled ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400'} font-medium`}>Penalty Amount ({fmt2(penaltyRatePct)}%)</div>
                    <div className={`font-mono font-bold mt-0.5 ${isSettled ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400'} text-sm`}>
                      ${parseFloat(penalty.payload.penaltyAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center border border-red-200 dark:border-red-800">
                  <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                Actionable Cancellation Penalties
              </h3>

              {loadingPenalties ? (
                <div className="text-center text-sm py-4 text-gray-500">Loading penalties...</div>
              ) : actionablePenalties.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 mb-4">
                  No pending penalty settlements.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 max-h-[500px] overflow-auto pr-2 custom-scrollbar mb-8">
                  {[...actionablePenalties].reverse().map((p) => renderPenaltyCard(p, false))}
                </div>
              )}

              <h3 className="text-lg font-bold mb-5 flex items-center gap-2 mt-8 border-t border-[var(--border-color)] pt-6" style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                Settled Penalties History
              </h3>

              {loadingPenalties ? (
                <div className="text-center text-sm py-4 text-gray-500">Loading history...</div>
              ) : settledPenalties.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  No settled penalties yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                  {[...settledPenalties].reverse().map((p) => renderPenaltyCard(p, true))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};
