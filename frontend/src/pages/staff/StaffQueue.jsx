import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import { useAuth } from '../../context/AuthContext';
import {
  Inbox, Search, ArrowUpRight, Clock, AlertTriangle,
  CheckCircle2, FileText, Users, Activity, Filter,
  ShieldAlert, ChevronRight, Zap, Building2,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */
const STATUS_META = {
  submitted:   { label: 'Submitted',   cls: 'badge badge-info' },
  in_progress: { label: 'In Progress', cls: 'badge badge-warning' },
  pending:     { label: 'Pending',     cls: 'badge badge-muted' },
  resolved:    { label: 'Resolved',    cls: 'badge badge-success' },
  rejected:    { label: 'Rejected',    cls: 'badge badge-danger' },
};
const PRIORITY_META = {
  critical: 'badge priority-critical',
  high:     'badge priority-high',
  medium:   'badge priority-medium',
  low:      'badge priority-low',
};
const SLA_RISK_COLOR = {
  safe: 'var(--sla-safe)', warning: 'var(--sla-warning)',
  critical: 'var(--sla-critical)', breached: 'var(--sla-breached)',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const StaffQueue = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchQueue(); }, [filterPriority, filterStatus]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterPriority) filters.priority = filterPriority;
      if (filterStatus)   filters.status   = filterStatus;
      const res = await requestsApi.getStaffQueue(filters);
      if (res.success && res.data) setQueue(res.data);
    } catch (err) {
      console.error('Failed to load staff queue', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = queue.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reference_number?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.student_name?.toLowerCase().includes(q)
    );
  });

  const deptName     = user?.profile?.department_name || 'Department';
  const urgentCount  = queue.filter(r => r.sla && ['critical','breached'].includes(r.sla.risk_level)).length;
  const activeCount  = queue.filter(r => !['resolved','rejected','closed'].includes(r.status)).length;
  const resolvedTdy  = queue.filter(r => r.status === 'resolved').length;

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <h1 className="page-title">{deptName} Workspace</h1>
          {urgentCount > 0 && (
            <span className="badge badge-danger">
              <AlertTriangle size={12} /> {urgentCount} Urgent Action Required
            </span>
          )}
        </div>
        <p className="page-subtitle">
          Operational request queue with finite-state stage transitions and real-time SLA accountability.
        </p>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Active Department Queue', value: activeCount, desc: 'Requests currently at this desk', icon: Activity, color: 'var(--primary)' },
          { label: 'SLA Risk / Attention',     value: urgentCount, desc: 'Requests nearing or exceeding target SLA', icon: AlertTriangle, color: urgentCount > 0 ? 'var(--danger)' : 'var(--success)' },
          { label: 'Certified / Completed',    value: resolvedTdy, desc: 'Processed and closed in this window', icon: CheckCircle2, color: 'var(--success)' },
        ].map(({ label, value, desc, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: `${color}18`, border: `1.5px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={color} />
              </div>
              <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{label}</div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={15} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.3rem' }}
            placeholder="Search by ref no., student name, or request subject…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>
          ))}
        </select>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {['submitted','in_progress','resolved','rejected'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* ── Queue List Table / Cards ─────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '88px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Inbox size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Queue is clear
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No incoming requests match the specified search or filter criteria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((req) => {
            const sm = STATUS_META[req.status] || STATUS_META.submitted;
            const sla = req.sla;
            const slaColor = sla ? SLA_RISK_COLOR[sla.risk_level] : null;
            const isUrgent = sla && ['critical', 'breached'].includes(sla.risk_level);

            return (
              <div
                key={req.id}
                onClick={() => navigate(`/staff/queue/${req.id}`)}
                className="card card-interactive"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  borderLeft: isUrgent ? `4px solid ${slaColor}` : '1px solid var(--border-glass)',
                }}
              >
                {/* User Avatar */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', flexShrink: 0,
                }}>
                  {req.student_name?.charAt(0) || 'S'}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <code style={{
                      fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary)',
                      background: 'var(--primary-glow)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)',
                      border: '1px solid rgba(79, 70, 229, 0.25)',
                    }}>
                      {req.reference_number}
                    </code>
                    <span className={sm.cls}>{sm.label}</span>
                    <span className={PRIORITY_META[req.priority] || 'badge badge-muted'}>{req.priority}</span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }} className="truncate">
                    {req.title}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    👤 Student: <strong style={{ color: 'var(--text-primary)' }}>{req.student_name}</strong> · Stage: <strong>{req.current_stage_name || 'Desk Review'}</strong> · Submitted {fmtDate(req.created_at)}
                  </div>
                </div>

                {/* SLA Clock */}
                {sla && (
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '110px' }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 800, color: slaColor,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {sla.risk_level === 'breached' ? '🔴 SLA Breached' :
                       sla.risk_level === 'critical' ? '🟠 Critical SLA' :
                       sla.risk_level === 'warning'  ? '🟡 SLA Warning' : '🟢 SLA On Track'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sla.remaining_minutes > 0 ? `${sla.remaining_minutes}m target left` : `${Math.abs(sla.elapsed_minutes - sla.target_minutes)?.toFixed(0)}m over target`}
                    </div>
                  </div>
                )}

                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
