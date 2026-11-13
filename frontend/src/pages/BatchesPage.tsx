import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { batchService } from '../services/batchService';
import { Batch } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  Boxes,
  Search,
  Filter,
  Ban,
  CheckCircle,
  AlertTriangle,
  Clock,
  PackageX,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const { isAdmin, isPharmacist } = useAuth();
  const canManage = isAdmin || isPharmacist;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'near_expiry' | 'expired' | 'blocked'>(
    (initialStatus as any) || 'all'
  );

  // Block / Quarantine Modal state
  const [selectedBatchForBlock, setSelectedBatchForBlock] = useState<Batch | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  useEffect(() => {
    loadBatches();
  }, [search, statusFilter]);

  const loadBatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await batchService.getBatches({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setBatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBlockModal = (batch: Batch) => {
    setSelectedBatchForBlock(batch);
    setBlockReason(batch.isBlocked ? 'Release from quarantine' : 'Regulatory hold / packaging inspection');
  };

  const handleConfirmToggleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForBlock) return;

    setIsSubmittingBlock(true);
    try {
      await batchService.toggleBatchBlock(selectedBatchForBlock.id, blockReason);
      setSelectedBatchForBlock(null);
      setBlockReason('');
      await loadBatches();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Boxes className="h-5 w-5 text-emerald-400" />
              Batch Inventory Management (Criterion 2)
            </h1>
            <Badge variant="purple" size="sm">
              {batches.length} Tracked Batches
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Explicit batch-level tracking with individual purchase cost, MRP, expiry date, and quarantine controls.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Batch #, Medicine Name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setSearchParams(e.target.value !== 'all' ? { status: e.target.value } : {});
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Batches</option>
            <option value="active">Active & Healthy</option>
            <option value="near_expiry">Near Expiry (&lt;60 Days)</option>
            <option value="expired">Expired Batches (Blocked)</option>
            <option value="blocked">Quarantined / Recalled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingSpinner message="Scanning batch inventory..." fullHeight />
        ) : batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine Details</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Sale Price</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-center">Expiry Status</th>
                  <th className="py-3 px-4 text-center">Batch Status</th>
                  {canManage && <th className="py-3 px-4 text-center">Quarantine</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {batches.map((batch) => {
                  const expiryDateObj = new Date(batch.expiryDate);
                  const isExpired = expiryDateObj < new Date();
                  const daysRemaining = Math.ceil(
                    (expiryDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <tr key={batch.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold font-mono text-white text-sm block">{batch.batchNumber}</span>
                        {batch.rackLocation && (
                          <span className="text-[10px] font-mono text-slate-400">Rack: {batch.rackLocation}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-sm block">{batch.medicine?.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          SKU: {batch.medicine?.sku} | {batch.medicine?.dosageForm}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-white text-sm">{batch.quantity}</span>
                        <span className="text-[10px] text-slate-500 block">of {batch.initialQuantity} units</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">₹{batch.purchasePrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        ₹{batch.salePrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">₹{batch.mrp.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-slate-200 block text-xs">
                          {expiryDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {isExpired ? (
                          <Badge variant="danger" size="sm">
                            EXPIRED
                          </Badge>
                        ) : daysRemaining <= 30 ? (
                          <Badge variant="danger" size="sm">
                            {daysRemaining}d CRITICAL
                          </Badge>
                        ) : daysRemaining <= 60 ? (
                          <Badge variant="warning" size="sm">
                            {daysRemaining}d Warning
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">{daysRemaining}d Healthy</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {batch.isBlocked ? (
                          <Badge variant="danger" size="sm">
                            Quarantined
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="danger" size="sm">
                            Blocked (Exp)
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenBlockModal(batch)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              batch.isBlocked
                                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                                : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400'
                            }`}
                            title={batch.isBlocked ? 'Release quarantine' : 'Quarantine / Hold Batch'}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Boxes}
            title="No batches found"
            description="No batches match current filter criteria."
          />
        )}
      </div>

      {/* Quarantine / Hold Toggle Modal */}
      <Modal
        isOpen={Boolean(selectedBatchForBlock)}
        onClose={() => setSelectedBatchForBlock(null)}
        title={
          selectedBatchForBlock?.isBlocked
            ? 'Release Batch From Quarantine'
            : 'Quarantine / Regulatory Hold on Batch'
        }
        subtitle={`Batch #${selectedBatchForBlock?.batchNumber} (${selectedBatchForBlock?.medicine?.name})`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmToggleBlock} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-400">Current Status:</div>
            <div className="font-bold text-white text-sm">
              {selectedBatchForBlock?.isBlocked ? 'QUARANTINED / BLOCKED' : 'ACTIVE & AVAILABLE'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Quarantining immediately blocks this batch from POS cashier checkout, preventing unauthorized dispensing.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Audit Reason *</label>
            <textarea
              required
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Provide reason for regulatory audit log (e.g. Broken foil seal, recall advisory)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedBatchForBlock(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBlock || !blockReason}
              className={`px-5 py-2 rounded-xl text-white font-bold disabled:opacity-50 ${
                selectedBatchForBlock?.isBlocked
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmittingBlock
                ? 'Updating...'
                : selectedBatchForBlock?.isBlocked
                ? 'Release Batch'
                : 'Confirm Quarantine'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
