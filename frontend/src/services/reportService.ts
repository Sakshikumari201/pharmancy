import api from './api';
import {
  ApiResponse,
  DashboardMetrics,
  ExpiryReportData,
  ReconciliationData,
  SalesReportData,
  StockValuationData
} from '../types';

export const reportService = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const res = await api.get<ApiResponse<DashboardMetrics>>('/reports/dashboard');
    return res.data.data;
  },

  getSalesReport: async (startDate?: string, endDate?: string): Promise<SalesReportData> => {
    const res = await api.get<ApiResponse<SalesReportData>>('/reports/sales', {
      params: { startDate, endDate }
    });
    return res.data.data;
  },

  getStockValuationReport: async (): Promise<StockValuationData> => {
    const res = await api.get<ApiResponse<StockValuationData>>('/reports/valuation');
    return res.data.data;
  },

  getExpiryReport: async (): Promise<ExpiryReportData> => {
    const res = await api.get<ApiResponse<ExpiryReportData>>('/reports/expiry');
    return res.data.data;
  },

  getReconciliationReport: async (params?: {
    medicineId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReconciliationData> => {
    const res = await api.get<ApiResponse<ReconciliationData>>('/reports/reconciliation', { params });
    return res.data.data;
  }
};
