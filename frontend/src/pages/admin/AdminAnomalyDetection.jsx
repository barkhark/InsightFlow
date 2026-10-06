import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  ArrowLeft, RefreshCw, AlertTriangle, Zap, TrendingDown,
  Users, BarChart3, Clock, ShieldAlert, Activity, BrainCircuit,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';

/* ── Severity config ─────────────────────────────────────────────── */
const severityConfig = {
  critical: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    badgeBg: 'rgba(239,68,68,0.12)',
    icon: ShieldAlert,
    label: 'CRITICAL',
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    badgeBg: 'rgba(245,158,11,0.12)',
    icon: AlertTriangle,
    label: 'WARNING',
  },
  info: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    badgeBg: 'rgba(59,130,246,0.12)',
    icon: Info,
    label: 'INFO',
  },
};

const anomalyTypeIcons = {
  'SLA Outlier': TrendingDown,
  'Volume Spike': Activity,
  'Staff Throughput Drop': Users,
  'Department Queue Surge': BarChart3,
  'Repeat Requestor': Clock,
};

/* ── Anomaly Card ────────────────────────────────────────────────── */
const AnomalyCard = ({ anomaly }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = severityConfig[anomaly.severity] || severityConfig.info;
  const SevIcon = sev.icon;
  const TypeIcon = anomalyTypeIcons[anomaly.anomaly_type] || Activity;

  return (
    <div style={{
      border: `1.5px solid ${sev.border}`,
      background: sev.bg,
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem 1.5rem',
      transition: 'all 0.2s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
          {/* Severity icon */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: sev.badgeBg, border: `1.5px solid ${sev.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <SevIcon size={18} color={sev.color} />
          </div>

          <div style={{ flex: 1 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px',
                borderRadius: '999px', background: sev.badgeBg, color: sev.color,
                border: `1px solid ${sev.border}`, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                ● {sev.label}
              </span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px',
                borderRadius: '999px', background: 'var(--bg-app)', color: 'var(--text-muted)',
                border: '1px solid var(--border-glass)',
              }}>
                <TypeIcon size={10} style={{ display: 'inline', marginRight: '3px' }} />
                {anomaly.anomaly_type}
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px',
                borderRadius: '4px', background: 'rgba(99,102,241,0.08)',
                color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)',
              }}>
                Statistical Engine
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)',
              lineHeight: 1.4, marginBottom: '0.35rem',
            }}>
              {anomaly.title}
            </h3>

            {/* Description */}
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {anomaly.description}
            </p>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', flexShrink: 0,
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${sev.border}` }}>
          {/* Evidence */}
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{
              fontSize: '0.68rem', fontWeight: 800, color: sev.color,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem',
            }}>
              📊 Statistical Evidence
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.5rem',
            }}>
              {Object.entries(anomaly.evidence || {}).map(([key, val]) => (
                <div key={key} style={{
                  padding: '0.5rem 0.75rem', borderRadius: '8px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '2px' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended action */}
          <div style={{
            padding: '0.875rem 1rem',
            background: 'var(--bg-card)',
            border: `1px solid ${sev.border}`,
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 800, color: sev.color,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem',
            }}>
              ✦ Recommended Action
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
              {anomaly.recommended_action}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
export const AdminAnomalyDetection = () => {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await adminApi.getAnomalies(days);
      if (res.success) {
        setData(res.data || []);
        setMeta(res.meta || {});
      }
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = (data || []).filter(
    a => filterSeverity === 'all' || a.severity === filterSeverity
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Running statistical anomaly scans…
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '0.875rem' }}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <BrainCircuit size={26} color="var(--danger)" />
              <h1 className="page-title">AI Anomaly Detection</h1>
              <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                {meta?.total_anomalies || 0} Findings
              </span>
            </div>
            <p className="page-subtitle">
              Statistical workflow analysis using mean ± 2σ methodology. Detects SLA outliers, volume spikes, staff drops, and queue surges in real time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '120px' }}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Scanning…' : 'Re-scan'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Severity KPI Row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Anomalies', value: meta?.total_anomalies || 0, color: 'var(--primary)', icon: Zap, key: 'all' },
          { label: 'Critical', value: meta?.critical_count || 0, color: '#ef4444', icon: ShieldAlert, key: 'critical' },
          { label: 'Warning', value: meta?.warning_count || 0, color: '#f59e0b', icon: AlertTriangle, key: 'warning' },
          { label: 'Info', value: meta?.info_count || 0, color: '#3b82f6', icon: Info, key: 'info' },
        ].map(({ label, value, color, icon: Icon, key }) => (
          <div
            key={label}
            className="stat-card card-interactive"
            onClick={() => setFilterSeverity(filterSeverity === key ? 'all' : key)}
            style={{
              cursor: 'pointer',
              outline: filterSeverity === key ? `2px solid ${color}` : 'none',
              outlineOffset: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `${color}18`, border: `1.5px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={color} />
              </div>
              {filterSeverity === key && (
                <span style={{ fontSize: '0.62rem', color, fontWeight: 700 }}>● Active Filter</span>
              )}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Engine Note ─────────────────────────────────────────── */}
      <div style={{
        padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <BrainCircuit size={18} color="#6366f1" />
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1' }}>
            Statistical Detection Engine
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            All anomalies are computed using mean ± 2σ standard deviation — fully explainable and auditable.
            No black-box AI. Scanning {days}-day history window.
          </span>
        </div>
      </div>

      {/* ── Anomaly List ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
            {filterSeverity === 'all' ? 'No Anomalies Detected' : `No ${filterSeverity} anomalies`}
          </p>
          <p style={{ fontSize: '0.82rem' }}>
            {filterSeverity === 'all'
              ? 'All workflow metrics are within normal statistical ranges. The system is operating within expected parameters.'
              : 'Try selecting "All" to view anomalies of other severity levels.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((anomaly, idx) => (
            <AnomalyCard key={idx} anomaly={anomaly} />
          ))}
        </div>
      )}
    </div>
  );
};
