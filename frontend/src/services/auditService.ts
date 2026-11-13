import api from './api';
import { ApiResponse, AuditLog, PaginatedResponse } from '../types';

export interface AuditQueryParams {
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export const auditService = {
  getAuditLogs: async (params?: AuditQueryParams): Promise<PaginatedResponse<AuditLog>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit', { params });
    return res.data.data;
  }
};
