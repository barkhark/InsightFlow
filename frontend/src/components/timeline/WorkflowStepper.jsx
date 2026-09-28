import React from 'react';
import { Check, Clock, XCircle, ArrowRight } from 'lucide-react';

export const WorkflowStepper = ({ currentStage, stageHistory = [], status }) => {
  if (!stageHistory || stageHistory.length === 0) return null;

  const isTerminal = ['resolved', 'rejected', 'closed', 'cancelled'].includes((status || '').toLowerCase());
  const isRejected = (status || '').toLowerCase() === 'rejected';

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Workflow Progression Path
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {stageHistory.length} stage(s) recorded
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {stageHistory.map((item, index) => {
          const isCurrent = item.exited_at === null;
          const isCompleted = item.exited_at !== null;
          const isBreached = item.sla_breached;

          let stepBg = 'var(--bg-primary)';
          let stepBorder = 'var(--border-glass)';
          let stepColor = 'var(--text-secondary)';
          let icon = <Clock size={14} />;

          if (isCompleted) {
            stepBg = 'var(--success-bg)';
            stepBorder = 'var(--success-border)';
            stepColor = 'var(--success)';
            icon = <Check size={14} />;
          }

          if (isCurrent) {
            if (isRejected) {
              stepBg = 'var(--danger-bg)';
              stepBorder = 'var(--danger-border)';
              stepColor = 'var(--danger)';
              icon = <XCircle size={14} />;
            } else {
              stepBg = 'var(--primary-glow)';
              stepBorder = 'rgba(79, 70, 229, 0.35)';
              stepColor = 'var(--primary)';
              icon = <Clock size={14} />;
            }
          }

          return (
            <React.Fragment key={item.id || index}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: stepBg,
                  border: `1.5px solid ${stepBorder}`,
                  color: stepColor,
                  minWidth: 'fit-content',
                  boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {item.stage_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isCurrent ? (isTerminal ? 'Finished' : 'Current Stage') : `${item.duration_minutes || 0}m elapsed`}
                    {isBreached && <span style={{ color: 'var(--danger)', marginLeft: '4px', fontWeight: 700 }}>⚠ Breached</span>}
                  </div>
                </div>
              </div>

              {index < stageHistory.length - 1 && (
                <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
