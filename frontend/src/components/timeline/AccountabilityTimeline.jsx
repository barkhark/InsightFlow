import React from 'react';
import {
  FileText,
  User,
  ArrowRightCircle,
  XCircle,
  MessageSquare,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export const AccountabilityTimeline = ({ auditRecords = [] }) => {
  if (!auditRecords || auditRecords.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No timeline records found.
      </div>
    );
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'REQUEST_CREATED':
      case 'created':
        return <FileText size={15} color="var(--primary)" />;
      case 'STAGE_TRANSITION':
      case 'transitioned':
        return <ArrowRightCircle size={15} color="var(--secondary)" />;
      case 'STAGE_REJECTED':
      case 'rejected':
        return <XCircle size={15} color="var(--danger)" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={15} color="var(--accent)" />;
      case 'ATTACHMENT_UPLOADED':
        return <Paperclip size={15} color="var(--success)" />;
      case 'REASSIGNMENT':
      case 'assigned':
        return <User size={15} color="var(--warning)" />;
      case 'SLA_BREACHED':
        return <AlertTriangle size={15} color="var(--danger)" />;
      default:
        return <CheckCircle size={15} color="var(--primary)" />;
    }
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '1rem' }}>
      {/* Vertical Connecting Line */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          bottom: '10px',
          left: '15px',
          width: '2px',
          background: 'var(--border-glass)',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {auditRecords.map((record) => (
          <div
            key={record.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
            }}
          >
            {/* Icon Node */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {getActionIcon(record.action)}
            </div>

            {/* Content Box */}
            <div
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {record.description || record.action}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} />
                  {fmtDate(record.created_at)}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Actor: <strong style={{ color: 'var(--text-primary)' }}>{record.actor_name || 'System Engine'}</strong>
              </div>

              {record.notes && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card)',
                    borderLeft: '3px solid var(--primary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {record.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
