import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Database, Bell, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';

export const MultiChannelDispatchModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getDispatchLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load dispatch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 45, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-glass, #dde4ed)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle, #e8edf2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(26, 74, 138, 0.04), rgba(13, 110, 99, 0.04))',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary, #0d1f35)' }}>
              Multi-Channel Alert Dispatch Center
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #5a7088)' }}>
              Simulated real-time dispatch across In-App, Campus Email Relay, SMS, and University SIS
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={fetchLogs}
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Channel Badges Summary */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--bg-card-subtle, #f8fafc)',
            borderBottom: '1px solid var(--border-subtle, #e8edf2)',
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          {[
            { id: 'all', label: 'All Dispatches' },
            { id: 'email', label: 'Email Relay' },
            { id: 'sms', label: 'SMS Gateway' },
            { id: 'erp', label: 'SIS Sync' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: filter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                backgroundColor: filter === tab.id ? 'var(--primary-soft, #e8f0fb)' : 'transparent',
                color: filter === tab.id ? 'var(--primary, #1a4a8a)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Logs List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading dispatch logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notification dispatches found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {logs.map((log) => {
                const channels = log.delivery_channels || {};
                const emailInfo = channels.email;
                const smsInfo = channels.sms;
                const erpInfo = channels.erp_sync;

                return (
                  <div
                    key={log.id}
                    style={{
                      border: '1px solid var(--border-glass, #dde4ed)',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {log.title}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {log.message}
                    </p>

                    {/* Channel delivery details */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.5rem',
                        fontSize: '0.72rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-card-subtle, #f8fafc)',
                        borderRadius: '6px',
                      }}
                    >
                      {/* Email */}
                      {(filter === 'all' || filter === 'email') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={13} color="#1a4a8a" />
                          <span>
                            <strong>Email:</strong> {emailInfo?.recipient || log.recipient_email}
                          </span>
                          <CheckCircle2 size={11} color="#1a7a4a" />
                        </div>
                      )}

                      {/* SMS */}
                      {(filter === 'all' || filter === 'sms') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MessageSquare size={13} color="#0d6e63" />
                          <span>
                            <strong>SMS:</strong> {smsInfo?.phone || '+91 98200 12345'}
                          </span>
                          <CheckCircle2 size={11} color="#1a7a4a" />
                        </div>
                      )}

                      {/* SIS Sync */}
                      {(filter === 'all' || filter === 'erp') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Database size={13} color="#b8680a" />
                          <span>
                            <strong>SIS:</strong> Synced Event
                          </span>
                          <CheckCircle2 size={11} color="#1a7a4a" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
