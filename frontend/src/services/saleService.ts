import api from './api';
import { ApiResponse, PaginatedResponse, PaymentMethod, Sale } from '../types';

export interface CreateSaleItemDto {
  medicineId: string;
  batchId?: string; // Optional: auto-selected by FEFO if omitted
  quantity: number;
  discount?: number;
}

export interface CreateSaleDto {
  customerName?: string;
  customerPhone?: string;
  doctorName?: string;
  items: CreateSaleItemDto[];
  discountPercent?: number;
  taxRate?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface SaleQueryParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  cashierId?: string;
  page?: number;
  limit?: number;
}

export const saleService = {
  createSale: async (dto: CreateSaleDto): Promise<Sale> => {
    const res = await api.post<ApiResponse<Sale>>('/sales', dto);
    return res.data.data;
  },

  getSales: async (params?: SaleQueryParams): Promise<PaginatedResponse<Sale>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Sale>>>('/sales', { params });
    return res.data.data;
  },

  getSaleById: async (id: string): Promise<Sale> => {
    const res = await api.get<ApiResponse<Sale>>(`/sales/${id}`);
    return res.data.data;
  }
};
