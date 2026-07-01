import React, { useState } from 'react';
import { ApiService } from '../../api/client';
import { PackageOpen, Send, FileWarning, TrendingUp, Lock } from 'lucide-react';

interface AssetPayload {
  assetId: string;
  technologyNode: string;
  costBasisPerWafer: string;
}

interface Asset {
  contractId: string;
  payload: AssetPayload;
}

interface PrimaryBuyerViewProps {
  assets: Asset[];
  onRefresh: () => void;
}

export const PrimaryBuyerView: React.FC<PrimaryBuyerViewProps> = ({ assets, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [transferForms, setTransferForms] = useState<Record<string, { price: string; buyer: string }>>({});

  const getForm = (contractId: string) =>
    transferForms[contractId] ?? { price: '21500.00', buyer: 'QualcommInc' };

  const handleProposeTransfer = async (assetContractId: string) => {
    const form = getForm(assetContractId);
    if (!form.price || !form.buyer) {
      alert('Please fill out the transfer details.');
      return;
    }
    try {
      setLoading(true);
      await ApiService.proposeTransfer({
        assetContractId,
        secondaryBuyer: form.buyer,
        askingPricePerWafer: form.price,
      });
      alert('Transfer RFQ posted to the Dark Pool!');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to propose transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePenalty = async (assetContractId: string) => {
    if (!confirm('Are you sure you want to cancel this capacity and initiate a penalty agreement?')) return;
    try {
      setLoading(true);
      await ApiService.initiatePenalty({ assetContractId, penaltyRate: '0.25' });
      alert('Penalty Agreement Initiated (Private)');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to initiate penalty.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
};
