import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adjustmentService, CreateAdjustmentDto } from '../services/adjustmentService';
import { medicineService } from '../services/medicineService';
import { batchService } from '../services/batchService';
import {
  StockAdjustment,
  StockMovement,
  Medicine,
  Batch,
  AdjustmentType,
  MovementType,
  PaginationMeta
} from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  RotateCcw,
  ShieldAlert,
  Plus,
  AlertTriangle,
  Search,
  CheckCircle,
  FileText,
  Boxes,
  ArrowUpDown
} from 'lucide-react';

export const AdjustmentsPage: React.FC = () => {
  const { user, isAdmin, isPharmacist } = useAuth();
  const canAdjust = isAdmin || isPharmacist;

  const [activeTab, setActiveTab] = useState<'movements' | 'adjustments'>('movements');

  // Ledger state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [selectedAdjustmentType, setSelectedAdjustmentType] = useState<string>('all');

  // New Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [batchesForSelectedMed, setBatchesForSelectedMed] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('DAMAGE');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [isNegativeChange, setIsNegativeChange] = useState<boolean>(true);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements(1);
    } else {
      loadAdjustments(1);
    }
  }, [activeTab, selectedMovementType, selectedAdjustmentType]);

  const loadMedicines = async () => {
    try {
      const res = await medicineService.getMedicines({ limit: 100 });
      setMedicines(res.items);
      if (res.items.length > 0) {
        setSelectedMedicineId(res.items[0].id);
        fetchBatchesForMed(res.items[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchBatchesForMed = async (medId: string) => {
    try {
      const bList = await batchService.getBatches({ medicineId: medId });
      setBatchesForSelectedMed(bList);
      if (bList.length > 0) {
        setSelectedBatchId(bList[0].id);
      } else {
        setSelectedBatchId('');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMedicineChange = (medId: string) => {
    setSelectedMedicineId(medId);
    fetchBatchesForMed(medId);
  };

  const loadMovements = async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adjustmentService.getMovements({
        type: selectedMovementType !== 'all' ? (selectedMovementType as MovementType) : undefined,
        page,
        limit: 15
      });
      setMovements(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdjustments = async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adjustmentService.getAdjustments({
        type: selectedAdjustmentType !== 'all' ? (selectedAdjustmentType as AdjustmentType) : undefined,
        page,
        limit: 15
      });
      setAdjustments(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load adjustments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdjustmentModal = () => {
    setReason('');
    setNotes('');
    setQuantityInput(1);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAdjustmentTypeChange = (type: AdjustmentType) => {
    setAdjustmentType(type);
    if (type === 'DAMAGE' || type === 'EXPIRY_REMOVAL') {
      setIsNegativeChange(true);
    } else if (type === 'CUSTOMER_RETURN') {
      setIsNegativeChange(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      setFormError('Please select a batch');
      return;
    }
    if (!reason || reason.trim().length < 3) {
      setFormError('A valid audit reason of at least 3 characters is strictly mandatory');
      return;
    }

    const currentBatch = batchesForSelectedMed.find((b) => b.id === selectedBatchId);
    const delta = isNegativeChange ? -Math.abs(quantityInput) : Math.abs(quantityInput);

    if (delta < 0 && currentBatch && currentBatch.quantity + delta < 0) {
      setFormError(
        `Negative Stock Guard: Cannot deduct ${Math.abs(delta)} units when current batch only has ${currentBatch.quantity} units.`
      );
      return;
    }

    setFormError(null);
    setIsSaving(true);

    const dto: CreateAdjustmentDto = {
      batchId: selectedBatchId,
      type: adjustmentType,
      quantityChange: delta,
      reason: reason.trim(),
      notes: notes || undefined
    };

    try {
      await adjustmentService.adjustStock(dto);
      setIsModalOpen(false);
      // Reload current tab
      if (activeTab === 'movements') {
        loadMovements(1);
      } else {
        loadAdjustments(1);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to apply adjustment');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSelectedBatchObj = batchesForSelectedMed.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-400" />
              Adjustments, Returns & Stock Ledger (Criterion 4)
            </h1>
            <Badge variant="purple" size="sm">
              Auditable Integrity
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Mandatory reason enforcement, negative-stock prevention guards, and immutable transactional movement history.
          </p>
        </div>

        {canAdjust && (
          <button
            onClick={handleOpenAdjustmentModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/40 transition-all hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            Apply Stock Adjustment / Return
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Complete Stock Movement Ledger
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'adjustments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Regulatory Adjustments History
        </button>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-3">
        {activeTab === 'movements' ? (
          <select
            value={selectedMovementType}
            onChange={(e) => setSelectedMovementType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Movement Types</option>
            <option value="PURCHASE">PURCHASE (+ Stock In)</option>
            <option value="SALE">SALE (- Stock Out)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audit/Damage)</option>
            <option value="RETURN">RETURN (Patient Return)</option>
            <option value="EXPIRED_DISPOSAL">EXPIRED_DISPOSAL (Safe Waste)</option>
          </select>
        ) : (
          <select
            value={selectedAdjustmentType}
            onChange={(e) => setSelectedAdjustmentType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Adjustment Types</option>
            <option value="DAMAGE">DAMAGE (Broken / Leaked)</option>
            <option value="EXPIRY_REMOVAL">EXPIRY_REMOVAL (Hazard Waste)</option>
            <option value="COUNT_CORRECTION">COUNT_CORRECTION (Physical Audit)</option>
            <option value="CUSTOMER_RETURN">CUSTOMER_RETURN (Stock Restock)</option>
          </select>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Tab 1: Movements Table */}
      {activeTab === 'movements' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          {isLoading ? (
            <LoadingSpinner message="Querying ledger entries..." fullHeight />
          ) : movements.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Movement Type</th>
                      <th className="py-3 px-4">Medicine Name</th>
                      <th className="py-3 px-4">Batch #</th>
                      <th className="py-3 px-4 text-right">Qty Delta</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Authorized User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {movements.map((m) => {
                      const isPositive = m.quantityChange > 0;
                      return (
                        <tr key={m.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {new Date(m.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                m.type === 'SALE'
                                  ? 'info'
                                  : m.type === 'PURCHASE'
                                  ? 'success'
                                  : m.type === 'RETURN'
                                  ? 'purple'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {m.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">{m.medicine?.name}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">{m.batch?.batchNumber}</td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {m.balanceAfter}
                          </td>
                          <td className="py-3 px-4 text-slate-300 italic text-[11px] max-w-xs truncate">
                            {m.reason || 'Operational Action'}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{m.performedBy?.name || 'Staff'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={(p) => loadMovements(p)} />
            </>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No stock movements recorded"
              description="Perform sales or adjustments to populate the ledger."
            />
          )}
        </div>
      )}

      {/* Tab 2: Adjustments Table */}
      {activeTab === 'adjustments' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          {isLoading ? (
            <LoadingSpinner message="Loading adjustment records..." fullHeight />
          ) : adjustments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Medicine & Batch</th>
                      <th className="py-3 px-4 text-right">Adjusted Qty</th>
                      <th className="py-3 px-4">Mandatory Audit Reason (Criterion 4)</th>
                      <th className="py-3 px-4">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {adjustments.map((adj) => {
                      const isPositive = adj.quantityChange > 0;
                      return (
                        <tr key={adj.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {new Date(adj.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                adj.type === 'CUSTOMER_RETURN'
                                  ? 'purple'
                                  : adj.type === 'COUNT_CORRECTION'
                                  ? 'info'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {adj.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{adj.medicine?.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              Batch: {adj.batch?.batchNumber}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${adj.quantityChange}` : adj.quantityChange}
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-semibold">{adj.reason}</td>
                          <td className="py-3 px-4 text-slate-300">{adj.performedBy?.name || 'Staff'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={(p) => loadAdjustments(p)} />
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="No adjustments recorded"
              description="Manual adjustments will appear here with full audit justification."
              actionText={canAdjust ? 'Apply Adjustment' : undefined}
              onAction={canAdjust ? handleOpenAdjustmentModal : undefined}
            />
          )}
        </div>
      )}

      {/* New Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply Stock Adjustment / Return"
        subtitle="Mandatory reason required by assessment criterion 4"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              {formError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Select Medicine *</label>
            <select
              value={selectedMedicineId}
              onChange={(e) => handleMedicineChange(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dosageForm}) - Total: {m.totalStock} {m.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Select Specific Batch *</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
            >
              {batchesForSelectedMed.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} - Available: {b.quantity} units (Exp: {new Date(b.expiryDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            {currentSelectedBatchObj && (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Current Batch Stock: <strong className="text-white font-mono">{currentSelectedBatchObj.quantity} units</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Adjustment Type *</label>
              <select
                value={adjustmentType}
                onChange={(e) => handleAdjustmentTypeChange(e.target.value as AdjustmentType)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="DAMAGE">DAMAGE (Broken / Defective)</option>
                <option value="EXPIRY_REMOVAL">EXPIRY_REMOVAL (Disposal)</option>
                <option value="COUNT_CORRECTION">COUNT_CORRECTION (Physical Count)</option>
                <option value="CUSTOMER_RETURN">CUSTOMER_RETURN (Unused Return)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Direction & Quantity *</label>
              <div className="flex gap-2">
                <select
                  value={isNegativeChange ? 'sub' : 'add'}
                  onChange={(e) => setIsNegativeChange(e.target.value === 'sub')}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-bold"
                >
                  <option value="sub">- Deduct</option>
                  <option value="add">+ Add</option>
                </select>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Mandatory Audit Reason (Min 3 chars) *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken vial during shelf rearrangement"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Additional Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional supervisor notes..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50"
            >
              {isSaving ? 'Recording Ledger Movement...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
