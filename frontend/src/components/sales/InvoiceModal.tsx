import React from 'react';
import { Modal } from '../common/Modal';
import { Sale } from '../../types';
import { Printer, CheckCircle, FileText, Pill } from 'lucide-react';
import { Badge } from '../common/Badge';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, isOpen, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tax Invoice & Sales Receipt"
      subtitle={`Invoice #${sale.invoiceNumber}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full no-print">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>Inventory deducted atomically & movements recorded</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="print-area bg-white text-slate-900 p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        {/* Header Branding */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">PharmaPulse Healthcare Ltd.</h2>
              <p className="text-xs text-slate-500">Retail & Clinical Pharmacy Dispensing</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">GSTIN: 27AABCP1234F1Z1 | DL: MH-TZ4-892341</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
              TAX INVOICE
            </span>
            <div className="text-sm font-black text-slate-800 mt-1 font-mono">{sale.invoiceNumber}</div>
            <div className="text-xs text-slate-500">{formatDate(sale.createdAt)}</div>
          </div>
        </div>

        {/* Customer & Prescription Details */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Patient / Customer</span>
            <div className="font-bold text-slate-800 text-sm">{sale.customerName || 'Cash Sale / Walk-in'}</div>
            {sale.customerPhone && <div className="text-slate-600 font-mono">{sale.customerPhone}</div>}
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Prescription & Staff</span>
            <div className="font-medium text-slate-700">Doctor: <span className="font-bold text-slate-900">{sale.doctorName || 'Over The Counter'}</span></div>
            <div className="text-slate-500">Cashier: <span className="font-semibold text-slate-700">{sale.cashier?.name || 'Authorized Staff'}</span></div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2">Item Description</th>
                <th className="py-2">Batch #</th>
                <th className="py-2">Exp</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Disc</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sale.items.map((item, index) => (
                <tr key={item.id || index} className="text-slate-800">
                  <td className="py-2 font-bold text-slate-900">
                    {item.medicine?.name || 'Medicine'}
                    <span className="block text-[10px] font-normal text-slate-500">
                      {item.medicine?.dosageForm} | {item.medicine?.strength}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-slate-700">
                    {item.batch?.batchNumber || 'FEFO-AUTO'}
                  </td>
                  <td className="py-2 font-mono text-[11px] text-slate-600">
                    {item.batch?.expiryDate
                      ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })
                      : 'N/A'}
                  </td>
                  <td className="py-2 text-right font-bold">{item.quantity}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right text-slate-500">{formatCurrency(item.discount)}</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Breakdown */}
        <div className="border-t border-slate-300 pt-3 flex justify-between items-start">
          <div className="text-xs space-y-1">
            <div className="font-semibold text-slate-700">
              Payment Method:{' '}
              <span className="font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {sale.paymentMethod}
              </span>
            </div>
            {sale.notes && <div className="text-slate-500 italic max-w-xs text-[11px]">Note: {sale.notes}</div>}
          </div>

          <div className="w-56 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount ({sale.discountPercent}%):</span>
                <span className="font-mono">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST ({sale.taxRate}%):</span>
              <span className="font-mono">+{formatCurrency(sale.taxAmount)}</span>
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between font-black text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono">{formatCurrency(sale.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Safety Notice */}
        <div className="border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-400 text-center space-y-0.5">
          <p className="font-semibold text-slate-500">
            Dispensed strictly under registered pharmacist supervision.
          </p>
          <p>This software simulation is designed for Algions AI Labs assessment evaluation. Fictional products only.</p>
        </div>
      </div>
    </Modal>
  );
};
