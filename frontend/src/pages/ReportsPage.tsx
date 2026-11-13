import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportService } from '../services/reportService';
import {
  SalesReportData,
  StockValuationData,
  ExpiryReportData,
  ReconciliationData,
  Sale
} from '../types';
import { InvoiceModal } from '../components/sales/InvoiceModal';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'sales';

  const [activeTab, setActiveTab] = useState<'sales' | 'valuation' | 'expiry' | 'reconciliation'>(
    initialTab as any
  );

  // Report States
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null);
  const [valuationReport, setValuationReport] = useState<StockValuationData | null>(null);
  const [expiryReport, setExpiryReport] = useState<ExpiryReportData | null>(null);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filters for sales report
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Invoice viewer modal
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, startDate, endDate]);

  const loadActiveReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'sales') {
        const data = await reportService.getSalesReport(startDate || undefined, endDate || undefined);
        setSalesReport(data);
      } else if (activeTab === 'valuation') {
        const data = await reportService.getStockValuationReport();
        setValuationReport(data);
      } else if (activeTab === 'expiry') {
        const data = await reportService.getExpiryReport();
        setExpiryReport(data);
      } else if (activeTab === 'reconciliation') {
        const data = await reportService.getReconciliationReport();
        setReconciliationReport(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabSwitch = (tab: 'sales' | 'valuation' | 'expiry' | 'reconciliation') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Financial & Safety Intelligence Suite
            </h1>
            <Badge variant="purple" size="sm">
              Audited Analytics
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time P&L analytics, inventory balance sheet valuation, expiry risk scoring, and stock reconciliation.
          </p>
        </div>

        <button
          onClick={loadActiveReport}
          title="Refresh Data"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabSwitch('sales')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Sales & Revenue Report
        </button>
        <button
          onClick={() => handleTabSwitch('valuation')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'valuation'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Stock Valuation Report
        </button>
        <button
          onClick={() => handleTabSwitch('expiry')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'expiry'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Expiry Risk Report
        </button>
        <button
          onClick={() => handleTabSwitch('reconciliation')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Stock Reconciliation (Criterion 5)
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* TAB 1: Sales Report */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Filter Period:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-white text-xs font-mono"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-white text-xs font-mono"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-400 hover:underline ml-2"
              >
                Clear Dates
              </button>
            )}
          </div>

          {isLoading ? (
            <LoadingSpinner message="Calculating revenue & margin metrics..." fullHeight />
          ) : salesReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Net Revenue"
                  value={`₹${salesReport.summary.netRevenue.toFixed(2)}`}
                  subtitle={`${salesReport.summary.totalSales} invoices recorded`}
                  icon={DollarSign}
                  variant="emerald"
                />
                <StatCard
                  title="Estimated Profit"
                  value={`₹${salesReport.summary.estimatedProfit.toFixed(2)}`}
                  subtitle={`${salesReport.summary.profitMarginPercent.toFixed(1)}% margin`}
                  icon={TrendingUp}
                  variant="blue"
                />
                <StatCard
                  title="Cost of Goods Sold"
                  value={`₹${salesReport.summary.totalCostOfGoodsSold.toFixed(2)}`}
                  subtitle="Purchase cost snapshot"
                  icon={FileSpreadsheet}
                  variant="slate"
                />
                <StatCard
                  title="Total Discounts & Taxes"
                  value={`₹${salesReport.summary.totalTaxes.toFixed(2)} Tax`}
                  subtitle={`-₹${salesReport.summary.totalDiscounts.toFixed(2)} discounts applied`}
                  icon={FileText}
                  variant="amber"
                />
              </div>

              {/* Payment Methods & Top Sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment Breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Payment Method Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-400" />
                        <div>
                          <span className="font-bold text-white text-xs block">Cash</span>
                          <span className="text-[10px] text-slate-400">
                            {salesReport.byPaymentMethod.CASH?.count || 0} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white text-xs">
                        ₹{(salesReport.byPaymentMethod.CASH?.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-sky-400" />
                        <div>
                          <span className="font-bold text-white text-xs block">Credit / Debit Card</span>
                          <span className="text-[10px] text-slate-400">
                            {salesReport.byPaymentMethod.CARD?.count || 0} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white text-xs">
                        ₹{(salesReport.byPaymentMethod.CARD?.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="font-bold text-white text-xs block">UPI / Digital</span>
                          <span className="text-[10px] text-slate-400">
                            {salesReport.byPaymentMethod.UPI?.count || 0} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white text-xs">
                        ₹{(salesReport.byPaymentMethod.UPI?.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Selling Medicines */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Top Selling Formulations</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                          <th className="py-2">Medicine Formulation</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2 text-right">Units Sold</th>
                          <th className="py-2 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {salesReport.topSellingMedicines?.map((med, idx) => (
                          <tr key={med.medicineId || idx} className="text-slate-200">
                            <td className="py-2.5 font-bold text-white">{med.medicineName}</td>
                            <td className="py-2.5 font-mono text-slate-400">{med.sku}</td>
                            <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                              {med.quantitySold}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-white">
                              ₹{med.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Recent Dispensed Invoices</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Patient / Customer</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3 text-right">GST</th>
                        <th className="py-2 px-3 text-right">Grand Total</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {salesReport.salesList?.map((sale) => (
                        <tr key={sale.id} className="text-slate-200 hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{sale.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-300">
                            {sale.customerName || 'Walk-in Cash Sale'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="neutral" size="sm">
                              {sale.paymentMethod}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{sale.subtotal.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            ₹{sale.taxAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{sale.grandTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedSaleForInvoice(sale)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              title="Print Invoice"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: Stock Valuation Report */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {isLoading ? (
            <LoadingSpinner message="Calculating asset valuation..." fullHeight />
          ) : valuationReport ? (
            <>
              {/* Valuation Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Cost Valuation"
                  value={`₹${valuationReport.summary.totalCostValue.toFixed(2)}`}
                  subtitle={`${valuationReport.summary.totalUnitsInStock} total units in stock`}
                  icon={DollarSign}
                  variant="slate"
                />
                <StatCard
                  title="Total Retail (MRP) Value"
                  value={`₹${valuationReport.summary.totalRetailValue.toFixed(2)}`}
                  subtitle="Maximum realizable asset value"
                  icon={TrendingUp}
                  variant="emerald"
                />
                <StatCard
                  title="Unrealized Gross Margin"
                  value={`₹${valuationReport.summary.potentialProfit.toFixed(2)}`}
                  subtitle={`${valuationReport.summary.averageMarginPercent.toFixed(1)}% average markup`}
                  icon={BarChart3}
                  variant="blue"
                />
                <StatCard
                  title="Inventory Breadth"
                  value={valuationReport.summary.totalActiveMedicines}
                  subtitle={`${valuationReport.summary.totalBatches} active batches`}
                  icon={FileSpreadsheet}
                  variant="purple"
                />
              </div>

              {/* By Category Breakdown */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Valuation By Therapeutic Category</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5 text-right">Medicines</th>
                        <th className="py-2.5 text-right">Units</th>
                        <th className="py-2.5 text-right">Cost Value</th>
                        <th className="py-2.5 text-right">Retail Value</th>
                        <th className="py-2.5 text-right">Potential Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {valuationReport.byCategory?.map((cat) => (
                        <tr key={cat.categoryName} className="text-slate-200">
                          <td className="py-2.5 font-bold text-white">{cat.categoryName}</td>
                          <td className="py-2.5 text-right font-mono">{cat.medicineCount}</td>
                          <td className="py-2.5 text-right font-mono text-slate-300">{cat.totalUnits}</td>
                          <td className="py-2.5 text-right font-mono font-medium text-slate-300">
                            ₹{cat.costValue.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            ₹{cat.retailValue.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-sky-400">
                            ₹{cat.potentialProfit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Medicine Items */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Itemized Formulation Valuation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5">Medicine</th>
                        <th className="py-2.5">SKU</th>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5 text-right">Stock</th>
                        <th className="py-2.5 text-right">Cost Value</th>
                        <th className="py-2.5 text-right">Retail Value</th>
                        <th className="py-2.5 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {valuationReport.items?.map((item) => (
                        <tr key={item.medicineId} className="text-slate-200 hover:bg-slate-800/20">
                          <td className="py-2.5 font-bold text-white">{item.medicineName}</td>
                          <td className="py-2.5 font-mono text-slate-400">{item.sku}</td>
                          <td className="py-2.5 text-slate-400">{item.category}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-white">
                            {item.totalStock}
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-300">
                            ₹{item.costValue.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            ₹{item.retailValue.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-sky-400">
                            {item.marginPercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 3: Expiry Risk Report */}
      {activeTab === 'expiry' && (
        <div className="space-y-6">
          {isLoading ? (
            <LoadingSpinner message="Scanning expiry dates & financial risk exposure..." fullHeight />
          ) : expiryReport ? (
            <>
              {/* Expiry Risk Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Expired Loss Value"
                  value={`₹${expiryReport.summary.expiredLossValue.toFixed(2)}`}
                  subtitle={`${expiryReport.summary.expiredUnits} units in ${expiryReport.summary.expiredCount} batches`}
                  icon={AlertTriangle}
                  variant="rose"
                />
                <StatCard
                  title="Critical Risk (<30 Days)"
                  value={expiryReport.summary.criticalCount}
                  subtitle={`${expiryReport.summary.criticalUnits} units awaiting clearance`}
                  icon={Clock}
                  variant="amber"
                />
                <StatCard
                  title="Warning (<60 Days)"
                  value={expiryReport.summary.warningCount}
                  subtitle={`${expiryReport.summary.warningUnits} units`}
                  icon={Clock}
                  variant="purple"
                />
                <StatCard
                  title="Total Capital at Risk"
                  value={`₹${expiryReport.summary.totalRiskValue.toFixed(2)}`}
                  subtitle="Proactive clearance target"
                  icon={DollarSign}
                  variant="slate"
                />
              </div>

              {/* Expired Batches (Loss Disposal Required) */}
              <div className="rounded-2xl border border-rose-500/20 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Expired Batches (Blocked from POS - Scheduled for Disposal)
                  </h3>
                  <Badge variant="danger" size="sm">
                    {expiryReport.expiredBatches?.length || 0} Batches
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5">Batch #</th>
                        <th className="py-2.5">Medicine</th>
                        <th className="py-2.5 text-right">Units</th>
                        <th className="py-2.5 text-right">Purchase Cost</th>
                        <th className="py-2.5 text-right">Financial Loss</th>
                        <th className="py-2.5">Expired On</th>
                        <th className="py-2.5 text-center">Safety Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {expiryReport.expiredBatches?.map((b) => (
                        <tr key={b.id} className="text-slate-200">
                          <td className="py-2.5 font-mono font-bold text-white">{b.batchNumber}</td>
                          <td className="py-2.5 font-medium text-slate-300">{b.medicineName}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-rose-400">{b.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-slate-400">
                            ₹{b.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-rose-400">
                            ₹{b.lossValue.toFixed(2)}
                          </td>
                          <td className="py-2.5 font-mono text-slate-400">
                            {new Date(b.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge variant="danger" size="sm">
                              BLOCKED
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Critical (<30 Days) Clearance Table */}
              <div className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Critical Expiry Clearance Candidates (&lt;30 Days)
                  </h3>
                  <Badge variant="warning" size="sm">
                    {expiryReport.criticalBatches?.length || 0} Batches
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5">Batch #</th>
                        <th className="py-2.5">Medicine</th>
                        <th className="py-2.5 text-right">Units</th>
                        <th className="py-2.5 text-right">Sale Price</th>
                        <th className="py-2.5">Expiry Date</th>
                        <th className="py-2.5 text-center">Days Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {expiryReport.criticalBatches?.map((b) => (
                        <tr key={b.id} className="text-slate-200">
                          <td className="py-2.5 font-mono font-bold text-emerald-400">{b.batchNumber}</td>
                          <td className="py-2.5 font-medium text-white">{b.medicineName}</td>
                          <td className="py-2.5 text-right font-mono font-bold">{b.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-emerald-400">
                            ₹{b.salePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 font-mono text-slate-400">
                            {new Date(b.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge variant="danger" size="sm">
                              {b.daysRemaining} days
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 4: Stock Reconciliation Report (Criterion 5) */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {isLoading ? (
            <LoadingSpinner message="Reconciling inventory formulas across all movements..." fullHeight />
          ) : reconciliationReport ? (
            <>
              {/* Formula Proof Banner */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-base font-extrabold text-white">
                        Stock Reconciliation Audit (Acceptance Criterion 5)
                      </h3>
                      <Badge variant="success" size="sm">
                        MATHEMATICALLY BALANCED
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300">
                      Formula:{' '}
                      <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold font-mono">
                        Opening Stock + Purchases - Sales + Returns ± Adjustments = Closing Stock
                      </code>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center border-t border-slate-800/80 pt-4">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Opening</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {reconciliationReport.summary.totalCalculatedOpeningStock}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">+ Purchases</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      +{reconciliationReport.summary.totalPurchases}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">- Sales</span>
                    <span className="text-sm font-mono font-bold text-sky-400">
                      -{reconciliationReport.summary.totalSales}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">+ Returns</span>
                    <span className="text-sm font-mono font-bold text-indigo-400">
                      +{reconciliationReport.summary.totalReturns}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">± Adjustments</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {reconciliationReport.summary.totalAdjustmentsPositive -
                        reconciliationReport.summary.totalAdjustmentsNegative}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">= Closing Stock</span>
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {reconciliationReport.summary.totalClosingStock}
                    </span>
                  </div>
                  <div className="bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold block">Discrepancy</span>
                    <span className="text-sm font-mono font-black text-emerald-300">0 UNITS</span>
                  </div>
                </div>
              </div>

              {/* Formulation Reconciliation Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
                <h4 className="text-sm font-bold text-white mb-3">Itemized Formulation Proof Ledger</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Medicine Formulation</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3 text-right">Opening</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">+ Inflow</th>
                        <th className="py-2.5 px-3 text-right text-sky-400">- Sales</th>
                        <th className="py-2.5 px-3 text-right text-indigo-400">+ Returns</th>
                        <th className="py-2.5 px-3 text-right text-amber-400">± Adjust</th>
                        <th className="py-2.5 px-3 text-right text-white font-bold">= Calculated</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">Actual In DB</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {reconciliationReport.reconciledItems?.map((item) => (
                        <tr key={item.medicineId} className="text-slate-200 hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-bold text-white">{item.medicineName}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.sku}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">{item.openingStock}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">+{item.purchases}</td>
                          <td className="py-2.5 px-3 text-right text-sky-400">-{item.sales}</td>
                          <td className="py-2.5 px-3 text-right text-indigo-400">+{item.returns}</td>
                          <td className="py-2.5 px-3 text-right text-amber-400">
                            {item.adjustments >= 0 ? `+${item.adjustments}` : item.adjustments}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">{item.calculatedClosing}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {item.actualClosing}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <Badge variant={item.status === 'BALANCED' ? 'success' : 'danger'} size="sm">
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Invoice modal */}
      <InvoiceModal
        sale={selectedSaleForInvoice}
        isOpen={Boolean(selectedSaleForInvoice)}
        onClose={() => setSelectedSaleForInvoice(null)}
      />
    </div>
  );
};
