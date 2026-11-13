import api from './api';
import { AdjustmentType, ApiResponse, MovementType, PaginatedResponse, StockAdjustment, StockMovement } from '../types';

export interface CreateAdjustmentDto {
  batchId: string;
  type: AdjustmentType;
  quantityChange: number;
  reason: string;
  notes?: string;
}

export interface AdjustmentQueryParams {
  medicineId?: string;
  batchId?: string;
  type?: AdjustmentType;
  page?: number;
  limit?: number;
}

export interface MovementQueryParams {
  medicineId?: string;
  batchId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const adjustmentService = {
  adjustStock: async (dto: CreateAdjustmentDto): Promise<{ adjustment: StockAdjustment; batch: any; medicine: any }> => {
    const res = await api.post<ApiResponse<{ adjustment: StockAdjustment; batch: any; medicine: any }>>('/stock', dto);
    return res.data.data;
  },

  getAdjustments: async (params?: AdjustmentQueryParams): Promise<PaginatedResponse<StockAdjustment>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<StockAdjustment>>>('/stock/adjustments', { params });
    return res.data.data;
  },

  getMovements: async (params?: MovementQueryParams): Promise<PaginatedResponse<StockMovement>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<StockMovement>>>('/stock/movements', { params });
    return res.data.data;
  }
};
