import React from 'react';
import { Bell, LogOut, BarChart2, Sun, Moon, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

const ROLE_META = {
  student: { label: 'Student Portal',        color: '#1a4a8a' },
  staff:   { label: 'Staff Workspace',        color: '#0d6e63' },
  admin:   { label: 'Administrator',          color: '#c0392b' },
};

export const Navbar = () => {
  const { user, logout }             = useAuth();
  const { unreadCount, toggleDrawer } = useNotifications();
  const { isDark, toggleTheme }       = useTheme();

  const roleMeta = ROLE_META[user?.role] || ROLE_META.student;
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header style={{
      height: 'var(--navbar-h)',
      background: 'var(--bg-navbar)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>

      {/* ── Brand ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BarChart2 size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            INSIGHTFLOW
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em', marginTop: '-1px' }}>
            Intelligent Workflow Analytics &amp; Accountability Platform
          </div>
        </div>
      </div>

      {/* ── Right Controls ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
        >
          {isDark ? <Sun size={15} color="#f0a030" /> : <Moon size={15} color="var(--primary)" />}
        </button>

        {/* Django Admin (admin only) */}
        {user?.role === 'admin' && (
          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            title="Django Administration Panel"
            style={{
              width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', transition: 'all var(--transition-fast)',
            }}
          >
            <ExternalLink size={14} />
          </a>
        )}

        {/* Notification Bell */}
        <button
          onClick={toggleDrawer}
          title="Notifications"
          style={{
            position: 'relative', width: '34px', height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--danger)', color: '#ffffff',
              fontSize: '0.6rem', fontWeight: 800,
              minWidth: '17px', height: '17px', borderRadius: '999px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', border: '2px solid var(--bg-card)',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile Pill */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)',
            padding: '0.3rem 0.875rem 0.3rem 0.4rem',
            borderRadius: '999px', boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 800, color: '#ffffff', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>
                {user.full_name?.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: roleMeta.color, lineHeight: 1 }}>
                {roleMeta.label}
                {user.profile?.department_name ? ` · ${user.profile.department_name}` : ''}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '4px',
                marginLeft: '0.2rem', borderRadius: 'var(--radius-xs)',
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
