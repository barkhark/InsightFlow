import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  Star, ArrowLeft, Download, RefreshCw, BarChart3,
  TrendingUp, Users, Heart, ThumbsUp, ThumbsDown, Minus,
  Hash, MessageCircle, Award, Sparkles, PieChart, Calendar,
  FileSpreadsheet, Filter, ArrowUpRight,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ── Sentiment Badge ─────────────────────────────────────────── */
const sentimentConfig = {
  Delighted:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', emoji: '😍' },
  Satisfied:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.30)', emoji: '😊' },
  Neutral:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.30)', emoji: '😐' },
  Dissatisfied: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', emoji: '😟' },
  Frustrated:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)',  emoji: '😤' },
};

/* ── NPS Gauge ─────────────────────────────────────────────── */
const NPSGauge = ({ score }) => {
  const normalizedScore = Math.max(-100, Math.min(100, score));
  const angle = ((normalizedScore + 100) / 200) * 180; // -100 to 100 => 0 to 180
  const color = normalizedScore >= 50 ? '#10b981' : normalizedScore >= 0 ? '#3b82f6' : normalizedScore >= -50 ? '#f59e0b' : '#ef4444';
  const label = normalizedScore >= 50 ? 'Excellent' : normalizedScore >= 0 ? 'Good' : normalizedScore >= -50 ? 'Needs Work' : 'Critical';

  return (
    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
      <div style={{ position: 'relative', width: '160px', height: '90px', margin: '0 auto' }}>
        {/* Background arc */}
        <svg width="160" height="90" viewBox="0 0 160 90" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="npsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="url(#npsGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="url(#npsGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 220} 220`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>
            {normalizedScore > 0 ? '+' : ''}{normalizedScore}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
        Net Promoter Score
      </div>
    </div>
  );
};

/* ── Rating Star Row ──────────────────────────────────────────── */
const StarRating = ({ rating, size = 14 }) => (
  <div style={{ display: 'flex', gap: '1px' }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        fill={s <= rating ? '#f59e0b' : 'none'}
        color={s <= rating ? '#f59e0b' : '#cbd5e1'}
      />
    ))}
  </div>
);

/* ── Horizontal Bar ─────────────────────────────────────────── */
const HorizontalBar = ({ value, max, color, label, count }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{count} ({value.toFixed(1)}%)</span>
      </div>
      <div style={{
        height: '8px', borderRadius: '4px', background: 'var(--bg-app)',
        border: '1px solid var(--border-glass)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '4px', background: color,
          width: `${pct}%`, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

/* ── Department Score Card ────────────────────────────────────── */
const DeptScoreCard = ({ dept }) => {
  const rating = dept.avg_rating;
  const color = rating >= 4.5 ? '#10b981' : rating >= 3.5 ? '#3b82f6' : rating >= 2.5 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      padding: '1rem', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {dept.department}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <StarRating rating={Math.round(rating)} size={12} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dept.count} reviews</span>
        </div>
      </div>
      <div style={{
        fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1,
        padding: '0.3rem 0.7rem', borderRadius: '8px',
        background: `${color}14`, border: `1px solid ${color}30`,
      }}>
        {rating.toFixed(1)}
      </div>
    </div>
  );
};

/* ── Review Card ─────────────────────────────────────────────── */
const ReviewCard = ({ review }) => (
  <div style={{
    padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
    borderLeft: `3px solid ${review.rating >= 4 ? '#10b981' : review.rating >= 3 ? '#3b82f6' : '#ef4444'}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <StarRating rating={review.rating} size={13} />
        <code style={{
          fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)',
          background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '4px',
        }}>
          {review.reference_number}
        </code>
      </div>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        {fmtDate(review.created_at)}
      </span>
    </div>
    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
      {review.student_name}
      {review.category_name && (
        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}> · {review.category_name}</span>
      )}
    </div>
    {review.comment && (
      <p style={{
        fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic',
        lineHeight: 1.5, margin: '0.3rem 0',
      }}>
        "{review.comment}"
      </p>
    )}
    {review.tags?.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem' }}>
        {review.tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: '0.64rem', padding: '2px 6px', borderRadius: '4px',
              backgroundColor: 'rgba(245,158,11,0.1)', color: '#b45309', fontWeight: 600,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    )}
  </div>
);


/* ================================================================= */
/*  Main Component                                                    */
/* ================================================================= */
export const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [days, setDays] = useState(90);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCSATAnalytics(days);
      if (res.success && res.data) setData(res.data);
    } catch (err) {
      console.error('Failed to load CSAT analytics', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCSVExport = async () => {
    setExporting(true);
    try {
      await adminApi.downloadCSVExport();
    } catch (err) {
      console.error('CSV export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Computing satisfaction intelligence…</p>
    </div>
  );

  const overview = data?.overview || {};
  const distribution = data?.distribution || [];
  const weeklyTrend = data?.weekly_trend || [];
  const departments = data?.department_breakdown || [];
  const tags = data?.top_tags || [];
  const reviews = data?.recent_reviews || [];

  const maxTagCount = Math.max(...tags.map(t => t.count), 1);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '0.875rem' }}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 className="page-title">Reports & Satisfaction Hub</h1>
              <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" style={{ marginRight: '3px' }} />
                CSAT Analytics
              </span>
            </div>
            <p className="page-subtitle">
              Institutional satisfaction intelligence, NPS scoring, department-wise breakdown, and data export capabilities.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '130px' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 180 Days</option>
              <option value={365}>Last 1 Year</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCSVExport}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={14} />
              <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>


      {/* ── Executive Satisfaction KPI Row ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          {
            label: 'Average Score',
            value: overview.average_score?.toFixed(1) || '—',
            unit: ' / 5.0',
            icon: Star,
            color: '#f59e0b',
            desc: `Based on ${overview.total_responses || 0} total responses`,
          },
          {
            label: 'NPS Score',
            value: overview.nps_score !== undefined ? (overview.nps_score > 0 ? '+' : '') + overview.nps_score : '—',
            unit: '',
            icon: TrendingUp,
            color: overview.nps_score >= 50 ? '#10b981' : overview.nps_score >= 0 ? '#3b82f6' : '#ef4444',
            desc: 'Net Promoter Score (-100 to +100)',
          },
          {
            label: 'Promoters',
            value: overview.promoter_count || 0,
            unit: '',
            icon: ThumbsUp,
            color: '#10b981',
            desc: 'Rated 4★ or 5★ (Satisfied+)',
          },
          {
            label: 'Neutral',
            value: overview.neutral_count || 0,
            unit: '',
            icon: Minus,
            color: '#8b5cf6',
            desc: 'Rated exactly 3★',
          },
          {
            label: 'Detractors',
            value: overview.detractor_count || 0,
            unit: '',
            icon: ThumbsDown,
            color: '#ef4444',
            desc: 'Rated 1★ or 2★',
          },
        ].map(({ label, value, unit, icon: Icon, color, desc }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: `${color}18`, border: `1.5px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.2rem' }}>
              {value}<span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>
              {label}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
          </div>
        ))}
      </div>


      {/* ── Main Grid: Charts & Analysis ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', marginBottom: '1.75rem' }}>

        {/* LEFT: Rating Distribution + Weekly Trend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Rating Sentiment Distribution */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Satisfaction Sentiment Distribution
                </h3>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                {overview.total_responses || 0} Responses
              </span>
            </div>

            {distribution.map((d) => {
              const cfg = sentimentConfig[d.label] || sentimentConfig.Neutral;
              return (
                <div key={d.rating} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{cfg.emoji}</span>
                      <StarRating rating={d.rating} size={12} />
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '999px', background: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                      }}>
                        {d.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: cfg.color }}>
                      {d.count} ({d.percentage}%)
                    </span>
                  </div>
                  <div style={{
                    height: '10px', borderRadius: '5px', background: 'var(--bg-app)',
                    border: '1px solid var(--border-glass)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '5px', background: cfg.color,
                      width: `${d.percentage}%`, transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly Satisfaction Trend */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="var(--secondary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Weekly Satisfaction Trend
                </h3>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                <Calendar size={10} style={{ marginRight: '3px' }} /> {weeklyTrend.length} Weeks
              </span>
            </div>

            {weeklyTrend.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Not enough data for weekly trends.
              </div>
            ) : (
              <div>
                {/* Bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', marginBottom: '0.75rem' }}>
                  {weeklyTrend.map((w, i) => {
                    const pct = (w.avg_rating / 5) * 100;
                    const color = w.avg_rating >= 4 ? '#10b981' : w.avg_rating >= 3 ? '#3b82f6' : '#f59e0b';
                    return (
                      <div
                        key={w.week}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', height: '100%', justifyContent: 'flex-end',
                        }}
                        title={`Week of ${fmtDate(w.week)}: ${w.avg_rating.toFixed(2)}★ (${w.count} reviews)`}
                      >
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, color, marginBottom: '2px',
                        }}>
                          {w.avg_rating.toFixed(1)}
                        </span>
                        <div style={{
                          width: '100%', maxWidth: '32px', minHeight: '4px',
                          height: `${pct}%`, borderRadius: '4px 4px 2px 2px',
                          background: `linear-gradient(180deg, ${color}, ${color}70)`,
                          transition: 'height 0.5s ease',
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  <span>{fmtDate(weeklyTrend[0]?.week)}</span>
                  <span>{fmtDate(weeklyTrend[weeklyTrend.length - 1]?.week)}</span>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* RIGHT: NPS Gauge + Dept Breakdown + Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* NPS Gauge */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Heart size={16} color="#ef4444" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Net Promoter Score
              </h3>
            </div>
            <NPSGauge score={overview.nps_score || 0} />
            <div style={{
              marginTop: '0.75rem', padding: '0.625rem 0.875rem',
              background: 'var(--bg-app)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)', fontSize: '0.75rem',
              color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> NPS = % Promoters (4-5★) minus % Detractors (1-2★).
              Scores above +50 are excellent. Below 0 needs immediate attention.
            </div>
          </div>

          {/* Department Satisfaction */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Users size={16} color="var(--info)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Department Satisfaction
              </h3>
            </div>
            {departments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No department data available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {departments.map((dept) => (
                  <DeptScoreCard key={dept.department} dept={dept} />
                ))}
              </div>
            )}
          </div>

          {/* Feedback Tag Cloud */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Hash size={16} color="var(--warning)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Feedback Tags
              </h3>
            </div>
            {tags.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No feedback tags recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map(({ tag, count }) => {
                  const intensity = Math.min(1, count / maxTagCount);
                  const size = 0.68 + intensity * 0.28;
                  return (
                    <span
                      key={tag}
                      style={{
                        fontSize: `${size}rem`,
                        fontWeight: 600 + Math.round(intensity * 200),
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: `rgba(245,158,11,${0.06 + intensity * 0.12})`,
                        color: `rgba(180,83,9,${0.6 + intensity * 0.4})`,
                        border: `1px solid rgba(245,158,11,${0.15 + intensity * 0.2})`,
                        cursor: 'default',
                        transition: 'all 0.2s ease',
                      }}
                      title={`${count} occurrences`}
                    >
                      {tag} ({count})
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ── Recent Reviews Feed ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <MessageCircle size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recent Student Reviews
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
              {reviews.length} Latest
            </span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Award size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No reviews collected yet.</p>
            <p style={{ fontSize: '0.78rem' }}>Student feedback will appear here once requests are resolved and rated.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Export Section ─────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <div className="card" style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--primary-glow), rgba(6,182,212,0.06))',
          border: '1px solid rgba(79,70,229,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'var(--primary-glow)', border: '1.5px solid rgba(79,70,229,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileSpreadsheet size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Export Full Institutional Data
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Download a comprehensive CSV report with all requests, SLA data, CSAT ratings, and department assignments.
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCSVExport}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              <span>{exporting ? 'Generating CSV…' : 'Download Complete CSV Export'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
