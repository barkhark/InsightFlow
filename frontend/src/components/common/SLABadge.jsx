import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';

export const SLABadge = ({ sla }) => {
  if (!sla) {
    return <span className="badge badge-muted">No SLA</span>;
  }

  const { risk_level, remaining_minutes, elapsed_pct, explanation } = sla;

  let badgeClass = 'sla-safe';
  let icon = <ShieldCheck size={12} />;
  let label = 'On Track';

  if (risk_level === 'warning') {
    badgeClass = 'sla-warning';
    icon = <AlertTriangle size={12} />;
    label = 'Warning';
  } else if (risk_level === 'critical') {
    badgeClass = 'sla-critical';
    icon = <AlertOctagon size={12} />;
    label = 'Critical';
  } else if (risk_level === 'breached') {
    badgeClass = 'sla-breached';
    icon = <Flame size={12} />;
    label = 'Breached';
  }

  const formatRemaining = (mins) => {
    if (mins <= 0) return 'Overdue';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  return (
    <span
      className={`badge ${badgeClass}`}
      title={explanation || `${label} (${elapsed_pct}% elapsed)`}
      style={{ cursor: 'help' }}
    >
      {icon}
      <span>{label}</span>
      {remaining_minutes !== undefined && risk_level !== 'breached' && (
        <span style={{ opacity: 0.85, fontWeight: 500, marginLeft: 2 }}>
          • {formatRemaining(remaining_minutes)}
        </span>
      )}
    </span>
  );
};
