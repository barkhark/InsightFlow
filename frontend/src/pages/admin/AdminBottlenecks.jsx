import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  AlertTriangle, ArrowLeft, Clock, Flame, TrendingDown,
  CheckCircle2, Lightbulb, BarChart2, RefreshCw, Activity,
  Zap, ShieldAlert,
} from 'lucide-react';

/* ── Severity metadata ────────────────────────────────────── */
const SEV_META = {
  critical: { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  icon: Flame,         label: 'Critical Stall' },
  warning:  { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', icon: AlertTriangle,  label: 'High Dwell' },
  normal:   { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)', icon: CheckCircle2,   label: 'Normal' },
};

/* ── Dwell Bar ────────────────────────────────────────────── */
const DwellBar = ({ avgHours, maxHours }) => {
  const pct = maxHours > 0 ? Math.min(100, (avgHours / maxHours) * 100) : 0;
  const cls = pct >= 80 ? 'breached' : pct >= 50 ? 'critical' : 'warning';
  return (
    <div className="progress-track" style={{ height: '8px', minWidth: '110px' }}>
      <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const AdminBottlenecks = () => {
  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const navigate = useNavigate();

  useEffect(() => { fetchBottlenecks(); }, [days]);

  const fetchBottlenecks = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBottlenecks(days);
      if (res.success && res.data) setBottlenecks(res.data);
    } catch (err) {
      console.error('Failed to load bottlenecks', err);
    } finally {
      setLoading(false);
    }
  };

  const maxDwell = bottlenecks.length > 0 ? Math.max(...bottlenecks.map(b => b.avg_dwell_hours || 0)) : 1;
  const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
  const warningCount  = bottlenecks.filter(b => b.severity === 'warning').length;

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
              <h1 className="page-title">Workflow Bottleneck Diagnostics</h1>
              {criticalCount > 0 && <span className="badge badge-danger">{criticalCount} Critical Stalls</span>}
              {warningCount > 0  && <span className="badge badge-warning">{warningCount} High Dwell</span>}
            </div>
            <p className="page-subtitle">
              Empirical stage latency analysis. Workflow stages are ranked by average dwell duration to pinpoint operational stalls.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              className="input-field"
              style={{ width: 'auto' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} Days Window</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchBottlenecks} disabled={loading}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ───────────────────────────────────── */}
      {!loading && bottlenecks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Workflow Stages Analyzed', value: bottlenecks.length, color: 'var(--primary)', icon: BarChart2 },
            { label: 'Critical Stage Latencies', value: criticalCount, color: 'var(--danger)', icon: Flame },
            { label: 'Moderate Dwell Stages', value: warningCount, color: 'var(--warning)', icon: AlertTriangle },
            { label: 'Longest Stage Dwell', value: `${maxDwell.toFixed(1)}h`, color: 'var(--warning)', icon: Clock },
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
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ranked Table ────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : bottlenecks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Activity size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No bottlenecks detected
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            All workflow stage transitions have completed within expected SLA parameters.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '56px', textAlign: 'center' }}>Rank</th>
                  <th>Workflow Stage & Department</th>
                  <th style={{ minWidth: '180px' }}>Average Dwell Duration</th>
                  <th style={{ textAlign: 'center' }}>Transitions</th>
                  <th style={{ textAlign: 'center' }}>SLA Breaches</th>
                  <th>Severity</th>
                  <th>Prescriptive Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {bottlenecks.map((item, idx) => {
                  const sev = item.severity || 'normal';
                  const meta = SEV_META[sev] || SEV_META.normal;
                  const Icon = meta.icon;

                  return (
                    <tr key={`${item.stage_name}-${idx}`}>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto',
                          background: meta.bg, border: `1.5px solid ${meta.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, color: meta.color,
                        }}>
                          {idx + 1}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {item.stage_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          🏢 {item.department_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: meta.color }}>
                            {item.avg_dwell_hours?.toFixed(1)}h
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>avg dwell</span>
                        </div>
                        <DwellBar avgHours={item.avg_dwell_hours} maxHours={maxDwell} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {item.total_transitions ?? 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: item.breach_count > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                          {item.breach_count ?? 0}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Icon size={14} color={meta.color} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: meta.color }}>{meta.label}</span>
                        </div>
                      </td>
                      <td>
                        {item.recommendation && (
                          <div style={{
                            fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                            maxWidth: '280px', padding: '0.35rem 0.65rem', background: 'var(--bg-app)',
                            borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${meta.color}`,
                          }}>
                            {item.recommendation}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
