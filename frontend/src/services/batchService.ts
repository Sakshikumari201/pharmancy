import api from './api';
import { ApiResponse, Batch } from '../types';

export interface BatchQueryParams {
  medicineId?: string;
  status?: 'active' | 'expired' | 'near_expiry' | 'blocked';
  search?: string;
}

export const batchService = {
  getBatches: async (params?: BatchQueryParams): Promise<Batch[]> => {
    const res = await api.get<ApiResponse<Batch[]>>('/batches', { params });
    return res.data.data;
  },

  getAvailableForMedicine: async (medicineId: string): Promise<Batch[]> => {
    const res = await api.get<ApiResponse<Batch[]>>(`/batches/medicine/${medicineId}/available`);
    return res.data.data;
  },

  toggleBatchBlock: async (batchId: string, reason?: string): Promise<Batch> => {
    const res = await api.patch<ApiResponse<Batch>>(`/batches/${batchId}/toggle-block`, { reason });
    return res.data.data;
  }
};
