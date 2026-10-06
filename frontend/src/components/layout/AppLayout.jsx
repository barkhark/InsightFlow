import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { NotificationDrawer } from './NotificationDrawer';
import { AIHelpWidget } from '../common/AIHelpWidget';
import { useAuth } from '../../context/AuthContext';

export const AppLayout = () => {
  const { role } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
      <NotificationDrawer />
      {/* AI Help Widget — only shown to students */}
      {role === 'student' && <AIHelpWidget />}
    </div>
  );
};
