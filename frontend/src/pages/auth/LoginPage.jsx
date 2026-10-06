import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Layers, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

const QUICK_ROLES = [
  {
    id: 'student',
    label: 'Student Portal',
    subtext: 'Priya Sharma (MCA)',
    email: 'priya.sharma@insightflow.edu',
    icon: '🎓',
    badgeColor: '#3b82f6',
    borderActive: 'rgba(59, 130, 246, 0.5)',
    bgActive: 'rgba(59, 130, 246, 0.08)',
  },
  {
    id: 'staff',
    label: 'Staff Workspace',
    subtext: 'Academic Coordinator',
    email: 'academic.staff@insightflow.edu',
    icon: '📋',
    badgeColor: '#10b981',
    borderActive: 'rgba(16, 185, 129, 0.5)',
    bgActive: 'rgba(16, 185, 129, 0.08)',
  },
  {
    id: 'admin',
    label: 'Admin Command',
    subtext: 'Institutional Executive',
    email: 'admin@insightflow.edu',
    icon: '👑',
    badgeColor: '#ef4444',
    borderActive: 'rgba(239, 68, 68, 0.5)',
    bgActive: 'rgba(239, 68, 68, 0.08)',
  },
];

export const LoginPage = () => {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [selectedRole, setSelectedRole] = useState('student');
  const [email,        setEmail]        = useState('priya.sharma@insightflow.edu');
  const [password,     setPassword]     = useState('InsightFlow@2026');
  const [showPwd,      setShowPwd]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleRoleSelect = (roleObj) => {
    setSelectedRole(roleObj.id);
    setEmail(roleObj.email);
    setPassword('InsightFlow@2026');
    setError('');
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      setError('Please provide your institutional email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(em, pw);
      if (res.success) {
        const role = res.user?.role;
        if      (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'staff') navigate('/staff/queue');
        else                       navigate('/student/requests');
      } else {
        setError(res.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Authentication failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setError('');
    try {
      // Send the access_token to backend to get user info
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/google/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenResponse.access_token }),
      });
      const data = await res.json();
      if (data.success) {
        // Store tokens matching InsightFlow AuthContext keys
        localStorage.setItem('insightflow_access_token', data.data.access);
        localStorage.setItem('insightflow_refresh_token', data.data.refresh);
        localStorage.setItem('insightflow_user', JSON.stringify(data.data.user));
        const role = data.data.user?.role;
        window.location.href = role === 'admin'
          ? '/admin/dashboard'
          : role === 'staff'
          ? '/staff/queue'
          : '/student/requests';
      } else {
        setError(data.error?.message || 'Google Sign-In failed. Make sure your Google email matches your InsightFlow account.');
      }
    } catch (err) {
      setError('Google Sign-In failed. Please try again or use email/password.');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google Sign-In was cancelled or failed. Please try again.'),
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090f1d 0%, #0d172b 45%, #0f2240 100%)',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '2.5rem 1.25rem',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Subtle ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '650px',
        height: '420px',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.16) 0%, rgba(6, 182, 212, 0.08) 50%, transparent 80%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1a4a8a 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.15rem',
            boxShadow: '0 10px 30px rgba(6, 182, 212, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <Layers size={28} color="#ffffff" />
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            marginBottom: '0.35rem',
            lineHeight: 1.2,
          }}>
            INSIGHT<span style={{ color: '#38bdf8' }}>FLOW</span>
          </h1>

          <p style={{
            fontSize: '0.82rem',
            color: 'rgba(200, 220, 245, 0.75)',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}>
            Intelligent Workflow Analytics &amp; Accountability Platform
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}>

          {/* Quick Role Switcher Header */}
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            background: '#f8fafc',
            borderBottom: '1px solid #edf2f7',
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              Select Workspace Profile
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}>
              {QUICK_ROLES.map((role) => {
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    style={{
                      padding: '0.65rem 0.4rem',
                      borderRadius: '10px',
                      border: isActive ? `2px solid ${role.badgeColor}` : '1.5px solid #e2e8f0',
                      background: isActive ? role.bgActive : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? `0 2px 8px ${role.badgeColor}25` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }}>{role.icon}</span>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: isActive ? role.badgeColor : '#334155',
                      lineHeight: 1.2,
                    }}>
                      {role.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Section */}
          <div style={{ padding: '1.75rem 1.75rem 2rem' }}>
            {error && (
              <div style={{
                padding: '0.7rem 0.9rem',
                marginBottom: '1.25rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderLeft: '4px solid #ef4444',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#b91c1c',
                fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Institutional Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="email"
                    className="input-field"
                    style={{ paddingLeft: '2.4rem' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingLeft: '2.4rem', paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Sign In CTA Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1a4a8a 0%, #0d6e63 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  marginTop: '0.4rem',
                  boxShadow: '0 4px 14px rgba(26, 74, 138, 0.35)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {loading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '1.25rem 0 1rem',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              id="google-signin-btn"
              onClick={() => triggerGoogleLogin()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                background: '#ffffff',
                color: '#1f2937',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.borderColor = '#4285f4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(66,133,244,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
            >
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          {/* Card Footer Trust Badge */}
          <div style={{
            padding: '0.85rem 1.5rem',
            background: '#f8fafc',
            borderTop: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.74rem',
            color: '#64748b',
            fontWeight: 600,
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Role-Based Access Control · Cryptographic Audit Ledger</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
          <p style={{ fontSize: '0.74rem', color: 'rgba(200, 220, 245, 0.65)', lineHeight: 1.6 }}>
            InsightFlow – Intelligent Workflow Analytics and Accountability Platform<br />
            MCA Semester III Mini Project
          </p>
        </div>

      </div>
    </div>
  );
};
