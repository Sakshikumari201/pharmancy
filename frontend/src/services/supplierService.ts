import api from './api';
import { ApiResponse, Supplier } from '../types';

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  gstin?: string;
}

export const supplierService = {
  getSuppliers: async (search?: string): Promise<Supplier[]> => {
    const res = await api.get<ApiResponse<Supplier[]>>('/suppliers', { params: { search } });
    return res.data.data;
  },

  getSupplierById: async (id: string): Promise<Supplier> => {
    const res = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return res.data.data;
  },

  createSupplier: async (dto: CreateSupplierDto): Promise<Supplier> => {
    const res = await api.post<ApiResponse<Supplier>>('/suppliers', dto);
    return res.data.data;
  },

  updateSupplier: async (id: string, dto: Partial<CreateSupplierDto> & { isActive?: boolean }): Promise<Supplier> => {
    const res = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, dto);
    return res.data.data;
  }
};
