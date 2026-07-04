import React, { useState } from 'react';
import { Cpu, Activity, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ApiService } from '../../api/client';
import { useBackendQuery } from '../../hooks/useBackendQuery';
import { PartyLabel } from '../PartyLabel';


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
      const assetId = `WAFER-BATCH-${Math.floor(Math.random() * 100000)}`;
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Technology Node</label>
                <select
                  className="input-field"
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
                  className="input-field"
                  value={formData.waferStartsPerMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, waferStartsPerMonth: e.target.value ? parseInt(e.target.value) : '' })
                  }
                />
              </div>
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

          <div className="flex-1 overflow-auto pr-2 custom-scrollbar space-y-3 min-h-[300px]">
            {loadingAssets || loadingFinancials ? (
              <div className="text-center text-sm py-8 text-gray-500">Loading assets...</div>
            ) : assets.length === 0 ? (
              <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                No capacity tokens issued yet.
              </div>
            ) : (
              assets.map((asset) => {
                const fin = financials.find((f) => f.payload.assetId === asset.payload.assetId);
                const unitPrice = fin ? parseFloat(fin.payload.costBasisPerWafer) : 0;
                const wafers = parseInt(asset.payload.waferStartsPerMonth) || 0;
                const monthlyVal = unitPrice * wafers;
                const totalVal = monthlyVal * 12;
                const ts = asset.payload.timestamp
                  ? new Date(asset.payload.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
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
                        <div className="text-[0.65rem] uppercase tracking-wider mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          Allocated to:&nbsp;
                          <PartyLabel partyId={asset.payload.owner} />
                        </div>
                        <div className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Issued: {ts}
                        </div>
                      </div>
                      {statusBadge(asset.payload.status)}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[var(--bg-page)] p-2 rounded border border-[var(--border-color)]">
                        <div style={{ color: 'var(--text-muted)' }}>Node / Monthly Wafers</div>
                        <div className="font-mono font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {asset.payload.technologyNode} / {parseInt(asset.payload.waferStartsPerMonth).toLocaleString()}
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
        <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center border border-red-200 dark:border-red-800">
            <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          Actionable Cancellation Penalties
        </h3>

        {loadingPenalties ? (
          <div className="text-center text-sm py-4 text-gray-500">Loading penalties...</div>
        ) : penalties.length === 0 ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
            No pending penalty settlements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Penalized Party</th>
                  <th className="px-4 py-3">Asset ID</th>
                  <th className="px-4 py-3">Penalty Rate</th>
                  <th className="px-4 py-3">Penalty Amount</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {penalties.map((penalty) => (
                  <tr key={penalty.contractId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <PartyLabel partyId={penalty.payload.penalizedParty} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{penalty.payload.assetId}</td>
                    <td className="px-4 py-3">{penalty.payload.penaltyRate}%</td>
                    <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400">
                      ${parseFloat(penalty.payload.penaltyAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSettlePenalty(penalty.contractId)}
                        disabled={loading}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Settle Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
