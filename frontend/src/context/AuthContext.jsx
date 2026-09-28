import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('insightflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('insightflow_access_token');
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('insightflow_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.error('Session expired', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authApi.login(email, password);
      if (res.success && res.data) {
        localStorage.setItem('insightflow_access_token', res.data.access);
        localStorage.setItem('insightflow_refresh_token', res.data.refresh);
        localStorage.setItem('insightflow_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.error?.message || 'Invalid institutional credentials.' };
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Invalid credentials or unable to connect.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('insightflow_refresh_token');
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch (err) {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('insightflow_access_token');
    localStorage.removeItem('insightflow_refresh_token');
    localStorage.removeItem('insightflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
