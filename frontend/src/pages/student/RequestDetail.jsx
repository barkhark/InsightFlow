import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import {
  ArrowLeft, Paperclip, Send, Download, AlertTriangle, Clock, CheckCircle2,
  FileText, Building2, User, ShieldCheck, Activity, Info, ChevronRight,
  TrendingDown, Zap, MessageSquare, XCircle, Copy, Check, Lock, Globe,
  Printer, ShieldAlert, Sparkles, Star, Award, RotateCcw,
} from 'lucide-react';
import { FeedbackRatingModal } from '../../components/common/FeedbackRatingModal';
import { PrintableSlipModal } from '../../components/common/PrintableSlipModal';
import { PredictiveForecastWidget } from '../../components/common/PredictiveForecastWidget';


/* ── Helpers ──────────────────────────────────────────────── */
const STATUS_META = {
  submitted:    { label: 'Submitted',    cls: 'badge badge-info' },
  in_progress:  { label: 'In Progress',  cls: 'badge badge-warning' },
  pending:      { label: 'Pending',      cls: 'badge badge-muted' },
  resolved:     { label: 'Resolved',     cls: 'badge badge-success' },
  rejected:     { label: 'Rejected',     cls: 'badge badge-danger' },
  closed:       { label: 'Closed',       cls: 'badge badge-muted' },
  cancelled:    { label: 'Cancelled',    cls: 'badge badge-muted' },
};
const PRIORITY_META = {
  critical: 'badge priority-critical',
  high:     'badge priority-high',
  medium:   'badge priority-medium',
  low:      'badge priority-low',
};
const SLA_RISK_COLOR = {
  safe: 'var(--sla-safe)', warning: 'var(--sla-warning)',
  critical: 'var(--sla-critical)', breached: 'var(--sla-breached)', unknown: 'var(--text-muted)',
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ── SVG Health Gauge Dial (0 - 100) ──────────────────────── */
const HealthDial = ({ score = 100, status = 'healthy' }) => {
  const radius = 38;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = status === 'healthy' ? 'var(--success)' : status === 'attention' ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ position: 'relative', width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg height="84" width="84" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            stroke="var(--border-glass)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="42"
            cy="42"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="42"
            cy="42"
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>/ 100</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {status === 'healthy' ? '● Healthy Pipeline' : status === 'attention' ? '▲ Needs Attention' : '✖ High Risk'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
          {status === 'healthy' ? 'SLA is on track with low operational friction.' : status === 'attention' ? 'Experiencing moderate processing dwell.' : 'SLA breach detected. Escalation suggested.'}
        </div>
      </div>
    </div>
  );
};

/* ── Interactive Workflow Stepper ─────────────────────────── */
const StepperPipeline = ({ history = [], currentStage, allStages = [], status }) => {
  const passedIds = new Set(history.map(h => h.stage_id));
  const isRejected = (status || '').toLowerCase() === 'rejected';

  const stagesToRender = allStages.length > 0
    ? allStages
    : history.map(h => ({ id: h.stage_id, name: h.stage_name, is_rejection: h.is_rejection }));

  return (
    <div className="stepper-container">
      {stagesToRender.map((stage, idx) => {
        const isActive = currentStage?.id === stage.id;
        const isDone = passedIds.has(stage.id) && !isActive;
        const isRej = stage.is_rejection;
        const cls = isRej && (isActive || isRejected) ? 'rejected' : isDone ? 'done' : isActive ? 'active' : '';

        return (
          <div key={stage.id || idx} className={`stepper-node ${cls}`}>
            <div className="stepper-node-line" />
            <div className="stepper-node-circle">
              {isDone && !isRej ? (
                <CheckCircle2 size={16} color="#ffffff" strokeWidth={3} />
              ) : isRej && (isActive || isRejected) ? (
                <XCircle size={16} color="#ffffff" strokeWidth={3} />
              ) : (
                idx + 1
              )}
            </div>
            <div className="stepper-node-label">
              {stage.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // New interactive feature states
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.getStudentRequestDetail(id);
      if (res.success && res.data) setRequest(res.data);
    } catch { setError('Failed to load request details.'); }
    finally { setLoading(false); }
  };

  const handleCopyRef = () => {
    if (!request?.reference_number) return;
    navigator.clipboard.writeText(request.reference_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      await requestsApi.addStudentComment(id, newComment.trim());
      setNewComment('');
      await fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to post comment.');
    } finally { setPostingComment(false); }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      await requestsApi.uploadAttachment(id, file);
      await fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'File upload failed. Terminal requests are locked.');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    setSubmittingAppeal(true);
    try {
      await requestsApi.submitAppeal(id, appealReason.trim());
      setShowAppealModal(false);
      setAppealReason('');
      await fetchDetail();
      alert('Your appeal has been successfully submitted to the Department Supervisor.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit appeal.');
    } finally {
      setSubmittingAppeal(false);
    }
  };


  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading institutional record…</p>
    </div>
  );

  if (error || !request) return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>
      <AlertTriangle size={32} style={{ marginBottom: '1rem' }} />
      <p>{error || 'Request not found.'}</p>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
        <ArrowLeft size={14} /> Back
      </button>
    </div>
  );

  const sm = STATUS_META[request.status] || STATUS_META.submitted;
  const risk = request.risk || { risk_level: 'low', explanation: '' };
  const health = request.health || { score: 100, status: 'healthy', summary: '', penalties: [] };
  const sla = request.sla;
  const ledger = request.responsibility_ledger || {};
  const isTerminal = ['resolved', 'rejected', 'closed', 'cancelled'].includes(request.status);

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Top Header Navigation Bar ──────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back to Requests
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyRef} title="Copy tracking reference">
              {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Reference!' : 'Copy Ref'}</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSlipModal(true)}
              title="Official Institutional Slip"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={14} />
              <span>Official Slip & Certificate</span>
            </button>

            {/* CSAT Rating Trigger */}
            {(request.status === 'resolved' || request.status === 'closed') && (
              request.feedback ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#b45309',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <span>Rated {request.feedback.rating}★</span>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowFeedbackModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.35)',
                    backgroundColor: '#1a4a8a',
                  }}
                >
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>Rate Experience</span>
                </button>
              )
            )}

            {/* Appeal Rejection Trigger */}
            {request.status === 'rejected' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setShowAppealModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={14} />
                <span>Submit Formal Appeal</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Card */}
        <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <code style={{
                  fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)',
                  background: 'var(--primary-glow)', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
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
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {request.title}
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {request.service_category?.name} · Submitted {fmtDate(request.created_at)} by <strong>{request.student?.full_name}</strong>
              </p>
            </div>

            {/* Health Dial */}
            {!isTerminal && (
              <div style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: '1.5rem' }}>
                <HealthDial score={health.score} status={health.status} />
              </div>
            )}
            {isTerminal && request.status === 'resolved' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                color: 'var(--success)', fontSize: '0.9rem', fontWeight: 800,
              }}>
                <CheckCircle2 size={20} />
                <span>Resolved & Certified</span>
              </div>
            )}
            {isTerminal && request.status === 'rejected' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 800,
              }}>
                <XCircle size={20} />
                <span>Terminal Rejection</span>
              </div>
            )}
          </div>

          {/* Stepper Pipeline */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-glass)' }}>
            <StepperPipeline
              history={request.stage_history}
              currentStage={request.current_stage}
              allStages={request.service_category?.workflow_stages || []}
              status={request.status}
            />
          </div>
        </div>

        {/* Predictive Intelligence & Campus ERP Widget */}
        <div style={{ marginTop: '1.25rem' }}>
          <PredictiveForecastWidget
            forecast={request.predictive_forecast}
            erpProfile={request.erp_verification}
            isTerminal={isTerminal}
          />
        </div>
      </div>


      {/* ── Main Workspace Grid ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT COLUMN: Interactive Tabs ───────────────── */}
        <div>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-glass)',
            marginBottom: '1.25rem', overflowX: 'auto',
          }}>
            {[
              { key: 'overview',    label: 'Request Details & Dynamic Data' },
              { key: 'timeline',    label: `Audit Trail (${(request.audit_records || []).length})` },
              { key: 'comments',    label: `Communication (${(request.comments || []).length})` },
              { key: 'attachments', label: `Documents (${(request.attachments || []).length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.65rem 1rem', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
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

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <div className="label-text" style={{ marginBottom: '0.75rem' }}>Statement of Request / Justification</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                  {request.details}
                </p>
              </div>

              {/* Dynamic Attributes Grid */}
              {request.dynamic_fields_data && Object.keys(request.dynamic_fields_data).length > 0 && (
                <div className="card">
                  <div className="label-text" style={{ marginBottom: '0.875rem' }}>
                    <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Department Dynamic Requirements
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {Object.entries(request.dynamic_fields_data).map(([key, value]) => (
                      <div key={key} style={{
                        background: 'var(--bg-app)', padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)',
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Score Penalty Breakdown */}
              {!isTerminal && health.penalties?.length > 0 && (
                <div className="card">
                  <div className="label-text" style={{ marginBottom: '0.75rem' }}>
                    <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Pipeline Health Diagnostic Factors
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {health.summary}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {health.penalties.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem', background: 'var(--danger-bg)',
                        border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)' }}>{p.factor}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.detail}</div>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--danger)' }}>-{p.deduction} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Audit Timeline */}
          {activeTab === 'timeline' && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="label-text">Immutable Cryptographic Audit Trail</div>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                  <ShieldCheck size={11} /> SHA-256 Ledger
                </span>
              </div>
              {(request.audit_records || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No audit records recorded yet.</p>
              ) : (
                <div className="timeline">
                  {[...(request.audit_records || [])].reverse().map((rec, idx) => (
                    <div key={rec.id || idx} className="timeline-item">
                      <div className={`timeline-dot ${rec.action === 'transitioned' ? 'success' : ''}`}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                      </div>
                      <div style={{ marginLeft: '0.25rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                          {rec.description || rec.action}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Actor: <strong>{rec.actor_name || 'System Engine'}</strong> · {fmtDate(rec.created_at)}
                        </div>
                        {rec.notes && (
                          <div style={{
                            marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)',
                            background: 'var(--bg-app)', padding: '0.625rem 0.875rem',
                            borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)',
                            lineHeight: 1.5,
                          }}>
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Comments Feed */}
          {activeTab === 'comments' && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>
                <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Institutional Message Thread
              </div>
              <div style={{ marginBottom: '1.25rem', maxHeight: '420px', overflowY: 'auto' }}>
                {(request.comments || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>No comments posted yet.</p>
                ) : (
                  (request.comments || []).map((c, i) => {
                    const isStudent = c.author_role === 'student';
                    return (
                      <div key={c.id || i} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isStudent ? 'flex-end' : 'flex-start',
                        marginBottom: '1rem',
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                          {c.author_name} · {c.author_role} · {fmtShort(c.created_at)}
                        </div>
                        <div style={{
                          maxWidth: '85%', padding: '0.75rem 1rem',
                          borderRadius: isStudent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isStudent ? 'var(--primary)' : 'var(--bg-card-hover)',
                          color: isStudent ? '#ffffff' : 'var(--text-primary)',
                          border: `1px solid ${isStudent ? 'transparent' : 'var(--border-glass)'}`,
                          fontSize: '0.875rem', lineHeight: 1.55,
                        }}>
                          {c.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!isTerminal && (
                <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.625rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Write a message to department officers..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={postingComment || !newComment.trim()}>
                    {postingComment ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={15} />}
                    <span>Send</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 4: Attachments */}
          {activeTab === 'attachments' && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>
                <Paperclip size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Uploaded Documents & Verification Files
              </div>
              {!isTerminal && (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '1rem', borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border-glass)', cursor: 'pointer',
                  color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600,
                  marginBottom: '1rem', background: 'var(--primary-glow)',
                }}>
                  <Paperclip size={16} />
                  <span>{uploadingAttachment ? 'Uploading Verification File…' : 'Click to Upload Supporting Document (PDF / Image)'}</span>
                  <input type="file" hidden onChange={handleUploadAttachment} disabled={uploadingAttachment} />
                </label>
              )}
              {(request.attachments || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No attachments uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {(request.attachments || []).map((att, i) => (
                    <div key={att.id || i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1rem', background: 'var(--bg-app)',
                      border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={18} color="var(--primary)" />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{att.original_filename}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{att.file_size_mb} MB · Uploaded by {att.uploaded_by_name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Ownership & SLA Diagnosis ─────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Responsibility & Desk Ownership Ledger */}
          <div className="card">
            <div className="label-text" style={{ marginBottom: '1rem' }}>
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Responsibility Ledger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { icon: Building2, label: 'Owning Department', value: ledger.department_name || 'Academic Administration' },
                { icon: User, label: 'Desk Officer In-Charge', value: ledger.assigned_staff_name || 'Department Pool' },
                { icon: Activity, label: 'Current Active Stage', value: ledger.current_stage_name || request.current_stage?.name || '—' },
                { icon: Clock, label: 'Stage Dwell Time', value: ledger.stage_dwell_time || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '2px',
                  }}>
                    <Icon size={14} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {ledger.next_expected_action && (
              <div style={{
                marginTop: '1.25rem', padding: '0.75rem 1rem',
                background: 'var(--primary-glow)', border: '1px solid rgba(79, 70, 229, 0.25)',
                borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--primary)', lineHeight: 1.5,
              }}>
                <Zap size={13} style={{ display: 'inline', marginRight: '4px' }} />
                <strong>Next Expected Action:</strong> {ledger.next_expected_action}
              </div>
            )}
          </div>

          {/* SLA Intelligence & Target Clock */}
          {sla && (
            <div className="card">
              <div className="label-text" style={{ marginBottom: '0.75rem' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                SLA Countdown & Diagnostic
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Elapsed Time:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{sla.elapsed_minutes}m / {sla.target_minutes}m</span>
              </div>
              <div className="progress-track" style={{ height: '8px', marginBottom: '0.75rem' }}>
                <div className={`progress-fill ${sla.risk_level}`} style={{ width: `${Math.min(100, sla.elapsed_pct)}%` }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sla.explanation}
              </p>
            </div>
          )}

          {/* Verified Student Feedback Card */}
          {request.feedback && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="label-text" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={13} color="#f59e0b" /> Verified CSAT Rating
                </span>
                <span style={{ color: '#f59e0b', fontWeight: 800 }}>{request.feedback.rating}★ / 5.0</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={15}
                    fill={s <= request.feedback.rating ? '#f59e0b' : 'none'}
                    color={s <= request.feedback.rating ? '#f59e0b' : '#cbd5e1'}
                  />
                ))}
              </div>
              {request.feedback.comment && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                  "{request.feedback.comment}"
                </p>
              )}
              {request.feedback.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {request.feedback.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        color: '#b45309',
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Printable Official Slip & Audit Certificate Modal */}
      <PrintableSlipModal
        request={request}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />

      {/* Feedback CSAT Modal */}
      <FeedbackRatingModal
        request={request}
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onFeedbackSubmitted={(fb) => {
          setRequest((prev) => ({ ...prev, feedback: fb }));
        }}
      />

      {/* Formal Appeal Modal */}
      {showAppealModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 45, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowAppealModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
              Lodge Formal Rejection Appeal
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              If your request was rejected due to missing documentation or misunderstanding, explain your clarification below. This will be routed to the Department Supervisor.
            </p>
            <form onSubmit={handleAppealSubmit}>
              <textarea
                rows={4}
                required
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explain the grounds for your appeal..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-input)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: '1rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAppealModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={submittingAppeal || !appealReason.trim()}
                >
                  {submittingAppeal ? 'Submitting...' : 'Submit Formal Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

