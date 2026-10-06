import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus,
  Cpu, Calendar, BarChart3, Lightbulb, Activity, Zap,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  }) : '—';

const dayAbbr = (dayName) => dayName.slice(0, 3);

/* ── Combined Chart (Historical + Forecast) ──────────────────────── */
const DemandChart = ({ historical, forecast }) => {
  const allPoints = [...(historical || []), ...(forecast || [])];
  if (allPoints.length === 0) return null;

  const maxCount = Math.max(
    ...allPoints.map(p => p.count ?? p.predicted_count ?? 0),
    ...forecast.map(f => f.confidence_band_high ?? 0),
    1
  );

  const BAR_WIDTH = 36;
  const GAP = 6;
  const HEIGHT = 200;
  const TOTAL_W = allPoints.length * (BAR_WIDTH + GAP);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div style={{ minWidth: TOTAL_W, padding: '0 0.5rem' }}>
        {/* Chart area */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: HEIGHT, gap: `${GAP}px` }}>
          {/* Historical bars */}
          {historical.map((h, i) => {
            const pct = (h.count / maxCount) * 100;
            return (
              <div key={`h-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: BAR_WIDTH, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  {h.count}
                </span>
                <div
                  title={`${h.day_name} ${h.date}: ${h.count} requests`}
                  style={{
                    width: '100%',
                    height: `${Math.max(4, pct)}%`,
                    borderRadius: '4px 4px 2px 2px',
                    background: 'linear-gradient(180deg, var(--primary), rgba(79,70,229,0.5))',
                    transition: 'height 0.5s ease',
                    cursor: 'pointer',
                  }}
                />
              </div>
            );
          })}

          {/* Forecast bars with confidence band */}
          {forecast.map((f, i) => {
            const predPct = (f.predicted_count / maxCount) * 100;
            const highPct = ((f.confidence_band_high || f.predicted_count) / maxCount) * 100;
            const lowPct = ((f.confidence_band_low || 0) / maxCount) * 100;
            const isPeak = f.predicted_count === Math.max(...forecast.map(x => x.predicted_count));

            return (
              <div key={`f-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: BAR_WIDTH, height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  color: isPeak ? '#f59e0b' : 'var(--text-secondary)',
                  marginBottom: '3px',
                }}>
                  ~{f.predicted_count}
                </span>
                {/* Confidence band (background) */}
                <div
                  style={{
                    position: 'absolute', bottom: 0, width: '100%',
                    height: `${Math.max(4, highPct)}%`,
                    borderRadius: '4px 4px 2px 2px',
                    background: isPeak ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.12)',
                    border: isPeak ? '1px dashed rgba(245,158,11,0.4)' : '1px dashed rgba(6,182,212,0.3)',
                  }}
                />
                {/* Predicted bar */}
                <div
                  title={`${f.day_name} ${f.date} (Forecast): ~${f.predicted_count} requests | Range: ${f.confidence_band_low}–${f.confidence_band_high} | ${f.confidence_pct}% confidence`}
                  style={{
                    position: 'absolute', bottom: 0, width: '65%',
                    height: `${Math.max(4, predPct)}%`,
                    borderRadius: '4px 4px 2px 2px',
                    background: isPeak
                      ? 'linear-gradient(180deg, #f59e0b, rgba(245,158,11,0.6))'
                      : 'linear-gradient(180deg, var(--secondary), rgba(6,182,212,0.5))',
                    transition: 'height 0.5s ease',
                    cursor: 'pointer',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div style={{ display: 'flex', gap: `${GAP}px`, marginTop: '6px' }}>
          {historical.map((h, i) => (
            <div key={`lh-${i}`} style={{ width: BAR_WIDTH, textAlign: 'center', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
              {dayAbbr(h.day_name)}
            </div>
          ))}
          {forecast.map((f, i) => (
            <div key={`lf-${i}`} style={{
              width: BAR_WIDTH, textAlign: 'center', fontSize: '0.58rem',
              color: 'var(--secondary)', fontWeight: 700,
            }}>
              {dayAbbr(f.day_name)}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', background: 'var(--primary)' }} />
            Historical (actual)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', background: 'var(--secondary)' }} />
            Forecast (predicted)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
            Peak day
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Forecast Day Card ───────────────────────────────────────────── */
const ForecastDayCard = ({ day, isPeak, isQuiet }) => (
  <div style={{
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    background: isPeak
      ? 'rgba(245,158,11,0.08)'
      : isQuiet ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
    border: isPeak
      ? '1.5px solid rgba(245,158,11,0.3)'
      : isQuiet ? '1.5px solid rgba(16,185,129,0.25)' : '1px solid var(--border-glass)',
    textAlign: 'center',
  }}>
    {isPeak && <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>📈 Peak</div>}
    {isQuiet && <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>🌿 Quiet</div>}
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
      {day.day_name.slice(0, 3)}
    </div>
    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
      {fmtDate(day.date)}
    </div>
    <div style={{
      fontSize: '1.75rem', fontWeight: 800, lineHeight: 1,
      color: isPeak ? '#f59e0b' : isQuiet ? '#10b981' : 'var(--text-primary)',
    }}>
      ~{day.predicted_count}
    </div>
    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '4px' }}>
      {day.confidence_band_low}–{day.confidence_band_high} range
    </div>
    <div style={{
      marginTop: '0.5rem', fontSize: '0.6rem', fontWeight: 700,
      padding: '2px 8px', borderRadius: '999px', display: 'inline-block',
      background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)',
    }}>
      {day.confidence_pct}% confidence
    </div>
    {day.is_weekend && (
      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        Weekend ↓
      </div>
    )}
  </div>
);

/* ── Main Component ──────────────────────────────────────────────── */
export const AdminDemandForecast = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await adminApi.getDemandForecast(forecastDays, 60);
      if (res.success && res.data) setData(res.data);
    } catch (err) {
      console.error('Demand forecast error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [forecastDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Computing demand forecast…</p>
    </div>
  );

  const summary = data?.summary || {};
  const forecast = data?.forecast || [];
  const historical = data?.historical || [];
  const insights = data?.insights || [];
  const peakDate = summary.peak_day?.date;
  const quietDate = summary.quiet_day?.date;

  const trendIcon = summary.trend_direction === 'increasing'
    ? <TrendingUp size={16} color="#10b981" />
    : summary.trend_direction === 'decreasing'
      ? <TrendingDown size={16} color="#ef4444" />
      : <Minus size={16} color="#8b5cf6" />;

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
              <Cpu size={26} color="var(--secondary)" />
              <h1 className="page-title">Predictive Demand Forecast</h1>
              <span className="badge badge-info">AI Engine</span>
            </div>
            <p className="page-subtitle">
              Day-of-week pattern analysis + momentum modeling predicts request intake volume for the next {forecastDays} days. Fully deterministic and explainable.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '120px' }}
              value={forecastDays}
              onChange={e => setForecastDays(Number(e.target.value))}
            >
              <option value={7}>7-day forecast</option>
              <option value={14}>14-day forecast</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Computing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          {
            label: 'Total Forecasted', value: summary.total_forecasted_volume || 0,
            unit: ' requests', color: 'var(--secondary)', icon: BarChart3,
            desc: `Over next ${forecastDays} days`,
          },
          {
            label: 'Peak Day', value: summary.peak_day?.day_name || '—',
            unit: '', color: '#f59e0b', icon: TrendingUp,
            desc: `${summary.peak_day?.predicted_count || 0} requests expected`,
          },
          {
            label: 'Demand Trend', value: summary.trend_direction || '—',
            unit: '', color: summary.trend_direction === 'increasing' ? '#10b981' : summary.trend_direction === 'decreasing' ? '#ef4444' : '#8b5cf6',
            icon: Activity,
            desc: `${summary.momentum_factor || 1.0}× momentum vs prior period`,
          },
          {
            label: 'Daily Avg (History)', value: summary.avg_daily_historical || 0,
            unit: '/day', color: 'var(--primary)', icon: Calendar,
            desc: 'Historical baseline used for projection',
          },
        ].map(({ label, value, unit, color, icon: Icon, desc }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `${color}18`, border: `1.5px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.2rem' }}>
              {value}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>
              {label}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Combined Chart ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <BarChart3 size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Historical + {forecastDays}-Day Forecast
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {trendIcon}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {summary.trend_direction} trend
            </span>
          </div>
        </div>
        <DemandChart historical={historical} forecast={forecast} />
      </div>

      {/* ── Forecast Day Grid ───────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Calendar size={18} color="var(--secondary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Day-by-Day Forecast
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.875rem' }}>
          {forecast.map((day) => (
            <ForecastDayCard
              key={day.date}
              day={day}
              isPeak={day.date === peakDate}
              isQuiet={day.date === quietDate}
            />
          ))}
        </div>
      </div>

      {/* ── AI Insights ─────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <Lightbulb size={18} color="var(--warning)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Forecast Insights
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {insights.map((insight, idx) => (
              <div key={idx} className="card" style={{
                border: '1px solid rgba(245,158,11,0.2)',
                background: 'rgba(245,158,11,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{insight.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      {insight.title}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
