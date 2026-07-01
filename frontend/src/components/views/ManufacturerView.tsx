import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { Cpu, DollarSign, Activity, FileWarning, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AssetPayload {
  assetId: string;
  technologyNode: string;
  owner: string;
  costBasisPerWafer: string;
  status: string;
}

interface Asset {
  contractId: string;
  payload: AssetPayload;
}

interface PenaltyPayload {
  penaltyAmount: string;
  penalizedParty: string;
  assetId: string;
  penaltyRate: string;
}

interface Penalty {
  contractId: string;
  payload: PenaltyPayload;
}

interface ManufacturerViewProps {
  assets: Asset[];
  penalties: Penalty[];
  onRefresh: () => void;
}

export const ManufacturerView: React.FC<ManufacturerViewProps> = ({ assets, penalties, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    owner: 'AppleInc',
    technologyNode: 'N3nm',
    waferStartsPerMonth: 10000,
    costBasisPerWafer: '18500.00',
  });

  const handleIssueAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await ApiService.createAsset({
        owner: formData.owner,
        assetId: `WAFER-BATCH-${Math.floor(Math.random() * 100000)}`,
        technologyNode: formData.technologyNode as 'N3nm' | 'N5nm' | 'N7nm' | 'N14nm',
        waferStartsPerMonth: formData.waferStartsPerMonth,
        costBasisPerWafer: formData.costBasisPerWafer,
        commitmentStartDate: new Date().toISOString().slice(0, 10),
        commitmentEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      toast.success('Asset issued successfully!');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to issue asset.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettlePenalty = async (contractId: string) => {
    try {
      setLoading(true);
      await ApiService.settlePenalty({ penaltyContractId: contractId });
      toast.success('Penalty settled successfully!');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to settle penalty.');
    } finally {
      setLoading(false);
    }
  };

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
                <option value="AppleInc">Apple Inc.</option>
                <option value="QualcommInc">Qualcomm Inc.</option>
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
                <label className="label">Wafer Starts / Month</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.waferStartsPerMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, waferStartsPerMonth: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <label className="label">Cost Basis Per Wafer (USD)</label>
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
                  value={formData.costBasisPerWafer}
                  onChange={(e) => setFormData({ ...formData, costBasisPerWafer: e.target.value })}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                This cost basis is private and will be severed upon secondary transfer.
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Issuing…' : 'Issue Capacity Token'}
            </button>
          </form>
        </div>

        {/* ── Issued Assets List ── */}
        <div className="card">
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

          {assets.length === 0 ? (
            <div
              className="text-center py-12 text-sm rounded-xl"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--bg-surface-2)',
                border: '1px dashed var(--border-strong)',
              }}
            >
              No capacity assets issued yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {assets.map((asset) => (
                <div
                  key={asset.contractId}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="font-bold text-sm truncate max-w-[180px]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {asset.payload.assetId}
                    </div>
                    <span className="badge-green shrink-0">{asset.payload.status}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Node:{' '}
                      <span style={{ color: 'var(--primary)' }} className="font-semibold">
                        {asset.payload.technologyNode}
                      </span>
                    </div>
                    <div
                      className="truncate"
                      style={{ color: 'var(--text-muted)' }}
                      title={asset.payload.owner}
                    >
                      Owner: {asset.payload.owner.split('::')[0]}
                    </div>
                    <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      {parseFloat(asset.payload.costBasisPerWafer).toLocaleString()} / wafer
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Penalties ── */}
      <div
        className="card"
        style={{ borderColor: 'rgba(245,158,11,0.3)' }}
      >
        <h3
          className="text-lg font-bold mb-2 flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)' }}
          >
            <FileWarning className="w-4 h-4 text-amber-500" />
          </div>
          Pending Penalty Agreements
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          These cancellation agreements are completely private — only you and the specific buyer can see them.
        </p>

        {penalties.length === 0 ? (
          <div
            className="text-center py-6 text-sm rounded-xl"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-2)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            No pending penalties.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {penalties.map((p) => (
              <div
                key={p.contractId}
                className="p-4 rounded-xl"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-amber-500 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {parseFloat(p.payload.penaltyAmount).toLocaleString()} USD
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Party: {p.payload.penalizedParty.split('::')[0]}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettlePenalty(p.contractId)}
                    disabled={loading}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Settle
                  </button>
                </div>
                <div
                  className="text-xs pt-2"
                  style={{
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  Asset: {p.payload.assetId} · {parseFloat(p.payload.penaltyRate) * 100}% penalty rate
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
