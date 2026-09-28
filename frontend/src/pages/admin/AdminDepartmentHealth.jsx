import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  ArrowLeft, Building2, ShieldCheck, AlertTriangle,
  AlertOctagon, CheckCircle2, HelpCircle, RefreshCw, Users, Clock,
  Sparkles,
} from 'lucide-react';

/* ── Health label metadata ────────────────────────────────── */
const HEALTH_META = {
  healthy:   { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)', icon: ShieldCheck,    label: 'Healthy' },
  attention: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', icon: AlertTriangle,   label: 'Attention' },
  critical:  { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  icon: AlertOctagon,   label: 'Critical' },
  no_data:   { color: 'var(--text-muted)', bg: 'var(--bg-card-hover)', border: 'var(--border-glass)', icon: HelpCircle, label: 'No Data' },
};

const DEPT_ICONS = {
  ACAD:   '🎓', IT: '💻', EXAM: '📝', FIN: '💳',
  HOSTEL: '🏠', LIB: '📚', FAC: '🏗️', TRANS: '🚌',
};

/* ── Compliance Gauge Dial ────────────────────────────────── */
const ComplianceGauge = ({ value, color }) => {
  if (value === null || value === undefined) {
    return (
      <div style={{ textAlign: 'center', minWidth: '72px' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>—</div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>NO DATA</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', minWidth: '72px' }}>
      <div style={{ fontSize: '1.85rem', fontWeight: 800, color, lineHeight: 1 }}>{value}%</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
        Compliance
      </div>
    </div>
  );
};

/* ── Department Health Card ───────────────────────────────── */
const DeptHealthCard = ({ dept }) => {
  const meta = HEALTH_META[dept.health_label] || HEALTH_META.no_data;
  const Icon = meta.icon;
  const emoji = DEPT_ICONS[dept.department_code] || '🏛️';
  const compliance = dept.compliance_rate_pct;

  return (
    <div
      className="card"
      style={{
        padding: '0',
        overflow: 'hidden',
        border: `1.5px solid ${meta.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card Top Banner */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${meta.border}`,
        background: meta.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {dept.department}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Code: {dept.department_code}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.25em 0.7em', borderRadius: '999px',
          background: 'var(--bg-card)', border: `1px solid ${meta.border}`,
          fontSize: '0.72rem', fontWeight: 800, color: meta.color,
        }}>
          <Icon size={13} />
          <span>{meta.label}</span>
        </div>
      </div>

      {/* Metrics Section */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <ComplianceGauge value={compliance} color={meta.color} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'On Time',    value: dept.on_time,            color: 'var(--success)' },
                { label: 'Breached',   value: dept.breached,           color: dept.breached > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                { label: 'In Flight',  value: dept.open_requests,      color: 'var(--primary)' },
                { label: 'Unassigned', value: dept.unassigned_requests,color: dept.unassigned_requests > 0 ? 'var(--warning)' : 'var(--text-muted)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '0.55rem 0.65rem', background: 'var(--bg-app)',
                  border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color, lineHeight: 1 }}>{value ?? 0}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA Meter */}
          {compliance !== null && (
            <div style={{ marginBottom: '0.875rem' }}>
              <div className="progress-track" style={{ height: '6px' }}>
                <div
                  className={`progress-fill ${compliance >= 90 ? 'safe' : compliance >= 75 ? 'warning' : 'breached'}`}
                  style={{ width: `${compliance}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Operational Synopsis */}
        {dept.explanation && (
          <div style={{
            padding: '0.65rem 0.85rem', background: 'var(--bg-app)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
            fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45,
          }}>
            {dept.explanation}
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminDepartmentHealth = () => {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const navigate = useNavigate();

  useEffect(() => { fetchHealthData(); }, [days]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDepartmentHealth(days);
      if (res.success && res.data) setHealthData(res.data);
    } catch (err) {
      console.error('Failed to load department health', err);
    } finally {
      setLoading(false);
    }
  };

  const healthCounts = {
    healthy:   healthData.filter(d => d.health_label === 'healthy').length,
    attention: healthData.filter(d => d.health_label === 'attention').length,
    critical:  healthData.filter(d => d.health_label === 'critical').length,
    no_data:   healthData.filter(d => d.health_label === 'no_data').length,
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '0.875rem' }}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 className="page-title">Department SLA Health Matrix</h1>
              <span className="badge badge-primary">8 University Divisions</span>
            </div>
            <p className="page-subtitle">
              Comprehensive SLA compliance, breach velocity, and unassigned workload distribution across all university departments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              className="input-field"
              style={{ width: 'auto' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[7, 14, 30, 60, 90].map(d => (
                <option key={d} value={d}>Last {d} Days Window</option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchHealthData} disabled={loading}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Distribution Strip ───────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Healthy Divisions',   count: healthCounts.healthy,   ...HEALTH_META.healthy   },
          { label: 'Attention Needed',    count: healthCounts.attention, ...HEALTH_META.attention },
          { label: 'Critical Breaches',   count: healthCounts.critical,  ...HEALTH_META.critical  },
          { label: 'Awaiting Transitions', count: healthCounts.no_data,  ...HEALTH_META.no_data   },
        ].map(({ label, count, color, bg, border, icon: Icon }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 1rem', background: bg,
            border: `1.5px solid ${border}`, borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem', fontWeight: 800, color,
          }}>
            <Icon size={14} />
            <span>{count} {label}</span>
          </div>
        ))}
      </div>

      {/* ── 8 Department Cards Grid ─────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton" style={{ height: '260px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {healthData.map((dept) => (
            <DeptHealthCard key={dept.department_id || dept.department} dept={dept} />
          ))}
        </div>
      )}
    </div>
  );
};
