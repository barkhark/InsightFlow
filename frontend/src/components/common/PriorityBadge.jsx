import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const p = (priority || '').toLowerCase();
  const cls = `priority-${p}` in { 'priority-critical': 1, 'priority-high': 1, 'priority-medium': 1, 'priority-low': 1 }
    ? `priority-${p}`
    : 'priority-low';

  return (
    <span className={`badge ${cls}`}>
      {priority}
    </span>
  );
};
