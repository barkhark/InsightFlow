import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesApi } from '../../api/services';
import { requestsApi } from '../../api/requests';
import { DynamicFieldRenderer } from '../../components/forms/DynamicFieldRenderer';
import {
  Layers, ArrowRight, ArrowLeft, CheckCircle2, Paperclip,
  ShieldCheck, AlertCircle, HelpCircle, FileText, Sparkles,
  GraduationCap, Monitor, CreditCard, Home, BookOpen,
  Building2, Bus, Zap, Clock,
} from 'lucide-react';

const DEPT_ICONS = {
  'Academic Administration': GraduationCap,
  'IT Services': Monitor,
  'Examination Cell': FileText,
  'Finance & Accounts': CreditCard,
  'Hostel & Student Affairs': Home,
  'Library Services': BookOpen,
  'Facilities & Maintenance': Building2,
  'Transport Services': Bus,
};

const DEPT_COLORS = {
  'Academic Administration': '#4f46e5',
  'IT Services': '#0891b2',
  'Examination Cell': '#f59e0b',
  'Finance & Accounts': '#10b981',
  'Hostel & Student Affairs': '#8b5cf6',
  'Library Services': '#ec4899',
  'Facilities & Maintenance': '#f97316',
  'Transport Services': '#3b82f6',
};

export const NewRequestWizard = () => {
  const [step, setStep] = useState(1);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDetail, setCategoryDetail] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dynamicFieldsData, setDynamicFieldsData] = useState({});
  const [attachment, setAttachment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadServiceAreas();
  }, []);

  const loadServiceAreas = async () => {
    try {
      const res = await servicesApi.getServiceAreas();
      if (res.success && res.data) {
        setAreas(res.data);
      }
    } catch (err) {
      console.error('Failed to load service areas', err);
    }
  };

  const handleSelectArea = async (area) => {
    setSelectedArea(area);
    setSelectedCategory(null);
    setCategoryDetail(null);
    try {
      const res = await servicesApi.getServiceCategories(area.id);
      if (res.success && res.data) {
        setCategories(res.data);
        setStep(2);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    try {
      const res = await servicesApi.getServiceCategoryDetail(category.id);
      if (res.success && res.data) {
        setCategoryDetail(res.data);
        setTitle(`${category.name} Request`);
        setStep(3);
      }
    } catch (err) {
      console.error('Failed to load category detail', err);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        service_category: selectedCategory.id,
        title,
        details,
        dynamic_fields_data: dynamicFieldsData,
      };

      const res = await requestsApi.createStudentRequest(payload);
      if (res.success && res.data) {
        const requestId = res.data.id;
        const refNumber = res.data.reference_number;

        if (attachment) {
          try {
            await requestsApi.uploadAttachment(requestId, attachment);
          } catch (attErr) {
            console.error('Attachment upload failed', attErr);
          }
        }

        setCreatedResult({ id: requestId, reference_number: refNumber });
        setStep(4);
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.error?.details?.dynamic_fields_data ||
          'Failed to submit request. Please ensure all required dynamic fields are completed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* ── Stepper Navigation Bar ─────────────────────────── */}
      {step < 4 && (
        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {[
              { num: 1, label: '1. Department Division' },
              { num: 2, label: '2. Service Category' },
              { num: 3, label: '3. Details & Dynamic Fields' },
            ].map(({ num, label }) => (
              <div key={num} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                opacity: step >= num ? 1 : 0.45,
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: step > num ? 'var(--success)' : step === num ? 'var(--primary)' : 'var(--border-glass)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 800,
                  boxShadow: step === num ? '0 0 0 4px var(--primary-glow)' : 'none',
                }}>
                  {step > num ? <CheckCircle2 size={15} strokeWidth={3} /> : num}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: step === num ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
          color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Choose University Division (8 Large Cards) */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 className="page-title">Select University Department</h1>
            <p className="page-subtitle">
              InsightFlow automatically assigns and routes your request to the verified institutional authority with full SLA tracking.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {areas.map((area) => {
              const Icon = DEPT_ICONS[area.name] || Layers;
              const color = DEPT_COLORS[area.name] || 'var(--primary)';
              return (
                <div
                  key={area.id}
                  className="card card-interactive"
                  onClick={() => handleSelectArea(area)}
                  style={{
                    padding: '1.6rem',
                    display: 'flex', flexDirection: 'column', gap: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: `${color}18`, border: `1.5px solid ${color}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={22} color={color} />
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                      color, background: `${color}12`, padding: '0.2rem 0.6rem', borderRadius: '999px',
                    }}>
                      Division
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {area.name}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {area.description}
                    </p>
                  </div>

                  <div style={{
                    marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '0.78rem', fontWeight: 700, color,
                  }}>
                    <span>Select Department</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Choose Service Category ────────────────── */}
      {step === 2 && (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)} style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={14} /> Back to Department Selection
          </button>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-primary">{selectedArea?.name}</span>
            </div>
            <h1 className="page-title">Choose Service Category</h1>
            <p className="page-subtitle">
              Select the service you require from {selectedArea?.name}.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="card card-interactive"
                onClick={() => handleSelectCategory(cat)}
                style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>{cat.name}</h3>
                  <span className={`badge priority-${cat.default_priority || 'medium'}`} style={{ fontSize: '0.65rem' }}>
                    {cat.default_priority || 'Standard'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {cat.description || 'Standard institutional workflow processing with verification.'}
                </p>
                <div style={{
                  marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center',
                  gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)',
                }}>
                  <Clock size={12} />
                  <span>Target Turnaround: 24h–48h SLA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Form Details & Dynamic Attributes ──────── */}
      {step === 3 && categoryDetail && (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)} style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={14} /> Back to Categories
          </button>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-primary">{selectedArea?.name}</span>
              <span className="badge badge-muted">{selectedCategory?.name}</span>
            </div>
            <h1 className="page-title">Submit Request Details</h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Core Info */}
            <div className="card">
              <div className="label-text" style={{ marginBottom: '1rem' }}>Primary Request Information</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Request Title / Subject *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Detailed Justification / Particulars *</label>
                  <textarea
                    className="input-field"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    placeholder="Provide full context, reason, and any specific particulars for the processing officer..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields (Decision Q1) */}
            {categoryDetail.dynamic_fields && categoryDetail.dynamic_fields.length > 0 && (
              <div className="card">
                <div className="label-text" style={{ marginBottom: '1rem' }}>
                  <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Department Dynamic Requirements
                </div>
                <DynamicFieldRenderer
                  fields={categoryDetail.dynamic_fields}
                  values={dynamicFieldsData}
                  onChange={(updatedValues) => setDynamicFieldsData(updatedValues)}
                />
              </div>
            )}

            {/* File Upload Zone (Decision Q5) */}
            <div className="card">
              <div className="label-text" style={{ marginBottom: '0.75rem' }}>
                <Paperclip size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Supporting Documentation (Optional)
              </div>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '1.75rem', borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--border-glass)', cursor: 'pointer',
                background: 'var(--bg-app)', transition: 'all var(--transition-fast)',
              }}>
                <Paperclip size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {attachment ? attachment.name : 'Click to Upload Supporting Document'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Supports PDF, JPG, PNG up to 10MB (ID proof, marksheets, payment receipts)
                </span>
                <input type="file" hidden onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.875rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? 'Transmitting Request…' : 'Submit Service Request'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── STEP 4: Success & Tracking Reference Screen ────── */}
      {step === 4 && createdResult && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'var(--success-bg)', border: '2px solid var(--success-border)',
            color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 0 25px var(--success-glow)',
          }}>
            <CheckCircle2 size={38} strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Service Request Registered!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Your request has been logged in the institutional workflow engine and routed to the <strong>{selectedArea?.name}</strong> processing desk.
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '1rem',
            padding: '0.85rem 1.75rem', background: 'var(--primary-glow)',
            border: '1.5px solid rgba(79, 70, 229, 0.35)', borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracking Reference:</span>
            <code style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
              {createdResult.reference_number}
            </code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/student/requests')}>
              View All My Requests
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/student/requests/${createdResult.id}`)}>
              Open Request Details & Stepper
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
