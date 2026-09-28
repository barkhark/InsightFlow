import React from 'react';
import { X, CheckCheck, Bell, Clock, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const NotificationDrawer = () => {
  const { isDrawerOpen, toggleDrawer, notifications, loading, markAllAsRead, unreadCount } = useNotifications();
  const { role } = useAuth();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  const handleNotificationClick = (notification) => {
    toggleDrawer();
    if (notification.request_reference) {
      if (role === 'student') {
        navigate('/student/requests');
      } else if (role === 'staff') {
        navigate('/staff/queue');
      } else if (role === 'admin') {
        navigate('/admin/all-requests');
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'REQUEST_RESOLVED':
        return <CheckCircle2 size={16} color="var(--success)" />;
      case 'REQUEST_REJECTED':
        return <XCircle size={16} color="var(--danger)" />;
      case 'SLA_WARNING':
      case 'SLA_BREACH':
        return <AlertTriangle size={16} color="var(--warning)" />;
      default:
        return <FileText size={16} color="var(--primary)" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '90vw',
          height: '100vh',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h3>
            {unreadCount > 0 && (
              <span className="badge badge-primary">{unreadCount} new</span>
            )}
          </div>
          <button
            onClick={toggleDrawer}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Actions */}
        {unreadCount > 0 && (
          <div
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--bg-card-hover)',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={markAllAsRead}
              className="btn btn-secondary btn-sm"
            >
              <CheckCheck size={14} />
              <span>Mark all as read</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No notifications yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                You'll receive updates when request stages or assignments change (auto-refreshes every 60s).
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: n.is_read ? 'var(--bg-primary)' : 'var(--primary-glow)',
                    border: n.is_read
                      ? '1px solid var(--border-glass)'
                      : '1.5px solid rgba(79, 70, 229, 0.35)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon(n.notification_type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {n.title}
                      </div>
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.25rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginTop: '0.5rem',
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={12} />
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.request_reference && (
                          <code style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--bg-card)',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border-glass)',
                          }}>
                            {n.request_reference}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
