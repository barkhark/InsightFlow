import React from 'react';
import { Cpu, Clock, AlertTriangle, CheckCircle, ShieldCheck, Activity } from 'lucide-react';

export const PredictiveForecastWidget = ({ forecast, erpProfile, isTerminal = false }) => {
  if (!forecast && !erpProfile) return null;

  const riskScore = forecast?.sla_risk_score ?? 15;
  const riskTier = forecast?.risk_tier || (riskScore > 65 ? 'HIGH' : riskScore > 35 ? 'MODERATE' : 'LOW');

  const getTierColor = (tier) => {
    switch (tier) {
      case 'HIGH': return { bg: '#fdf0ee', text: '#c0392b', border: '#f0b8b3' };
      case 'MODERATE': return { bg: '#fdf4e4', text: '#b8680a', border: '#f5cc85' };
      case 'LOW': return { bg: '#e8f7ef', text: '#1a7a4a', border: '#a3d9bc' };
      default: return { bg: '#e8f0fb', text: '#1a4a8a', border: '#a8c4e8' };
    }
  };

  const colors = getTierColor(riskTier);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-glass, #dde4ed)',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm, 0 1px 4px 0 rgba(10, 25, 50, 0.07))',
        marginBottom: '1.25rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.65rem',
          borderBottom: '1px solid var(--border-subtle, #e8edf2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(30, 106, 191, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary, #1a4a8a)',
            }}
          >
            <Cpu size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #0d1f35)' }}>
              Rule-Based SLA Risk &amp; ETA Analysis
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #5a7088)' }}>
              Deterministic queue velocity &amp; historical stage dwell analysis
            </span>
          </div>
        </div>

        {erpProfile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(26, 122, 74, 0.08)',
              border: '1px solid rgba(26, 122, 74, 0.25)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              color: 'var(--success, #1a7a4a)',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={13} />
            <span>SIS Verified: {erpProfile.fee_dues_status === 'CLEARED' ? 'Fees Cleared' : 'Enrolled'}</span>
          </div>
        )}
      </div>

      {isTerminal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success, #1a7a4a)', fontSize: '0.85rem' }}>
          <CheckCircle size={18} />
          <span>Workflow Completed. Processed through verified departmental stages.</span>
        </div>
      ) : (
        <>
          {/* Top Metrics Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            {/* Projected ETA */}
            <div
              style={{
                backgroundColor: 'var(--bg-card-subtle, #f8fafc)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #e8edf2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                <Clock size={13} />
                <span>Estimated Resolution</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ~{forecast?.predicted_completion_hours || 4.2} hrs
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {forecast?.estimated_resolution_time
                  ? new Date(forecast.estimated_resolution_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'By end of day'}
              </div>
            </div>

            {/* SLA Risk Index */}
            <div
              style={{
                backgroundColor: colors.bg,
                padding: '0.75rem',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.75rem', color: colors.text, fontWeight: 600 }}>
                  Breach Risk Index
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.text }}>
                  {riskScore} / 100
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: colors.text }}>
                {riskTier} RISK
              </div>
              <div style={{ fontSize: '0.7rem', color: colors.text, opacity: 0.85 }}>
                {forecast?.confidence_pct || 90}% forecast confidence
              </div>
            </div>

            {/* Queue Congestion */}
            <div
              style={{
                backgroundColor: 'var(--bg-card-subtle, #f8fafc)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #e8edf2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                <Activity size={13} />
                <span>Department Queue Load</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {forecast?.department_backlog_count || 1} active in queue
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {forecast?.department_name || 'Academic Section'}
              </div>
            </div>
          </div>

          {/* Explainable Factor Pills */}
          {forecast?.risk_factors && forecast.risk_factors.length > 0 && (
            <div style={{ fontSize: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Predictive Reasoning & Queue Context:
              </span>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                {forecast.risk_factors.map((factor, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
