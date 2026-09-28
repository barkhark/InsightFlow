import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import {
  ArrowLeft, ArrowRightCircle, XCircle, CheckCircle, MessageSquare,
  Send, Lock, Globe, Paperclip, Clock, ShieldAlert, FileText,
  Activity, ShieldCheck, User, Building2, Zap, AlertTriangle, Download,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */
const STATUS_META = {
  submitted:   { label: 'Submitted',   cls: 'badge badge-info' },
  in_progress: { label: 'In Progress', cls: 'badge badge-warning' },
  pending:     { label: 'Pending',     cls: 'badge badge-muted' },
  resolved:    { label: 'Resolved',    cls: 'badge badge-success' },
  rejected:    { label: 'Rejected',    cls: 'badge badge-danger' },
  closed:      { label: 'Closed',      cls: 'badge badge-muted' },
  cancelled:   { label: 'Cancelled',   cls: 'badge badge-muted' },
};
const PRIORITY_META = {
  critical: 'badge priority-critical',
  high:     'badge priority-high',
  medium:   'badge priority-medium',
  low:      'badge priority-low',
};
const SLA_RISK_COLOR = {
  safe: 'var(--sla-safe)', warning: 'var(--sla-warning)',
  critical: 'var(--sla-critical)', breached: 'var(--sla-breached)',
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ── Stepper ──────────────────────────────────────────────── */
const WowStepper = ({ history, currentStage, allStages }) => {
  const passedIds = new Set((history || []).map(h => h.stage_id));
  return (
    <div className="stepper">
      {(allStages || []).map((stage, idx) => {
        const isActive = currentStage?.id === stage.id;
        const isDone   = passedIds.has(stage.id) && !isActive;
        const isReject = stage.is_rejection;
        const cls = isReject && isActive ? 'rejected' : isDone ? 'done' : isActive ? 'active' : '';
        return (
          <div key={stage.id} className={`stepper-step ${cls}`}>
            <div className="stepper-dot">
              {isDone && !isReject ? <CheckCircle size={13} strokeWidth={3} /> : idx + 1}
            </div>
            <div className="stepper-label">{stage.name}</div>
          </div>
        );
      })}
    </div>
  );
};

export const StaffProcessRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Transition Modal State
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [selectedTargetStage, setSelectedTargetStage] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState('');

  // Comment State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.getStaffRequestDetail(id);
      if (res.success && res.data) {
        setRequest(res.data);
        setComments(res.data.comments || []);
      }
    } catch (err) {
      setError('Failed to load request details or access is restricted.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransition = async (e) => {
    e?.preventDefault();
    if (!selectedTargetStage) return;

    setTransitioning(true);
    setTransitionError('');

    try {
      const res = await requestsApi.transitionRequest(id, selectedTargetStage, transitionNote);
      if (res.success) {
        setShowTransitionModal(false);
        setTransitionNote('');
        setSelectedTargetStage('');
        await fetchDetail();
      }
    } catch (err) {
      setTransitionError(err.response?.data?.error?.message || 'Transition execution failed.');
    } finally {
      setTransitioning(false);
    }
  };

  const handlePostComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      const res = await requestsApi.addStaffComment(id, newComment.trim(), isInternalComment);
      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setNewComment('');
        await fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading processing workspace…</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error || 'Request not found'}</h3>
        <button onClick={() => navigate('/staff/queue')} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Queue</span>
        </button>
      </div>
    );
  }

  const isTerminal = ['resolved', 'rejected', 'closed', 'cancelled'].includes(request.status.toLowerCase());
  const allowedTransitions = request.allowed_transitions || [];
  const sm = STATUS_META[request.status] || STATUS_META.submitted;
  const sla = request.sla;
  const ledger = request.responsibility_ledger || {};
  const risk = request.risk || { risk_level: 'low', explanation: '' };
  const health = request.health || { score: 100, status: 'healthy', summary: '', penalties: [] };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Top Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/staff/queue')}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: '0.875rem' }}
        >
          <ArrowLeft size={14} /> Back to Queue
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
              <code style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--primary)', background: 'var(--primary-glow)',
                border: '1px solid rgba(79,70,229,0.25)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)',
              }}>
                {request.reference_number}
              </code>
              <span className={sm.cls}>{sm.label}</span>
              <span className={PRIORITY_META[request.priority] || 'badge badge-muted'}>{request.priority}</span>
              {sla && (
                <span className={`badge sla-${sla.risk_level}`}>
                  SLA: {sla.risk_level} ({sla.elapsed_pct?.toFixed(0)}%)
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {request.title}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Submitted by <strong>{request.student?.full_name}</strong> ({request.student?.profile?.roll_number || 'Student'}) · {request.service_category?.name}
            </p>
          </div>

          {/* Action Trigger Button */}
          {!isTerminal && allowedTransitions.length > 0 && (
            <button
              onClick={() => {
                setSelectedTargetStage(allowedTransitions[0]?.id || '');
                setShowTransitionModal(true);
              }}
              className="btn btn-primary"
              style={{ padding: '0.625rem 1.25rem' }}
            >
              <ArrowRightCircle size={17} />
              <span>Advance Workflow Stage ({allowedTransitions.length})</span>
            </button>
          )}

          {isTerminal && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-md)',
              background: request.status === 'resolved' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: request.status === 'resolved' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${request.status === 'resolved' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {request.status === 'resolved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              Terminal Stage: {request.current_stage?.name}
            </div>
          )}
        </div>
      </div>

      {/* ── Workflow Stepper ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
          Workflow State Machine Progression
        </div>
        <WowStepper
          history={request.stage_history}
          currentStage={request.current_stage}
          allStages={request.service_category?.workflow_stages || request.stage_history?.map(h => ({ id: h.stage_id, name: h.stage_name, is_rejection: h.is_rejection })) || []}
        />
      </div>

      {/* ── Main Workspace Grid ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT: Content & Tabs ─────────────────────────── */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-glass)', marginBottom: '1.25rem' }}>
            {[
              { key: 'overview', label: 'Request Details' },
              { key: 'timeline', label: `Accountability (${(request.audit_records || []).length})` },
              { key: 'comments', label: `Discussion (${comments.length})` },
              { key: 'attachments', label: `Attachments (${(request.attachments || []).length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.625rem 1rem', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--primary)' : 'transparent'}`,
                  marginBottom: '-2px', whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <div className="label-text" style={{ marginBottom: '0.75rem' }}>Student Description</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                  {request.details}
                </p>
              </div>

              {request.dynamic_fields_data && Object.keys(request.dynamic_fields_data).length > 0 && (
                <div className="card">
                  <div className="label-text" style={{ marginBottom: '0.75rem' }}>Submitted Form Attributes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {Object.entries(request.dynamic_fields_data).map(([key, value]) => (
                      <div key={key} style={{ background: 'var(--bg-primary)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Timeline */}
          {activeTab === 'timeline' && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>Immutable Audit Records</div>
              <div className="timeline">
                {[...(request.audit_records || [])].reverse().map((rec, idx) => (
                  <div key={rec.id || idx} className="timeline-item">
                    <div className={`timeline-dot ${rec.action === 'transitioned' ? 'success' : ''}`} />
                    <div style={{ marginLeft: '0.25rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                        {rec.description || rec.action}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Actor: {rec.actor_name || 'System'} · {fmtShort(rec.created_at)}
                      </div>
                      {rec.notes && (
                        <div style={{
                          marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-secondary)',
                          background: 'var(--bg-primary)', padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)',
                        }}>
                          {rec.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Comments */}
          {activeTab === 'comments' && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>
                <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Internal Notes & Public Communication
              </div>
              <div style={{ marginBottom: '1.25rem', maxHeight: '400px', overflowY: 'auto' }}>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No communication logged yet.</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={c.id || i} style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem',
                      background: c.is_internal ? 'var(--warning-bg)' : 'var(--bg-primary)',
                      border: `1px solid ${c.is_internal ? 'var(--warning-border)' : 'var(--border-glass)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.author_name}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>({c.author_role})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {c.is_internal ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                              <Lock size={10} /> Internal Staff Note
                            </span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              <Globe size={10} /> Public to Student
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmtShort(c.created_at)}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, marginTop: '0.25rem' }}>{c.body}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <textarea
                  className="input-field"
                  placeholder={isInternalComment ? "Add an internal note (visible only to staff/admin)..." : "Write a response to the student..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ minHeight: '4.5rem' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                    />
                    <Lock size={13} color="var(--warning)" />
                    <span>Internal note (hide from student)</span>
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={postingComment || !newComment.trim()}>
                    {postingComment ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={14} />}
                    <span>Post Note</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab: Attachments */}
          {activeTab === 'attachments' && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>Uploaded Verification Documents</div>
              {(request.attachments || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No attachments uploaded for this request.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(request.attachments || []).map((att, i) => (
                    <div key={att.id || i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} color="var(--primary)" />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{att.original_filename}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{att.file_size_mb}MB · Uploaded by {att.uploaded_by_name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Responsibility Ledger & Diagnostics ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Responsibility Ledger */}
          <div className="card">
            <div className="label-text" style={{ marginBottom: '0.875rem' }}>
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Responsibility Ledger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { icon: Building2, label: 'Department', value: ledger.department_name || '—' },
                { icon: User, label: 'Assigned Officer', value: ledger.assigned_staff_name || 'Unassigned' },
                { icon: Activity, label: 'Current Stage', value: ledger.current_stage_name || request.current_stage?.name || '—' },
                { icon: Clock, label: 'Stage Dwell Time', value: ledger.stage_dwell_time || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <Icon size={14} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
            {ledger.next_expected_action && (
              <div style={{
                marginTop: '0.875rem', padding: '0.625rem 0.75rem',
                background: 'var(--primary-glow)', border: '1px solid rgba(79,70,229,0.2)',
                borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--primary)', lineHeight: 1.5,
              }}>
                <Zap size={11} style={{ display: 'inline', marginRight: '4px' }} />
                <strong>Next:</strong> {ledger.next_expected_action}
              </div>
            )}
          </div>

          {/* SLA Performance Card */}
          {sla && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '0.75rem' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Stage SLA Diagnosis
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Elapsed Time:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sla.elapsed_minutes}m / {sla.target_minutes}m</span>
              </div>
              <div className="progress-track" style={{ marginBottom: '0.75rem' }}>
                <div className={`progress-fill ${sla.risk_level}`} style={{ width: `${Math.min(100, sla.elapsed_pct)}%` }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sla.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Transition Modal (Decision Q2) ─────────────────── */}
      {showTransitionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Advance Workflow Stage
              </h2>
              <span className="badge badge-primary">State Machine</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select target stage according to institutional verification procedures. All transitions are logged to the immutable audit ledger.
            </p>

            {transitionError && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{transitionError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTransition} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label className="input-label">Select Next Stage *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {allowedTransitions.map((t) => {
                    const isSelected = selectedTargetStage === t.id;
                    const isRej = t.is_rejection;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTargetStage(t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          background: isSelected
                            ? isRej ? 'var(--danger-bg)' : 'var(--primary-glow)'
                            : 'var(--bg-primary)',
                          border: `1.5px solid ${
                            isSelected
                              ? isRej ? 'var(--danger)' : 'var(--primary)'
                              : 'var(--border-glass)'
                          }`,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            border: `2px solid ${isSelected ? (isRej ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isSelected && (
                              <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: isRej ? 'var(--danger)' : 'var(--primary)',
                              }} />
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {t.name}
                            </span>
                            {t.sla_target_hours && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Target: {t.sla_target_hours}h SLA
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          {isRej ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                              Rejected (Terminal)
                            </span>
                          ) : t.is_terminal ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                              Completion (Terminal)
                            </span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              Forward Stage
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rejection Warning Banner */}
              {allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                  color: 'var(--danger)', fontSize: '0.8rem', lineHeight: 1.5,
                }}>
                  <strong>⚠ Warning:</strong> You are executing a terminal rejection. The student will be notified and this request will be permanently closed in the institutional record. A transition justification is required.
                </div>
              )}

              <div>
                <label className="input-label">
                  Transition Notes / Justification
                  {allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection && (
                    <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>* (Required for Rejection)</span>
                  )}
                </label>
                <textarea
                  className="input-field"
                  placeholder={
                    allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection
                      ? "Explain the exact reason for rejecting this service request..."
                      : "Provide verification notes, certificate numbers, or handoff details..."
                  }
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  rows={3}
                  required={allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTransitionModal(false)}
                  disabled={transitioning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection ? 'btn btn-danger' : 'btn btn-primary'}
                  disabled={transitioning || !selectedTargetStage}
                >
                  {transitioning ? (
                    'Executing Transition…'
                  ) : allowedTransitions.find(t => t.id === selectedTargetStage)?.is_rejection ? (
                    'Confirm Rejection'
                  ) : (
                    'Confirm Stage Change'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
