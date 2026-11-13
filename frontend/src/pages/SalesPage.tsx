import React, { useState, useEffect, useCallback } from 'react';
import { saleService } from '../services/saleService';
import { Sale, PaginatedResponse, PaginationMeta } from '../types';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { InvoiceModal } from '../components/sales/InvoiceModal';
import {
  ShoppingBag,
  Search,
  Eye,
  Receipt,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
} from 'lucide-react';
import type { BadgeVariant } from '../components/common/Badge';

export const SalesPage: React.FC = () => {
  const [salesData, setSalesData] = useState<PaginatedResponse<Sale> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isLoadingSale, setIsLoadingSale] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const data = await saleService.getSales(params as any);
      setSalesData(data);
    } catch (err) {
      console.error('Failed to load sales', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

  const handleViewInvoice = async (saleId: string) => {
    setIsLoadingSale(true);
    try {
      const sale = await saleService.getSaleById(saleId);
      setSelectedSale(sale);
      setShowInvoice(true);
    } catch (err) {
      console.error('Failed to load sale', err);
    } finally {
      setIsLoadingSale(false);
    }
  };

  const getStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'REFUNDED': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  };

  const items = salesData?.items ?? [];
  const pagination: PaginationMeta | undefined = salesData?.pagination;

  const totalRevenue = items.reduce((sum, s) => {
    return s.status === 'COMPLETED' ? sum + s.grandTotal : sum;
  }, 0);

  const completedCount = items.filter(s => s.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-400" />
            Sales History
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Complete record of all transactions with printable invoices
          </p>
        </div>
        <button
          onClick={fetchSales}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {pagination && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Receipt className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Sales</p>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Completed (page)</p>
              <p className="text-2xl font-bold text-white">{completedCount}</p>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Revenue (page)</p>
              <p className="text-2xl font-bold text-white">₹{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400 font-medium">Filter Sales</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Invoice # or customer name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
        {(dateFrom || dateTo || search) && (
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading sales records..." />
        ) : !items.length ? (
          <EmptyState
            icon={Receipt}
            title="No sales found"
            description={search || dateFrom || dateTo ? 'Try adjusting your filters.' : 'Start a sale from the POS terminal.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Date & Time</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Customer</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Subtotal</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Tax</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Grand Total</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Payment</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Cashier</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-emerald-400 text-xs font-semibold">
                        {sale.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <br />
                      <span className="text-xs text-slate-500">
                        {new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {sale.customerName || <span className="text-slate-500 italic">Walk-in</span>}
                      {sale.customerPhone && (
                        <div className="text-xs text-slate-500">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-right font-mono">
                      ₹{sale.subtotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-right font-mono text-xs">
                      ₹{sale.taxAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-white text-right font-mono font-semibold">
                      ₹{sale.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">
                        {sale.paymentMethod?.replace('_', ' ') ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusColor(sale.status)} size="sm">
                        {sale.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {sale.cashier?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewInvoice(sale.id)}
                        disabled={isLoadingSale}
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors opacity-0 group-hover:opacity-100"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
        />
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        sale={selectedSale}
        isOpen={showInvoice}
        onClose={() => { setShowInvoice(false); setSelectedSale(null); }}
      />
    </div>
  );
};

export default SalesPage;
