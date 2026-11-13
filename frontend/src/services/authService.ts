import api from './api';
import { ApiResponse, User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return res.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  listUsers: async (): Promise<User[]> => {
    const res = await api.get<ApiResponse<User[]>>('/auth/users');
    return res.data.data;
  },

  registerUser: async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }): Promise<User> => {
    const res = await api.post<ApiResponse<User>>('/auth/users', data);
    return res.data.data;
  },

  toggleUserStatus: async (userId: string): Promise<User> => {
    const res = await api.patch<ApiResponse<User>>(`/auth/users/${userId}/toggle-status`);
    return res.data.data;
  }
};
