import apiClient from './client';

export const notificationsApi = {
  getNotifications: async () => {
    const response = await apiClient.get('/notifications/');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/count/');
    return response.data;
  },

  markAsRead: async (ids = 'all') => {
    const response = await apiClient.post('/notifications/mark-read/', { ids });
    return response.data;
  },

  getDispatchLogs: async () => {
    const response = await apiClient.get('/notifications/dispatch-logs/');
    return response.data;
  },
};

