import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Inbox, PlusCircle, BarChart3, Activity,
  AlertTriangle, FileSpreadsheet, Settings, ExternalLink, ChevronRight,
  TrendingUp, Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const sidebarLinkStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.625rem 0.875rem',
  borderRadius: '6px',
  fontSize: '0.855rem',
  fontWeight: isActive ? 700 : 500,
  color: isActive ? '#ffffff' : 'rgba(200,218,240,0.75)',
  background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
  border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
  textDecoration: 'none',
  transition: 'all 120ms ease',
  cursor: 'pointer',
});

export const Sidebar = () => {
  const { user, role } = useAuth();

  const getNavLinks = () => {
    if (role === 'student') return [
      { to: '/student/requests',    label: 'My Requests',      icon: Inbox,          iconColor: '#80aad8' },
      { to: '/student/new-request', label: 'Raise New Request', icon: PlusCircle,     iconColor: '#80c8c0' },
    ];
    if (role === 'staff') return [
      { to: '/staff/queue', label: `${user?.profile?.department_name || 'Department'} Queue`, icon: Inbox, iconColor: '#80aad8' },
    ];
    if (role === 'admin') return [
      { to: '/admin/dashboard',         label: 'Executive KPIs',       icon: BarChart3,       iconColor: '#80aad8' },
      { to: '/admin/department-health', label: 'Department Health',    icon: Activity,        iconColor: '#80c8c0' },
      { to: '/admin/bottlenecks',       label: 'Bottleneck Analysis',  icon: AlertTriangle,   iconColor: '#f0c87a' },
      { to: '/admin/trends',            label: 'Trends & Volume',      icon: TrendingUp,      iconColor: '#a8e0b0' },
      { to: '/admin/all-requests',      label: 'All Requests Ledger',  icon: FileSpreadsheet, iconColor: '#a8b8d8' },
      { to: '/admin/reports',           label: 'Reports & Export',     icon: Download,        iconColor: '#c4a0e8' },
    ];
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minHeight: 'calc(100vh - var(--navbar-h))',
      background: '#1e2d45',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      padding: '1.5rem 0.875rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
    }}>
      <div>
        {/* Section label */}
        <div style={{
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(160,190,220,0.50)',
          letterSpacing: '0.09em', textTransform: 'uppercase',
          padding: '0 0.5rem 0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          marginBottom: '0.75rem',
        }}>
          {role === 'student' ? 'Student Portal'
           : role === 'staff' ? 'Staff Workspace'
           : 'Admin Console'}
        </div>

        {/* Nav Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => sidebarLinkStyle(isActive)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <Icon size={16} color={item.iconColor} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={13} style={{ opacity: 0.35 }} />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Admin Django Config */}
      {role === 'admin' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...sidebarLinkStyle(false),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <Settings size={16} color="rgba(160,190,220,0.60)" />
              <span style={{ fontSize: '0.83rem', color: 'rgba(180,205,235,0.65)' }}>Django Admin</span>
            </div>
            <ExternalLink size={13} style={{ opacity: 0.40, color: 'rgba(180,210,240,0.6)' }} />
          </a>
        </div>
      )}
    </aside>
  );
};
