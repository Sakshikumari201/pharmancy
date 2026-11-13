import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchaseService, CreatePurchaseDto, CreatePurchaseItemDto } from '../services/purchaseService';
import { supplierService } from '../services/supplierService';
import { medicineService } from '../services/medicineService';
import { Purchase, Supplier, Medicine, PaginationMeta } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  Building2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { user, isAdmin, isPharmacist } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // View purchase modal
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);

  // New Purchase Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [items, setItems] = useState<CreatePurchaseItemDto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliersAndMedicines();
    loadPurchases(1);
  }, [search]);

  const loadSuppliersAndMedicines = async () => {
    try {
      const [supList, medRes] = await Promise.all([
        supplierService.getSuppliers(),
        medicineService.getMedicines({ limit: 100 })
      ]);
      setSuppliers(supList);
      setMedicines(medRes.items);
      if (supList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supList[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadPurchases = async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await purchaseService.getPurchases({
        search: search || undefined,
        page,
        limit: 10
      });
      setPurchases(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenNewPurchase = () => {
    setInvoiceNumber(`SUP-INV-${Date.now().toString().slice(-6)}`);
    setPurchaseNotes('');
    setFormError(null);
    // Initialize with 1 empty item
    if (medicines.length > 0) {
      setItems([
        {
          medicineId: medicines[0].id,
          batchNumber: `B-${Date.now().toString().slice(-4)}`,
          quantity: 50,
          purchasePrice: 20.0,
          salePrice: 35.0,
          mrp: 40.0,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rackLocation: 'Rack A-2'
        }
      ]);
    } else {
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (medicines.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        medicineId: medicines[0].id,
        batchNumber: `B-${Date.now().toString().slice(-4)}`,
        quantity: 50,
        purchasePrice: 20.0,
        salePrice: 35.0,
        mrp: 40.0,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rackLocation: 'Rack A-2'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreatePurchaseItemDto, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalCalculatedAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0),
    0
  );

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setFormError('Please add at least one line item');
      return;
    }
    if (!selectedSupplierId) {
      setFormError('Please select a supplier');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    const dto: CreatePurchaseDto = {
      supplierId: selectedSupplierId,
      invoiceNumber,
      items: items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        purchasePrice: Number(i.purchasePrice),
        salePrice: Number(i.salePrice),
        mrp: Number(i.mrp)
      })),
      notes: purchaseNotes || undefined
    };

    try {
      await purchaseService.createPurchase(dto);
      setIsModalOpen(false);
      loadPurchases(1);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save purchase');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              Stock Purchases & Receiving
            </h1>
            <Badge variant="purple" size="sm">
              {pagination.total} Invoices
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Record incoming shipments from pharmaceutical suppliers and automatically provision batch stock.
          </p>
        </div>

        <button
          onClick={handleOpenNewPurchase}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Receive Stock (New Purchase)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Search by Supplier Invoice #, Supplier Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingSpinner message="Loading purchase orders..." fullHeight />
        ) : purchases.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Items Count</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4">Received By</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {purchases.map((p) => (
                    <tr key={p.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">{p.invoiceNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200 block">{p.supplier?.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{p.supplier?.phone}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">
                        {p.items?.length || 0} batches
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        ₹{p.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(p.receivedDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.receivedBy?.name || 'Staff'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewPurchase(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Invoiced Items"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={(p) => loadPurchases(p)} />
          </>
        ) : (
          <EmptyState
            icon={Truck}
            title="No purchase orders found"
            description="Receive supplier stock to initialize batches."
            actionText="Receive Stock"
            onAction={handleOpenNewPurchase}
          />
        )}
      </div>

      {/* New Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Receive Supplier Stock"
        subtitle="Provision batches into inventory with cost snapshots"
        maxWidth="4xl"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Select Supplier *</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Supplier Bill / Invoice # *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="e.g. Received via Cold Chain Logistics"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Line items table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Shipment Line Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Medicine Formulation *</label>
                      <select
                        value={item.medicineId}
                        onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                      >
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.dosageForm}) - SKU: {m.sku}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Batch Number *</label>
                      <input
                        type="text"
                        required
                        value={item.batchNumber}
                        onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={item.expiryDate}
                        onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Quantity (Units) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Cost Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.purchasePrice}
                        onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Sale Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.salePrice}
                        onChange={(e) => handleItemChange(idx, 'salePrice', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">MRP (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.mrp}
                        onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-4">
                      <span className="font-mono text-emerald-400 font-bold">
                        ₹{((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)).toFixed(2)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div>
              <span className="text-slate-400 text-xs">Total Shipment Cost:</span>
              <span className="text-lg font-black text-emerald-400 font-mono ml-2">
                ₹{totalCalculatedAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
              >
                {isSaving ? 'Processing Stock Inflow...' : 'Commit Stock to Batches'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Purchase Modal */}
      <Modal
        isOpen={Boolean(viewPurchase)}
        onClose={() => setViewPurchase(null)}
        title="Purchase Order Details"
        subtitle={`Supplier Invoice #${viewPurchase?.invoiceNumber}`}
        maxWidth="2xl"
      >
        {viewPurchase && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Supplier</span>
                <div className="font-bold text-white text-sm">{viewPurchase.supplier?.name}</div>
                <div className="text-slate-400">{viewPurchase.supplier?.phone}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Invoiced</span>
                <div className="font-black text-emerald-400 text-base font-mono">
                  ₹{viewPurchase.totalAmount.toFixed(2)}
                </div>
                <div className="text-slate-400">
                  Received on {new Date(viewPurchase.receivedDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Batches In Stock</h5>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr className="border-b border-slate-800">
                      <th className="p-2.5">Medicine</th>
                      <th className="p-2.5">Batch #</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Cost Price</th>
                      <th className="p-2.5 text-right">Sale Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {viewPurchase.items?.map((item) => (
                      <tr key={item.id} className="text-slate-300">
                        <td className="p-2.5 font-bold text-white">{item.medicine?.name}</td>
                        <td className="p-2.5 font-mono text-emerald-400">{item.batchNumber}</td>
                        <td className="p-2.5 text-right font-mono">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">₹{item.purchasePrice.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono">₹{item.salePrice.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">
                          ₹{item.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
