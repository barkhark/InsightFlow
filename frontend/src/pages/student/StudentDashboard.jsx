import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import { useAuth } from '../../context/AuthContext';
import {
  PlusCircle, Search, Inbox, ArrowUpRight, Clock,
  AlertTriangle, CheckCircle2, Activity, FileText,
  Sparkles, GraduationCap, ChevronRight, Zap,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */
const STATUS_META = {
  submitted:   { label: 'Submitted',   cls: 'badge badge-info' },
  in_progress: { label: 'In Progress', cls: 'badge badge-warning' },
  pending:     { label: 'Pending',     cls: 'badge badge-muted' },
  resolved:    { label: 'Resolved',    cls: 'badge badge-success' },
  rejected:    { label: 'Rejected',    cls: 'badge badge-danger' },
  closed:      { label: 'Closed',      cls: 'badge badge-muted' },
  cancelled:   { label: 'Cancelled',   cls: 'badge badge-muted' },
};
const PRIORITY_META = {
  critical: 'badge priority-critical',
  high:     'badge priority-high',
  medium:   'badge priority-medium',
  low:      'badge priority-low',
};
const SLA_COLORS = {
  safe: 'var(--sla-safe)', warning: 'var(--sla-warning)',
  critical: 'var(--sla-critical)', breached: 'var(--sla-breached)',
};

const FILTERS = [
  { value: '', label: 'All Requests' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.getStudentRequests(filterStatus || null);
      if (res.success && res.data) setRequests(res.data);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reference_number?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.service_category_name?.toLowerCase().includes(q)
    );
  });

  const activeCount   = requests.filter(r => !['resolved','rejected','closed','cancelled'].includes(r.status)).length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;
  const warningCount  = requests.filter(r => r.sla && ['warning','critical','breached'].includes(r.sla?.risk_level)).length;
  const firstName     = user?.full_name?.split(' ')[0] || 'Student';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Welcome Hero Banner ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 60%, #312e81 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 2.25rem',
        marginBottom: '1.75rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)',
      }}>
        <div style={{
          position: 'absolute', right: '-40px', top: '-40px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.6rem',
                borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                🎓 Student Workspace
              </span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                {user?.profile?.programme || 'MCA'} · Sem {user?.profile?.semester || 3} · {user?.profile?.roll_number || 'MCA2026001'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '0.35rem' }}>
              Welcome back, {firstName} 👋
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.8)', maxWidth: '520px', lineHeight: 1.5 }}>
              Track your service requests, download stamped certificates, and inspect live SLA turnaround times across all 8 university divisions.
            </p>
          </div>

          <button
            onClick={() => navigate('/student/new-request')}
            style={{
              padding: '0.85rem 1.6rem', borderRadius: 'var(--radius-lg)',
              background: '#ffffff', color: '#4338ca', fontWeight: 800, fontSize: '0.92rem',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)', transition: 'all var(--transition-fast)',
            }}
          >
            <PlusCircle size={18} color="#4338ca" />
            <span>Raise New Request</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Strip ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Active In-Flight Workload', value: activeCount, desc: 'Requests currently in university review queues', icon: Activity, color: 'var(--primary)' },
          { label: 'Completed & Certified', value: resolvedCount, desc: 'Successfully issued within target SLA', icon: CheckCircle2, color: 'var(--success)' },
          { label: 'Attention / Action Needed', value: warningCount, desc: 'Nearing SLA threshold or awaiting student info', icon: AlertTriangle, color: warningCount > 0 ? 'var(--warning)' : 'var(--text-muted)' },
        ].map(({ label, value, desc, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}30`,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
          <Search size={15} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by reference code, subject, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={filterStatus === f.value ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Request List Table / Cards ───────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '84px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
          <Inbox size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {searchQuery || filterStatus ? 'No matching requests found' : 'No service requests submitted yet'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {searchQuery || filterStatus ? 'Try adjusting your search criteria or resetting filters.' : 'Submit your first academic certificate, IT issue, or financial query to begin tracking.'}
          </p>
          {!searchQuery && !filterStatus && (
            <button className="btn btn-primary" onClick={() => navigate('/student/new-request')}>
              <PlusCircle size={16} />
              <span>Submit Service Request</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((req) => {
            const sm = STATUS_META[req.status] || STATUS_META.submitted;
            const sla = req.sla;
            const slaColor = sla ? SLA_COLORS[sla.risk_level] : null;

            return (
              <div
                key={req.id}
                onClick={() => navigate(`/student/requests/${req.id}`)}
                className="card card-interactive"
                style={{
                  padding: '1.15rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                }}
              >
                {/* Left Document Icon */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--primary-glow)', border: '1px solid rgba(79, 70, 229, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileText size={20} color="var(--primary)" />
                </div>

                {/* Main Request Information */}
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
                    🏢 {req.service_category_name} · Stage: <strong style={{ color: 'var(--text-primary)' }}>{req.current_stage_name || 'Processing Desk'}</strong> · Submitted {fmtDate(req.created_at)}
                  </div>
                </div>

                {/* Live SLA Countdown Pill */}
                {sla && (
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: slaColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {sla.risk_level}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sla.elapsed_pct?.toFixed(0)}% SLA used
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
