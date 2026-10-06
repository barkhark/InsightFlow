import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  ArrowLeft, RefreshCw, Users, Zap, CheckCircle, AlertTriangle,
  BarChart3, ArrowRight, Shield, Clock, TrendingUp, Building2,
} from 'lucide-react';

/* ── Load status config ──────────────────────────────────────────── */
const loadConfig = {
  overloaded:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Overloaded' },
  strained:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'Strained' },
  balanced:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', label: 'Balanced' },
  underutilized: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', label: 'Available' },
};

/* ── Staff Card ──────────────────────────────────────────────────── */
const StaffCard = ({ staff }) => {
  const cfg = loadConfig[staff.load_status] || loadConfig.balanced;
  const effColor = staff.efficiency_score >= 70 ? '#10b981' : staff.efficiency_score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      padding: '1.125rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}`,
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      {/* Avatar */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}15)`,
        border: `2px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 800, color: cfg.color, flexShrink: 0,
      }}>
        {staff.staff_name.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {staff.staff_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {staff.department} · {staff.staff_email}
            </div>
          </div>
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px',
            borderRadius: '999px', background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`, textTransform: 'uppercase',
            letterSpacing: '0.05em', flexShrink: 0,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Queue</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
              {staff.active_queue_count}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {staff.transitions_completed}
            </div>
          </div>
          {staff.avg_completion_minutes && (
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Duration</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {Math.round(staff.avg_completion_minutes / 60)}h
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Breach Rate</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: staff.sla_breach_rate_pct > 15 ? '#ef4444' : '#10b981', lineHeight: 1 }}>
              {staff.sla_breach_rate_pct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Efficiency</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: effColor, lineHeight: 1 }}>
              {staff.efficiency_score}/100
            </div>
          </div>
        </div>

        {/* Efficiency bar */}
        <div style={{
          marginTop: '0.5rem', height: '4px', borderRadius: '2px',
          background: 'var(--bg-app)', border: '1px solid var(--border-glass)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: `linear-gradient(90deg, ${effColor}, ${effColor}80)`,
            width: `${staff.efficiency_score}%`,
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>
    </div>
  );
};

/* ── Recommendation Card ─────────────────────────────────────────── */
const RecommendationCard = ({ rec }) => {
  const priorityColor = rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#3b82f6';
  const isBalanced = rec.type === 'balanced';

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      borderRadius: 'var(--radius-xl)',
      border: isBalanced ? '1.5px solid rgba(16,185,129,0.3)' : `1.5px solid ${priorityColor}30`,
      background: isBalanced ? 'rgba(16,185,129,0.05)' : `${priorityColor}08`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        {isBalanced
          ? <CheckCircle size={18} color="#10b981" />
          : <AlertTriangle size={18} color={priorityColor} />}
        <div style={{
          fontSize: '0.62rem', fontWeight: 800, color: isBalanced ? '#10b981' : priorityColor,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          padding: '2px 8px', borderRadius: '999px',
          background: isBalanced ? 'rgba(16,185,129,0.1)' : `${priorityColor}12`,
          border: `1px solid ${isBalanced ? 'rgba(16,185,129,0.3)' : `${priorityColor}25`}`,
        }}>
          {rec.type === 'reassignment' ? '↔ Reassignment' : rec.type === 'cross_department' ? '🏢 Cross-Dept' : '✅ Balanced'}
        </div>
        {rec.priority && rec.priority !== 'info' && (
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, color: priorityColor,
            marginLeft: 'auto',
          }}>
            {rec.priority.toUpperCase()} PRIORITY
          </span>
        )}
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
        {rec.title}
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.875rem' }}>
        {rec.description}
      </p>

      {/* From → To visualization */}
      {rec.from_staff && rec.to_staff && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-glass)', marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transfer From</div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ef4444' }}>{rec.from_staff.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rec.from_staff.active_count} active requests</div>
          </div>
          <ArrowRight size={20} color="var(--text-muted)" />
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transfer To</div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#10b981' }}>{rec.to_staff.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rec.to_staff.active_count} active requests</div>
          </div>
          {rec.suggested_transfer_count && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {rec.suggested_transfer_count}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>requests</div>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div style={{
        padding: '0.625rem 0.875rem',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-glass)',
        fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600,
      }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isBalanced ? '#10b981' : priorityColor, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
          ✦ Suggested Action
        </span>
        {rec.action}
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
export const AdminWorkloadBalancer = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState('recommendations');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await adminApi.getWorkloadBalance(days);
      if (res.success && res.data) setData(res.data);
    } catch (err) {
      console.error('Workload balance error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analyzing staff workload distribution…</p>
    </div>
  );

  const summary = data?.summary || {};
  const staffProfiles = data?.staff_profiles || [];
  const deptAnalysis = data?.department_analysis || [];
  const recommendations = data?.recommendations || [];

  const imbalanceSeverityColor = {
    'Balanced': '#10b981', 'Moderate': '#3b82f6', 'High': '#f59e0b', 'Critical': '#ef4444',
  }[summary.imbalance_severity] || 'var(--primary)';

  const tabs = [
    { id: 'recommendations', label: 'AI Recommendations', count: recommendations.length },
    { id: 'staff', label: 'Staff Profiles', count: staffProfiles.length },
    { id: 'departments', label: 'Department View', count: deptAnalysis.length },
  ];

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
              <Users size={26} color="var(--primary)" />
              <h1 className="page-title">Smart Workload Balancer</h1>
              <span className="badge badge-primary">AI Recommendations</span>
            </div>
            <p className="page-subtitle">
              Analyzes queue load, efficiency scores, and SLA compliance per staff member. Generates specific reassignment recommendations to optimize throughput.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <select className="input-field" style={{ width: 'auto' }} value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Analyzing…' : 'Re-analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Staff Analyzed', value: summary.total_staff_analyzed || 0, icon: Users, color: 'var(--primary)' },
          { label: 'Overloaded', value: summary.overloaded_staff_count || 0, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Available', value: summary.underutilized_staff_count || 0, icon: CheckCircle, color: '#10b981' },
          { label: 'Imbalance Score', value: `${summary.load_imbalance_score || 0}`, icon: BarChart3, color: imbalanceSeverityColor,
            desc: summary.imbalance_severity },
          { label: 'Recommendations', value: summary.recommendation_count || 0, icon: Zap, color: '#8b5cf6' },
        ].map(({ label, value, icon: Icon, color, desc }) => (
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
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.25rem' }}>
              {label}
            </div>
            {desc && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>}
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
            <span style={{
              fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
              fontWeight: 800,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      {activeTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recommendations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckCircle size={42} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Workload is balanced.</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No reassignments needed at this time.</p>
            </div>
          ) : (
            recommendations.map((rec, idx) => <RecommendationCard key={idx} rec={rec} />)
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {staffProfiles.map((staff, idx) => (
            <StaffCard key={idx} staff={staff} />
          ))}
          {staffProfiles.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No staff data available for this period.
            </div>
          )}
        </div>
      )}

      {activeTab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {deptAnalysis.map((dept, idx) => {
            const capColor = {
              critical: '#ef4444', strained: '#f59e0b',
              normal: '#3b82f6', underutilized: '#10b981',
            }[dept.capacity_status] || 'var(--primary)';

            return (
              <div key={idx} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={18} color={capColor} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {dept.department}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px',
                    borderRadius: '999px', color: capColor,
                    background: `${capColor}12`, border: `1px solid ${capColor}30`,
                    textTransform: 'uppercase',
                  }}>
                    {dept.capacity_status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  {[
                    { label: 'Staff', value: dept.staff_count },
                    { label: 'Active Requests', value: dept.total_active_requests, color: capColor },
                    { label: 'Avg Load', value: `${dept.avg_load_per_staff}/staff` },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '0.5rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
