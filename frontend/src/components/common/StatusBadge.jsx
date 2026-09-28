import React from 'react';
import { Clock, PlayCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();

  let badgeClass = 'badge-muted';
  let icon = <Clock size={12} />;
  let label = status || 'Unknown';

  if (s === 'submitted' || s === 'open') {
    badgeClass = 'badge-info';
    icon = <Clock size={12} />;
    label = 'Submitted';
  } else if (s === 'in_progress') {
    badgeClass = 'badge-warning';
    icon = <PlayCircle size={12} />;
    label = 'In Progress';
  } else if (s === 'resolved' || s === 'closed') {
    badgeClass = 'badge-success';
    icon = <CheckCircle2 size={12} />;
    label = s === 'resolved' ? 'Resolved' : 'Closed';
  } else if (s === 'rejected' || s === 'cancelled') {
    badgeClass = 'badge-danger';
    icon = <XCircle size={12} />;
    label = s === 'rejected' ? 'Rejected' : 'Cancelled';
  } else if (s === 'on_hold' || s === 'pending') {
    badgeClass = 'badge-muted';
    icon = <AlertCircle size={12} />;
    label = 'Pending';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};
