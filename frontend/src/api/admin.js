import apiClient from './client';

export const adminApi = {
  getDashboardKpis: async () => {
    const response = await apiClient.get('/admin/dashboard/');
    return response.data;
  },

  getDepartmentHealth: async (days = 30) => {
    const response = await apiClient.get('/admin/department-health/', { params: { days } });
    return response.data;
  },

  getBottlenecks: async (days = 30) => {
    const response = await apiClient.get('/admin/bottlenecks/', { params: { days } });
    return response.data;
  },

  getTrends: async (days = 30) => {
    const response = await apiClient.get('/admin/trends/', { params: { days } });
    return response.data;
  },

  getAllRequests: async (filters = {}) => {
    const response = await apiClient.get('/admin/requests/', { params: filters });
    return response.data;
  },

  getInsights: async (days = 30) => {
    const response = await apiClient.get('/admin/insights/', { params: { days } });
    return response.data;
  },
};
