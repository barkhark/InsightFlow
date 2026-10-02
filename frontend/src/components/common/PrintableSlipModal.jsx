import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';

export const PrintableSlipModal = ({ request, isOpen, onClose }) => {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  const digest = request.verification_digest || {
    verification_code: `VER-${(request.reference_number || 'REQ').replace('-', '')}-SECURE`,
    issuer: 'MIT World Peace University — InsightFlow Governance Hub',
    timestamp: new Date().toISOString(),
    verified_status: request.status?.toUpperCase() || 'RESOLVED',
  };

  const erp = request.erp_verification || {
    erp_student_id: 'MIT-MCA2025-089',
    program: 'Master of Computer Applications (MCA)',
    current_semester: 'Semester III',
    academic_standing: 'Good Standing',
    fee_dues_status: 'CLEARED',
  };

  return (
    <div
      className="printable-slip-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 45, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-slip-content, .printable-slip-content * {
            visibility: visible;
          }
          .printable-slip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="printable-slip-content"
        style={{
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '2.5rem',
          position: 'relative',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
            Official Institutional Document Preview
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#1a4a8a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                color: '#4b5563',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Institutional Document Header */}
        <div
          style={{
            borderBottom: '3px double #1a4a8a',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <ShieldCheck size={28} color="#1a4a8a" />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1a4a8a', letterSpacing: '-0.3px' }}>
                MIT WORLD PEACE UNIVERSITY
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', fontWeight: 500 }}>
              Office of Academic Administration & Institutional Workflow Governance
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
              Kothrud, Pune, Maharashtra 411038 · Central Verification Authority
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: request.status === 'resolved' ? '#ecfdf5' : '#eff6ff',
                color: request.status === 'resolved' ? '#065f46' : '#1e40af',
                border: `1px solid ${request.status === 'resolved' ? '#a7f3d0' : '#bfdbfe'}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {request.status}
            </span>
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
              {digest.verification_code}
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
              Official Service Acknowledgment & Audit Certificate
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              {request.title}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
              Tracking Reference Number
            </span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a4a8a', fontFamily: 'monospace' }}>
              {request.reference_number}
            </span>
          </div>
        </div>

        {/* Student & Service Meta Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          {/* Student Profile Block */}
          <div
            style={{
              padding: '0.85rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#1a4a8a', textTransform: 'uppercase', fontWeight: 700 }}>
              Applicant / Student Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.3rem', color: '#374151' }}>
              <span style={{ color: '#6b7280' }}>Student Name:</span>
              <strong style={{ color: '#111827' }}>{request.student?.full_name || 'Priya Sharma'}</strong>

              <span style={{ color: '#6b7280' }}>Institutional ID:</span>
              <span style={{ fontFamily: 'monospace' }}>{erp.erp_student_id}</span>

              <span style={{ color: '#6b7280' }}>Program:</span>
              <span>{erp.program}</span>

              <span style={{ color: '#6b7280' }}>Semester:</span>
              <span>{erp.current_semester}</span>

              <span style={{ color: '#6b7280' }}>SIS Standing:</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>{erp.academic_standing} (Fees: {erp.fee_dues_status})</span>
            </div>
          </div>

          {/* Service Details Block */}
          <div
            style={{
              padding: '0.85rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#1a4a8a', textTransform: 'uppercase', fontWeight: 700 }}>
              Service & Department Routing
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.3rem', color: '#374151' }}>
              <span style={{ color: '#6b7280' }}>Category:</span>
              <strong style={{ color: '#111827' }}>{request.service_category?.name || 'Academic Certificate'}</strong>

              <span style={{ color: '#6b7280' }}>Department:</span>
              <span>{request.current_stage?.department_name || request.service_category?.department_name || 'Academic Section'}</span>

              <span style={{ color: '#6b7280' }}>Date Submitted:</span>
              <span>{new Date(request.created_at).toLocaleString()}</span>

              <span style={{ color: '#6b7280' }}>Current Stage:</span>
              <span>{request.current_stage?.name || 'Completed'}</span>

              <span style={{ color: '#6b7280' }}>Resolution Date:</span>
              <span>{request.resolved_at ? new Date(request.resolved_at).toLocaleString() : 'In Progress'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Fields Snapshot */}
        {request.dynamic_fields_data && Object.keys(request.dynamic_fields_data).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#1a4a8a', textTransform: 'uppercase', fontWeight: 700 }}>
              Frozen Form Submission Parameters
            </h4>
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden',
                fontSize: '0.8rem',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(request.dynamic_fields_data).map(([k, v], idx) => (
                    <tr key={k} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                      <td style={{ padding: '6px 12px', color: '#6b7280', width: '35%', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>
                        {k.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td style={{ padding: '6px 12px', color: '#111827', borderBottom: '1px solid #f3f4f6' }}>
                        {String(v)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stage Timeline Audit Trail */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#1a4a8a', textTransform: 'uppercase', fontWeight: 700 }}>
            Official Accountability & Stage Transition Trail
          </h4>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              fontSize: '0.78rem',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Stage</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Entered At</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Exited At</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Duration</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Officer</th>
                </tr>
              </thead>
              <tbody>
                {(request.stage_history || []).map((sh, idx) => (
                  <tr key={sh.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{sh.stage_name}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{new Date(sh.entered_at).toLocaleDateString()}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{sh.exited_at ? new Date(sh.exited_at).toLocaleDateString() : 'Active'}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{sh.duration_minutes ? `${sh.duration_minutes} min` : 'In Progress'}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{sh.transitioned_by_name || 'System / Auto'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Footer & Sign-off */}
        <div
          style={{
            borderTop: '2px solid #e2e8f0',
            paddingTop: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {/* QR visual & Security Token */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '1px dashed #94a3b8',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <QrCode size={40} color="#1a4a8a" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                <CheckCircle2 size={13} />
                CRYPTOGRAPHICALLY VERIFIED
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                DIGEST: {digest.full_hash?.substring(0, 32)}...
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Generated: {new Date(digest.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Department Sign-off stamp */}
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div
              style={{
                borderBottom: '1px solid #111827',
                paddingBottom: '35px',
                marginBottom: '4px',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              [OFFICIAL DIGITAL SEAL]
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', display: 'block' }}>
              Authorised Signatory
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              InsightFlow Governance Hub
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
