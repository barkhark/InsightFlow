import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  Activity, AlertTriangle, FileSpreadsheet, TrendingUp, CheckCircle2,
  Clock, ShieldCheck, Building2, Sparkles, ArrowRight, Zap,
  BarChart3, RefreshCw, Lightbulb, Target, TrendingDown, Users,
  Check, ArrowUpRight, Flame, PieChart,
} from 'lucide-react';

/* ── KPI Card ──────────────────────────────────────────────── */
const KPICard = ({ label, value, unit = '', icon: Icon, color, description, trend }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '12px',
        background: `${color}18`, border: `1.5px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      {trend !== undefined && (
        <span style={{
          fontSize: '0.72rem', fontWeight: 800, padding: '0.25em 0.6em',
          borderRadius: '999px',
          background: trend >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${trend >= 0 ? 'var(--success-border)' : 'var(--danger-border)'}`,
        }}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div style={{ fontSize: '2.1rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.25rem' }}>
      {value}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>
    </div>
    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
      {label}
    </div>
    {description && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{description}</p>}
  </div>
);

/* ── Module Card ───────────────────────────────────────────── */
const ModuleCard = ({ title, desc, icon: Icon, color, onClick }) => (
  <div
    className="card card-interactive"
    onClick={onClick}
    style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px',
          background: `${color}18`, border: `1.5px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={color} />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <ArrowRight size={18} color="var(--text-muted)" />
    </div>
    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
  </div>
);

/* ── Insight Card ──────────────────────────────────────────── */
const InsightCard = ({ insight, idx }) => {
  const categoryColors = {
    'Workflow Bottleneck':         { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  icon: TrendingDown },
    'Resource Allocation':         { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', icon: Users },
    'Excellence in SLA Adherence': { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)', icon: Target },
    'Operational Intelligence':    { color: 'var(--info)',    bg: 'var(--info-bg)',    border: 'var(--info-border)',    icon: BarChart3 },
  };
  const meta = categoryColors[insight.category] || categoryColors['Operational Intelligence'];
  const Icon = meta.icon;

  return (
    <div className="card" style={{
      border: `1.5px solid ${meta.border}`, background: meta.bg,
      padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={16} color={meta.color} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {insight.category}
          </span>
        </div>
        <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>
          Empirical Engine
        </span>
      </div>

      <div>
        <div className="label-text" style={{ marginBottom: '0.2rem' }}>Key Observation</div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {insight.observation}
        </h4>
      </div>

      <div>
        <div className="label-text" style={{ marginBottom: '0.2rem' }}>Empirical Evidence</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {insight.evidence}
        </p>
      </div>

      <div>
        <div className="label-text" style={{ marginBottom: '0.2rem' }}>Operational Impact</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {insight.impact}
        </p>
      </div>

      <div style={{
        marginTop: 'auto', padding: '0.875rem 1rem', background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
          ✦ Prescriptive Operational Action
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
          {insight.recommended_action}
        </p>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [insights, setInsights] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const [kpiRes, insightRes, trendRes] = await Promise.all([
        adminApi.getDashboardKpis(),
        adminApi.getInsights ? adminApi.getInsights() : Promise.resolve({ success: false }),
        adminApi.getTrends ? adminApi.getTrends(14) : Promise.resolve({ success: false }),
      ]);
      if (kpiRes.success && kpiRes.data) setKpis(kpiRes.data);
      if (insightRes.success && insightRes.data) setInsights(insightRes.data);
      if (trendRes.success && trendRes.data) setTrends(trendRes.data);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aggregating institutional intelligence…</p>
    </div>
  );

  const compliance = kpis?.sla_compliance_pct_30d ?? null;
  const complianceColor = compliance === null ? 'var(--text-muted)' : compliance >= 90 ? 'var(--success)' : compliance >= 75 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Executive Page Header ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 className="page-title">Executive Command Center</h1>
            <span className="badge badge-primary">Institutional Intelligence</span>
          </div>
          <p className="page-subtitle">
            Real-time deterministic SLA tracking, multi-department health metrics, and prescriptive service optimization.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing Live Data…' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* ── Operational Health Synopsis Banner ──────────────── */}
      {kpis?.explanation && (
        <div style={{
          padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
          borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'flex-start', gap: '1rem',
          background: 'linear-gradient(135deg, var(--primary-glow), rgba(6,182,212,0.08))',
          border: '1px solid rgba(79,70,229,0.25)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              Operational Health Synopsis
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
              {kpis.explanation}
            </p>
          </div>
        </div>
      )}

      {/* ── Executive KPI Scorecard Grid ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard
          label="Active In-Flight Workload"
          value={kpis?.total_active_requests ?? 0}
          icon={Clock}
          color="var(--primary)"
          description="Requests processing across all 8 division queues"
        />
        <KPICard
          label="30-Day Completed"
          value={kpis?.resolved_last_30_days ?? 0}
          icon={CheckCircle2}
          color="var(--success)"
          description="Successfully completed workflow executions"
        />
        <KPICard
          label="7-Day Intake Velocity"
          value={kpis?.new_last_7_days ?? 0}
          icon={TrendingUp}
          color="var(--info)"
          description="New student submissions in the past 7 days"
        />
        <KPICard
          label="SLA Compliance Rate"
          value={compliance !== null ? compliance : 'N/A'}
          unit={compliance !== null ? '%' : ''}
          icon={ShieldCheck}
          color={complianceColor}
          description="On-time stage transition adherence (30-day window)"
        />
      </div>

      {/* ── Navigation Module Cards ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <ModuleCard
          title="Department Health Matrix"
          desc="Inspect per-division SLA compliance rates, on-time vs breached transition tallies, and active queue health across all 8 academic and administrative departments."
          icon={Activity}
          color="var(--secondary)"
          onClick={() => navigate('/admin/department-health')}
        />
        <ModuleCard
          title="Bottleneck Diagnostics"
          desc="Identify specific workflow stages causing processing latency. Stages are ranked by average dwell hours with prescriptive remediation suggestions."
          icon={AlertTriangle}
          color="var(--warning)"
          onClick={() => navigate('/admin/bottlenecks')}
        />
        <ModuleCard
          title="All-Requests Master Ledger"
          desc="Immutable institutional audit trail — search, filter, and review every request across all departments with live SLA and cryptographic verification status."
          icon={FileSpreadsheet}
          color="var(--primary)"
          onClick={() => navigate('/admin/all-requests')}
        />
      </div>

      {/* ── Service Improvement Insights (AI/Rule Engine) ────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Lightbulb size={20} color="var(--warning)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Service Improvement Insights
            </h2>
            <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
              {insights.length} Findings
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {insights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
};
