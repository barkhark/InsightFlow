import apiClient from './client';

export const authApi = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login/', { email, password });
    return response.data;
  },
  
  logout: async (refreshToken) => {
    const response = await apiClient.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },
};
