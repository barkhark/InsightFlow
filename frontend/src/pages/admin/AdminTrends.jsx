import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, BarChart2, Calendar, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Lightbulb, ChevronRight,
  Activity, Target,
} from 'lucide-react';
import { adminApi } from '../../api/admin';

/* ─── Utility ─────────────────────────────────────────────── */
const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

const shortDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });

/* ─── Severity badge ─────────────────────────────────────── */
const SEVERITY = {
  critical: { bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)', icon: '🔴' },
  high:     { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)', icon: '🟠' },
  medium:   { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)', icon: '🔵' },
  low:      { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)', icon: '🟢' },
};

/* ─── Mini Skeleton ─────────────────────────────────────── */
const Skeleton = ({ h = 18, w = '100%', r = 6 }) => (
  <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />
);

/* ─── Bar Chart ─────────────────────────────────────────── */
const BarChart = ({ data, maxCount, label }) => {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No data for this period.
      </div>
    );
  }

  const globalMax = maxCount || Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ position: 'relative' }}>
      {/* Y-axis labels */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '200px' }}>
        {data.map((row, i) => {
          const pct = globalMax > 0 ? (row.count / globalMax) * 100 : 0;
          const isH = hovered === i;
          return (
            <div
              key={row.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer', gap: '4px' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isH && (
                <div style={{
                  position: 'absolute', bottom: '230px',
                  background: 'var(--bg-sidebar)', color: '#fff',
                  padding: '6px 10px', borderRadius: 8,
                  fontSize: '0.75rem', fontWeight: 700,
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                  boxShadow: 'var(--shadow-lg)', zIndex: 10,
                }}>
                  {fmt(row.date)}: <span style={{ color: '#80aad8' }}>{row.count} request{row.count !== 1 ? 's' : ''}</span>
                </div>
              )}
              {/* Count above bar */}
              <span style={{
                fontSize: '0.6rem', fontWeight: 700,
                color: isH ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.15s',
              }}>
                {row.count > 0 ? row.count : ''}
              </span>
              {/* Bar */}
              <div style={{
                width: '100%',
                height: `${Math.max(pct, row.count > 0 ? 2 : 0)}%`,
                background: isH
                  ? 'var(--primary)'
                  : `linear-gradient(180deg, var(--primary-light) 0%, var(--primary) 100%)`,
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.2s ease',
                minHeight: row.count > 0 ? '4px' : '0',
                opacity: row.count === 0 ? 0.15 : 1,
              }} />
            </div>
          );
        })}
      </div>

      {/* X-axis line */}
      <div style={{ height: '1px', background: 'var(--border-glass)', margin: '0 0 8px' }} />

      {/* Date labels — show every Nth to avoid crowding */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {data.map((row, i) => {
          const step = data.length > 14 ? Math.ceil(data.length / 7) : 1;
          const show = i % step === 0 || i === data.length - 1;
          return (
            <div key={row.date} style={{ flex: 1, textAlign: 'center' }}>
              {show && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {shortDate(row.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Summary stats above chart ─────────────────────────── */
const TrendSummary = ({ data }) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total / data.length;
  const peak = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);
  const last7 = data.slice(-7).reduce((s, d) => s + d.count, 0);
  const prev7 = data.slice(-14, -7).reduce((s, d) => s + d.count, 0);
  const delta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

  const DeltaIcon = delta === null ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaColor = delta === null ? 'var(--text-muted)' : delta > 0 ? 'var(--danger)' : 'var(--success)';

  const stats = [
    { label: 'Total Requests', value: total, sub: `over ${data.length} days`, icon: BarChart2, color: 'var(--primary)' },
    { label: 'Daily Average', value: avg.toFixed(1), sub: 'requests/day', icon: Activity, color: 'var(--info)' },
    { label: 'Peak Day', value: peak.count, sub: fmt(peak.date), icon: TrendingUp, color: 'var(--warning)' },
    {
      label: 'Last 7 Days',
      value: last7,
      sub: delta !== null ? `${delta > 0 ? '+' : ''}${delta}% vs prev week` : 'insufficient data',
      icon: DeltaIcon,
      color: deltaColor,
      rawDelta: delta,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="label-text">{s.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: s.rawDelta !== null ? s.color : 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>
              {s.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Insight Card ──────────────────────────────────────── */
const InsightCard = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY[insight.severity] || SEVERITY.medium;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${sev.border}`,
        borderLeft: `4px solid ${sev.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>{sev.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              {insight.title || insight.area || 'Institutional Insight'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: sev.bg, color: sev.color,
                fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {insight.severity}
              </span>
              <ChevronRight size={14} color="var(--text-muted)"
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.5 }}>
            {insight.finding}
          </div>
          {expanded && insight.recommendation && (
            <div style={{
              marginTop: '0.75rem', padding: '0.625rem 0.875rem',
              background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              borderLeft: `3px solid var(--primary)`,
            }}>
              <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '0.4rem' }}>
                💡 Recommendation:
              </span>
              {insight.recommendation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────── */
const PERIODS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
];

export const AdminTrends = () => {
  const [period, setPeriod] = useState(30);
  const [trendsData, setTrendsData] = useState([]);
  const [insightsData, setInsightsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getTrends(period);
      if (res.success) setTrendsData(res.data || []);
      else setError('Failed to load trends data.');
    } catch (err) {
      setError('Unable to reach the analytics API. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await adminApi.getInsights(period);
      if (res.success) setInsightsData(res.data || []);
    } catch {
      // Insights are bonus — don't block the page
    } finally {
      setInsightsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTrends();
    fetchInsights();
  }, [fetchTrends, fetchInsights]);

  const maxCount = trendsData.length > 0 ? Math.max(...trendsData.map((d) => d.count), 1) : 1;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px' }}>

      {/* ── Page Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'var(--primary-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={20} color="var(--primary)" />
            </div>
            <h1 className="page-title">Trends &amp; Volume Analytics</h1>
          </div>
          <p className="page-subtitle" style={{ marginLeft: '52px' }}>
            Daily request intake patterns, volume trends, and empirical service improvement insights
          </p>
        </div>

        {/* Period Selector + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'flex', gap: '0', background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: period === p.value ? 'var(--primary)' : 'transparent',
                  color: period === p.value ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRight: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.12s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { fetchTrends(); fetchInsights(); }}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.65s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '0.875rem 1rem', marginBottom: '1.25rem',
          background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--danger)',
          fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center',
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Summary Stats ──────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card">
              <Skeleton h={12} w="60%" r={4} />
              <div style={{ marginTop: '0.75rem' }}><Skeleton h={32} w="40%" r={4} /></div>
              <div style={{ marginTop: '0.5rem' }}><Skeleton h={12} w="70%" r={4} /></div>
            </div>
          ))}
        </div>
      ) : (
        <TrendSummary data={trendsData} />
      )}

      {/* ── Volume Chart Card ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Daily Request Intake
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Last {period} days
            </span>
          </div>
        </div>

        {loading ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '200px' }}>
              {Array.from({ length: period > 30 ? 30 : period }, (_, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div className="skeleton" style={{
                    height: `${Math.random() * 60 + 20}%`,
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
              ))}
            </div>
            <div style={{ height: '1px', background: 'var(--border-glass)', margin: '0 0 8px' }} />
          </div>
        ) : (
          <BarChart data={trendsData} maxCount={maxCount} label="Requests" />
        )}

        {/* Legend */}
        <div style={{
          marginTop: '1.25rem', paddingTop: '1rem',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.75rem', color: 'var(--text-muted)',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--primary)', flexShrink: 0 }} />
          <span>Hover over bars to inspect individual daily counts</span>
        </div>
      </div>

      {/* ── Insights Section ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Lightbulb size={18} color="var(--warning)" />
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Service Improvement Insights
        </h2>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: 'var(--warning-bg)', color: 'var(--warning)',
          fontSize: '0.65rem', fontWeight: 800,
        }}>
          Empirical · Deterministic
        </span>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
        Insights are rule-based deductions from real workflow metrics — not black-box AI scores.
        Each finding includes a specific, actionable recommendation.
      </p>

      {insightsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: '1rem' }}>
              <Skeleton h={14} w="40%" r={4} />
              <div style={{ marginTop: '0.5rem' }}><Skeleton h={12} w="80%" r={4} /></div>
            </div>
          ))}
        </div>
      ) : insightsData.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {insightsData.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <Target size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            No critical insights detected
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            All service areas are operating within acceptable thresholds for this period.
          </div>
        </div>
      )}
    </div>
  );
};
