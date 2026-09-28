import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('insightflow_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-Refresh Expired Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('insightflow_refresh_token');

      if (refreshToken && !originalRequest.url.includes('/auth/')) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          if (res.status === 200 && res.data.access) {
            const newAccess = res.data.access;
            localStorage.setItem('insightflow_access_token', newAccess);
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // Token expired or invalid
          localStorage.removeItem('insightflow_access_token');
          localStorage.removeItem('insightflow_refresh_token');
          localStorage.removeItem('insightflow_user');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
