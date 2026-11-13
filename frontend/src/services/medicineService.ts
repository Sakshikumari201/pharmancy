import api from './api';
import { ApiResponse, Category, Medicine, PaginatedResponse } from '../types';

export interface MedicineQueryParams {
  search?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  prescription?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateMedicineDto {
  name: string;
  genericName?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  description?: string;
  dosageForm: string;
  strength?: string;
  unit?: string;
  minStockLevel?: number;
  requiresPrescription?: boolean;
  location?: string;
}

export const medicineService = {
  getMedicines: async (params?: MedicineQueryParams): Promise<PaginatedResponse<Medicine>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Medicine>>>('/medicines', { params });
    return res.data.data;
  },

  getMedicineById: async (id: string): Promise<Medicine> => {
    const res = await api.get<ApiResponse<Medicine>>(`/medicines/${id}`);
    return res.data.data;
  },

  createMedicine: async (dto: CreateMedicineDto): Promise<Medicine> => {
    const res = await api.post<ApiResponse<Medicine>>('/medicines', dto);
    return res.data.data;
  },

  updateMedicine: async (id: string, dto: Partial<CreateMedicineDto> & { isActive?: boolean }): Promise<Medicine> => {
    const res = await api.put<ApiResponse<Medicine>>(`/medicines/${id}`, dto);
    return res.data.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/medicines/categories');
    return res.data.data;
  },

  createCategory: async (name: string, description?: string): Promise<Category> => {
    const res = await api.post<ApiResponse<Category>>('/medicines/categories', { name, description });
    return res.data.data;
  }
};
