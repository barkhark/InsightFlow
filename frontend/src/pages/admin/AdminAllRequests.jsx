import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  FileSpreadsheet, Search, ArrowLeft, ArrowUpRight,
  RefreshCw, AlertTriangle, CheckCircle2, Clock, Filter,
  Building2, ChevronRight, ShieldCheck, Download,
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

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export const AdminAllRequests = () => {
  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [statusFilter, setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch]               = useState('');
  const [searchInput, setSearchInput]     = useState('');
  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter)   filters.status   = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (search)         filters.search   = search;
      const res = await adminApi.getAllRequests(filters);
      if (res.success && res.data) setRequests(res.data);
    } catch (err) {
      console.error('Failed to load all requests', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const totalCount    = requests.length;
  const activeCount   = requests.filter(r => !['resolved','rejected','closed','cancelled'].includes(r.status)).length;
  const breachedCount = requests.filter(r => r.sla?.risk_level === 'breached').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '0.875rem' }}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 className="page-title">Institutional Master Ledger</h1>
              <span className="badge badge-primary">{totalCount} Audit Records</span>
            </div>
            <p className="page-subtitle">
              Comprehensive institutional registry across all 8 university divisions, finite-state machine handoffs, and cryptographic audit proofs.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchRequests} disabled={loading}>
              <RefreshCw size={14} />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Tracked Records', value: totalCount,    color: 'var(--primary)', icon: FileSpreadsheet },
          { label: 'Active In-Flight',       value: activeCount,   color: 'var(--info)',    icon: Clock },
          { label: 'SLA Breaches',           value: breachedCount, color: breachedCount > 0 ? 'var(--danger)' : 'var(--success)', icon: AlertTriangle },
          { label: 'Completed / Certified',  value: resolvedCount, color: 'var(--success)', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="stat-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
              background: `${color}18`, border: `1.5px solid ${color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1 1 300px', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.3rem' }}
              placeholder="Search by reference code, student name, or title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          {search && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setSearchInput(''); }}>
              Clear
            </button>
          )}
        </form>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {['submitted','in_progress','resolved','rejected','closed'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '150px' }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>
          ))}
        </select>
      </div>

      {/* ── Master Data Table ────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileSpreadsheet size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No ledger records found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Try adjusting your search criteria or resetting filters.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking Ref</th>
                  <th>Request Title & Category</th>
                  <th>Student & Programme</th>
                  <th>Department Desk</th>
                  <th>State</th>
                  <th>Priority</th>
                  <th>Active Stage</th>
                  <th>SLA Performance</th>
                  <th>Submitted</th>
                  <th style={{ width: '36px' }}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const sm = STATUS_META[req.status] || STATUS_META.submitted;
                  const sla = req.sla;
                  const slaColor = sla ? SLA_COLORS[sla.risk_level] : 'var(--text-muted)';

                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/staff/queue/${req.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <code style={{
                          fontSize: '0.74rem', fontWeight: 800,
                          color: 'var(--primary)', background: 'var(--primary-glow)',
                          padding: '0.15em 0.5em', borderRadius: 'var(--radius-xs)',
                          border: '1px solid rgba(79,70,229,0.25)', whiteSpace: 'nowrap',
                        }}>
                          {req.reference_number}
                        </code>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div className="truncate" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {req.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {req.service_category_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {req.student_name}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {req.department_name || req.service_category_name}
                      </td>
                      <td>
                        <span className={sm.cls}>{sm.label}</span>
                      </td>
                      <td>
                        <span className={PRIORITY_META[req.priority] || 'badge badge-muted'}>
                          {req.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {req.current_stage_name || '—'}
                      </td>
                      <td>
                        {sla ? (
                          <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: slaColor, textTransform: 'uppercase' }}>
                              {sla.risk_level}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {sla.elapsed_pct?.toFixed(0)}% used
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(req.created_at)}
                      </td>
                      <td>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{
            padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-glass)',
            fontSize: '0.78rem', color: 'var(--text-muted)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Showing {requests.length} verified records {search && `matching "${search}"`}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 700 }}>
              <ShieldCheck size={14} /> Immutable Ledger Proof
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
