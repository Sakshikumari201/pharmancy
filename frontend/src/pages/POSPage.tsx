import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { medicineService } from '../services/medicineService';
import { batchService } from '../services/batchService';
import { saleService, CreateSaleDto } from '../services/saleService';
import { Medicine, Batch, PaymentMethod, Sale } from '../types';
import { InvoiceModal } from '../components/sales/InvoiceModal';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Pill,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  medicine: Medicine;
  selectedBatch: Batch;
  quantity: number;
  discount: number;
}

export const POSPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search & Medicine state
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(12.0); // 12% GST standard
  const [notes, setNotes] = useState('');

  // Checkout & Invoice State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Initial load of medicines
  useEffect(() => {
    loadMedicines();
  }, [searchQuery]);

  const loadMedicines = async () => {
    setIsSearching(true);
    try {
      const res = await medicineService.getMedicines({
        search: searchQuery,
        limit: 12
      });
      setMedicines(res.items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // When a medicine is clicked, fetch its batches to show FEFO order
  const handleSelectMedicine = async (med: Medicine) => {
    setSelectedMedicine(med);
    setIsLoadingBatches(true);
    try {
      const batches = await batchService.getAvailableForMedicine(med.id);
      setAvailableBatches(batches);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Add batch to cart
  const handleAddToCart = (med: Medicine, batch: Batch) => {
    // Edge case check: Expired or Blocked
    const isExpired = new Date(batch.expiryDate) < new Date();
    if (isExpired || batch.isBlocked) {
      setError(`Safety Block: Batch ${batch.batchNumber} is ${isExpired ? 'EXPIRED' : 'QUARANTINED'}. Re-order or dispose.`);
      return;
    }

    if (batch.quantity <= 0) {
      setError(`Batch ${batch.batchNumber} has no stock remaining.`);
      return;
    }

    setError(null);
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.selectedBatch.id === batch.id);
      if (existingIndex > -1) {
        // Increment quantity if available
        const currentQty = prev[existingIndex].quantity;
        if (currentQty + 1 > batch.quantity) {
          setError(`Cannot exceed available batch stock of ${batch.quantity} units`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            medicine: med,
            selectedBatch: batch,
            quantity: 1,
            discount: 0
          }
        ];
      }
    });
  };

  const updateCartQuantity = (batchId: string, delta: number) => {
    setError(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.selectedBatch.id === batchId) {
            const newQty = item.quantity + delta;
            if (newQty > item.selectedBatch.quantity) {
              setError(`Maximum available in batch ${item.selectedBatch.batchNumber} is ${item.selectedBatch.quantity}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (batchId: string) => {
    setCart((prev) => prev.filter((item) => item.selectedBatch.id !== batchId));
  };

  // Calculation Breakdown
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.selectedBatch.salePrice - item.discount,
    0
  );
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Please add at least one item to the cart');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const dto: CreateSaleDto = {
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      doctorName: doctorName || undefined,
      items: cart.map((item) => ({
        medicineId: item.medicine.id,
        batchId: item.selectedBatch.id,
        quantity: item.quantity,
        discount: item.discount
      })),
      discountPercent,
      taxRate,
      paymentMethod,
      notes: notes || undefined
    };

    try {
      const sale = await saleService.createSale(dto);
      setCompletedSale(sale);
      setIsInvoiceOpen(true);
      // Reset cart and customer info
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDoctorName('');
      setNotes('');
      // Refresh selected medicine batches
      if (selectedMedicine) {
        handleSelectMedicine(selectedMedicine);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-400" />
              High-Speed POS & Invoicing Terminal
            </h1>
            <Badge variant="success" size="sm">
              FEFO Enabled
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time batch allocation, multi-item tax invoice calculations, and immutable stock deduction ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">
            Cashier: {user?.name}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* POS Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Catalogue Search & Batch Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by brand name, generic formula, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Medicines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {isSearching ? (
              <div className="col-span-2 py-10">
                <LoadingSpinner message="Searching medicine catalogue..." />
              </div>
            ) : medicines.length > 0 ? (
              medicines.map((med) => {
                const isSelected = selectedMedicine?.id === med.id;
                const isOutOfStock = med.totalStock <= 0;
                return (
                  <div
                    key={med.id}
                    onClick={() => handleSelectMedicine(med)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-950/40'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-sm leading-tight block">{med.name}</span>
                        {med.genericName && (
                          <span className="text-[11px] text-slate-400 block italic">{med.genericName}</span>
                        )}
                      </div>
                      <Badge variant={isOutOfStock ? 'danger' : 'neutral'} size="sm">
                        {med.totalStock} {med.unit}
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                      <span className="font-mono text-slate-400">{med.sku}</span>
                      <span className="text-emerald-400 font-semibold">{med.dosageForm}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                No medicines found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Batch Selector Drawer for Selected Medicine */}
          {selectedMedicine && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    FEFO Batch Allocation for: {selectedMedicine.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Earliest expiring batch automatically placed first for priority dispensing.
                  </p>
                </div>
                <Badge variant="purple" size="sm">
                  {availableBatches.length} Active Batches
                </Badge>
              </div>

              {isLoadingBatches ? (
                <LoadingSpinner size="sm" message="Loading batch details..." />
              ) : availableBatches.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {availableBatches.map((batch, index) => {
                    const isExpired = new Date(batch.expiryDate) < new Date();
                    const isFEFOFirst = index === 0 && !isExpired && !batch.isBlocked;

                    return (
                      <div
                        key={batch.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isExpired || batch.isBlocked
                            ? 'bg-rose-950/10 border-rose-900/40 opacity-70'
                            : isFEFOFirst
                            ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{batch.batchNumber}</span>
                            {isFEFOFirst && (
                              <Badge variant="success" size="sm" dot>
                                FEFO Priority
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="danger" size="sm">
                                Expired (Blocked)
                              </Badge>
                            )}
                            {batch.isBlocked && !isExpired && (
                              <Badge variant="warning" size="sm">
                                Quarantined
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>
                              Exp:{' '}
                              <strong className="text-slate-300 font-mono">
                                {new Date(batch.expiryDate).toLocaleDateString()}
                              </strong>
                            </span>
                            <span>
                              Available:{' '}
                              <strong className="text-white font-mono">{batch.quantity} units</strong>
                            </span>
                            <span>
                              MRP: <strong className="text-slate-300 font-mono">₹{batch.mrp.toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-emerald-400 font-mono">
                              ₹{batch.salePrice.toFixed(2)}
                            </div>
                            <span className="text-[10px] text-slate-500">per unit</span>
                          </div>
                          <button
                            onClick={() => handleAddToCart(selectedMedicine, batch)}
                            disabled={isExpired || batch.isBlocked || batch.quantity <= 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all hover:scale-105"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Dispense
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  No active batches available for this medicine.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Invoicing Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Itemized Sales Invoice</h3>
                    <p className="text-[11px] text-slate-400">{cart.length} item(s) in active transaction</p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer / Prescription Fields */}
              <div className="space-y-2 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient / Customer</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</label>
                    <input
                      type="text"
                      placeholder="+91-9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prescribing Doctor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. A. K. Sharma (MD)"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => {
                    const lineTotal = item.quantity * item.selectedBatch.salePrice - item.discount;
                    return (
                      <div
                        key={item.selectedBatch.id}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-xs flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{item.medicine.name}</span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            Batch: {item.selectedBatch.batchNumber} (₹{item.selectedBatch.salePrice.toFixed(2)})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Qty Stepper */}
                          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                            <button
                              onClick={() => updateCartQuantity(item.selectedBatch.id, -1)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-bold text-white font-mono px-1">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.selectedBatch.id, 1)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-white w-16 text-right">
                            ₹{lineTotal.toFixed(2)}
                          </span>

                          <button
                            onClick={() => removeFromCart(item.selectedBatch.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Cart is empty. Select a medicine and batch to add.
                  </div>
                )}
              </div>
            </div>

            {/* Calculations & Checkout */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              {/* Payment Method Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'CARD', 'UPI'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === pm
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pm === 'CASH' && <Banknote className="h-3.5 w-3.5" />}
                      {pm === 'CARD' && <CreditCard className="h-3.5 w-3.5" />}
                      {pm === 'UPI' && <Smartphone className="h-3.5 w-3.5" />}
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax & Discount adjustments */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Configured GST Tax %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1 text-xs border-t border-slate-800/80 pt-2 font-medium">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>GST ({taxRate}%):</span>
                  <span className="font-mono text-slate-200">+₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-black text-sm shadow-xl shadow-emerald-950/50 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Processing DB Transaction...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete Sale & Generate Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal Popup upon completion */}
      <InvoiceModal
        sale={completedSale}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};
