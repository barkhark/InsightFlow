import React, { useState } from 'react';
import { Star, X, CheckCircle, ThumbsUp, MessageSquare, Award } from 'lucide-react';
import { requestsApi } from '../../api/requests';

const PRESET_TAGS = [
  'Prompt Resolution',
  'Helpful Staff',
  'Clear Instructions',
  'Transparent Tracking',
  'Quick Turnaround',
  'Professional Service',
];

export const FeedbackRatingModal = ({ request, isOpen, onClose, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(5);
  const [helpfulnessRating, setHelpfulnessRating] = useState(5);
  const [clarityRating, setClarityRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Prompt Resolution', 'Helpful Staff']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await requestsApi.submitFeedback(request.id, {
        rating,
        speed_rating: speedRating,
        helpfulness_rating: helpfulnessRating,
        clarity_rating: clarityRating,
        comment: comment.trim(),
        tags: selectedTags,
      });

      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(res.data);
      }
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to submit feedback. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return 'Outstanding — Exceeded Expectations';
      case 4: return 'Very Good — Smooth & Timely';
      case 3: return 'Good — Satisfactory Resolution';
      case 2: return 'Fair — Room for Improvement';
      case 1: return 'Poor — Disappointing Experience';
      default: return 'Select your rating';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 45, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-glass, #dde4ed)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: 'var(--shadow-xl, 0 20px 30px -5px rgba(10, 25, 50, 0.2))',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle, #e8edf2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(26, 74, 138, 0.05), rgba(30, 106, 191, 0.02))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(26, 74, 138, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #1a4a8a)',
              }}
            >
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary, #0d1f35)' }}>
                Service Feedback & CSAT Rating
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #5a7088)' }}>
                Ref: {request?.reference_number} · {request?.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <CheckCircle size={48} color="#1a7a4a" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Thank you for your rating!</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Your feedback has been permanently linked to this audit ledger and submitted to the department head.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg, #fdf0ee)',
                  border: '1px solid var(--danger-border, #f0b8b3)',
                  borderRadius: '8px',
                  color: 'var(--danger, #c0392b)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Overall Star Rating */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #3a5068)',
                  marginBottom: '0.5rem',
                }}
              >
                Overall Experience Rating
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'transform 0.15s ease',
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      <Star
                        size={32}
                        fill={active ? '#f59e0b' : 'none'}
                        color={active ? '#f59e0b' : 'var(--border-input, #c8d3de)'}
                      />
                    </button>
                  );
                })}
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--primary, #1a4a8a)',
                }}
              >
                {getRatingLabel(hoverRating || rating)}
              </span>
            </div>

            {/* Granular Dimension Ratings */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: 'var(--bg-card-subtle, #f8fafc)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              {[
                { label: 'Speed', val: speedRating, set: setSpeedRating },
                { label: 'Helpfulness', val: helpfulnessRating, set: setHelpfulnessRating },
                { label: 'Process Clarity', val: clarityRating, set: setClarityRating },
              ].map((dim) => (
                <div key={dim.label} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {dim.label}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={dim.val >= s ? '#f59e0b' : 'none'}
                        color={dim.val >= s ? '#f59e0b' : '#cbd5e1'}
                        onClick={() => dim.set(s)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Aspect Tags */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                }}
              >
                What stood out? (Select tags)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--primary-soft, #e8f0fb)' : 'transparent',
                        color: isSelected ? 'var(--primary, #1a4a8a)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.4rem',
                }}
              >
                Detailed Comments or Suggestions (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share any comments regarding staff handling, processing time, or digital experience..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-input, #c8d3de)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--primary, #1a4a8a)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ThumbsUp size={15} />
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
