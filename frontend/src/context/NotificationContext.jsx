import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      // Background poll silently fails
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        if (res.meta) {
          setUnreadCount(res.meta.unread_count);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Architectural Decision Q3: 60-second background polling
  useEffect(() => {
    if (!user) return;

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // 60s
    return () => clearInterval(interval);
  }, [user, fetchCount]);

  const toggleDrawer = () => {
    const nextState = !isDrawerOpen;
    setIsDrawerOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAsRead('all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isDrawerOpen,
        loading,
        toggleDrawer,
        fetchNotifications,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
