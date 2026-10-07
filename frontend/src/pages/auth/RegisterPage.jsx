import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layers, Mail, Lock, Eye, EyeOff, User, Hash, BookOpen, ArrowRight, ShieldCheck, LogIn } from "lucide-react";

const PROGRAMMES = ["MCA", "MBA", "BCA", "BBA", "B.Tech", "M.Tech", "B.Sc", "M.Sc", "B.Com", "M.Com"];
const DIVISIONS  = ["A", "B", "C", "D"];

export const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name:   "",
    email:       "",
    password:    "",
    confirm_pwd: "",
    roll_number: "",
    programme:   "MCA",
    semester:    "1",
    division:    "A",
  });

  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.full_name.trim()) { setError("Full name is required."); return; }
    if (!formData.email.trim())     { setError("Institutional email is required."); return; }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (formData.password !== formData.confirm_pwd) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }
    if (!formData.roll_number.trim()) { setError("Roll number is required."); return; }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:       formData.email.trim().toLowerCase(),
          full_name:   formData.full_name.trim(),
          password:    formData.password,
          roll_number: formData.roll_number.trim(),
          programme:   formData.programme,
          semester:    parseInt(formData.semester, 10),
          division:    formData.division,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("insightflow_access_token",  data.data.access);
        localStorage.setItem("insightflow_refresh_token", data.data.refresh);
        localStorage.setItem("insightflow_user",          JSON.stringify(data.data.user));
        setSuccess("Account created! Redirecting to your dashboard…");
        setTimeout(() => { window.location.href = "/student/requests"; }, 1200);
      } else {
        setError(data.error?.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("Connection error. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.7rem 0.9rem 0.7rem 2.5rem",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    fontSize: "0.9rem",
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.73rem",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "0.35rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const selectStyle = {
    ...inputStyle,
    paddingLeft: "0.9rem",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "2rem",
  };

  const onFocus = (e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; };
  const onBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #090f1d 0%, #0d172b 45%, #0f2240 100%)",
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "2rem 1.25rem",
      position: "relative",
      overflow: "hidden",
    }}>

      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "700px", height: "450px",
        background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(6,182,212,0.07) 55%, transparent 80%)",
        filter: "blur(80px)", pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "500px", position: "relative", zIndex: 1 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: "54px", height: "54px", borderRadius: "15px",
            background: "linear-gradient(135deg, #1a4a8a 0%, #06b6d4 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "0 10px 28px rgba(6,182,212,0.35)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <Layers size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.025em", marginBottom: "0.3rem", lineHeight: 1.2 }}>
            INSIGHT<span style={{ color: "#38bdf8" }}>FLOW</span>
          </h1>
          <p style={{ fontSize: "0.82rem", color: "rgba(200,220,245,0.7)", fontWeight: 500 }}>
            Create Your Student Account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#ffffff", borderRadius: "20px",
          boxShadow: "0 25px 60px -10px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}>

          {/* Card Header */}
          <div style={{
            padding: "1.1rem 1.75rem 1rem",
            background: "linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)",
            borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: "0.65rem",
          }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #1a4a8a, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>Student Registration</div>
              <div style={{ fontSize: "0.73rem", color: "#64748b", fontWeight: 500 }}>Fill in your institutional details below</div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: "1.75rem" }}>

            {error && (
              <div style={{
                padding: "0.7rem 0.9rem", marginBottom: "1.2rem",
                background: "#fef2f2", border: "1px solid #fecaca",
                borderLeft: "4px solid #ef4444", borderRadius: "8px",
                fontSize: "0.82rem", color: "#b91c1c", fontWeight: 600,
              }}>{error}</div>
            )}

            {success && (
              <div style={{
                padding: "0.7rem 0.9rem", marginBottom: "1.2rem",
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderLeft: "4px solid #22c55e", borderRadius: "8px",
                fontSize: "0.82rem", color: "#15803d", fontWeight: 600,
              }}>? {success}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Full Name */}
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="reg-fullname" type="text" name="full_name" value={formData.full_name} onChange={handleChange} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. Barkha Khobragade" required style={inputStyle} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="reg-email" type="email" name="email" value={formData.email} onChange={handleChange} onFocus={onFocus} onBlur={onBlur} placeholder="your@email.com" required style={inputStyle} />
                </div>
              </div>

              {/* Roll Number */}
              <div>
                <label style={labelStyle}>Roll Number</label>
                <div style={{ position: "relative" }}>
                  <Hash size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="reg-rollnumber" type="text" name="roll_number" value={formData.roll_number} onChange={handleChange} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. MCA2023001" required style={inputStyle} />
                </div>
              </div>

              {/* Programme / Semester / Division */}
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>Programme</label>
                  <div style={{ position: "relative" }}>
                    <BookOpen size={14} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <select id="reg-programme" name="programme" value={formData.programme} onChange={handleChange} style={{ ...selectStyle, paddingLeft: "2rem" }}>
                      {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Semester</label>
                  <select id="reg-semester" name="semester" value={formData.semester} onChange={handleChange} style={selectStyle}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Division</label>
                  <select id="reg-division" name="division" value={formData.division} onChange={handleChange} style={selectStyle}>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="reg-password" type={showPwd ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} onFocus={onFocus} onBlur={onBlur} placeholder="Min. 8 characters" required style={{ ...inputStyle, paddingRight: "2.5rem" }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input id="reg-confirm-password" type={showConfirm ? "text" : "password"} name="confirm_pwd" value={formData.confirm_pwd} onChange={handleChange} onFocus={onFocus} onBlur={onBlur} placeholder="Re-enter password" required style={{ ...inputStyle, paddingRight: "2.5rem" }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading || !!success}
                style={{
                  width: "100%",
                  padding: "0.85rem 1.25rem",
                  marginTop: "0.3rem",
                  background: (loading || success) ? "#94a3b8" : "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)",
                  color: "#ffffff", border: "none", borderRadius: "10px",
                  fontSize: "0.95rem", fontWeight: 700,
                  cursor: (loading || success) ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  letterSpacing: "0.01em",
                }}
              >
                {loading ? (
                  <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "#ffffff" }} />
                ) : (
                  <><span>Create Account</span><ArrowRight size={17} /></>
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <div style={{
            padding: "0.85rem 1.75rem",
            background: "#f8fafc", borderTop: "1px solid #edf2f7",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
              Role-Based Access Control · Secure Registration
            </span>
          </div>
        </div>

        {/* Sign In link */}
        <div style={{ textAlign: "center", marginTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <LogIn size={14} color="rgba(200,220,245,0.65)" />
          <span style={{ fontSize: "0.82rem", color: "rgba(200,220,245,0.65)", fontWeight: 500 }}>
            Already have an account?
          </span>
          <Link to="/login" style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: 700, textDecoration: "none", borderBottom: "1px solid rgba(56,189,248,0.4)", paddingBottom: "1px" }}>
            Sign In ?
          </Link>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <p style={{ fontSize: "0.73rem", color: "rgba(200,220,245,0.5)", lineHeight: 1.6 }}>
            InsightFlow – Intelligent Workflow Analytics and Accountability Platform<br />
            MCA Semester III Mini Project
          </p>
        </div>
      </div>
    </div>
  );
};
