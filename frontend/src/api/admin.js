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

  getPredictiveForecast: async () => {
    const response = await apiClient.get('/admin/predictive-forecast/');
    return response.data;
  },

  getCSATAnalytics: async (days = 90) => {
    const response = await apiClient.get('/admin/csat-analytics/', { params: { days } });
    return response.data;
  },

  downloadCSVExport: async (filters = {}) => {
    const response = await apiClient.get('/admin/export/csv/', {
      params: filters,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : `insightflow_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};


