import api from './api';
import { ApiResponse, PaginatedResponse, Purchase } from '../types';

export interface CreatePurchaseItemDto {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  expiryDate: string;
  rackLocation?: string;
}

export interface CreatePurchaseDto {
  supplierId: string;
  invoiceNumber: string;
  items: CreatePurchaseItemDto[];
  taxAmount?: number;
  notes?: string;
}

export interface PurchaseQueryParams {
  search?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

export const purchaseService = {
  createPurchase: async (dto: CreatePurchaseDto): Promise<Purchase> => {
    const res = await api.post<ApiResponse<Purchase>>('/purchases', dto);
    return res.data.data;
  },

  getPurchases: async (params?: PurchaseQueryParams): Promise<PaginatedResponse<Purchase>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Purchase>>>('/purchases', { params });
    return res.data.data;
  },

  getPurchaseById: async (id: string): Promise<Purchase> => {
    const res = await api.get<ApiResponse<Purchase>>(`/purchases/${id}`);
    return res.data.data;
  }
};
