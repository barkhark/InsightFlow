/**
 * InsightFlow — AI Help Widget (Student Portal)
 *
 * Floating assistant that answers common student questions about the platform.
 * Uses a knowledge-base of Q&A pairs with fuzzy keyword matching to simulate
 * intelligent responses. Includes typing animation, suggestion chips, and
 * full chat history.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge base — used for keyword-based intent matching
// ──────────────────────────────────────────────────────────────────────────────
const KB = [
  {
    keywords: ['status', 'track', 'where', 'my request', 'check'],
    answer:
      '📋 **Track your request** by going to **My Requests** in the sidebar. Each card shows the current stage, assigned staff, and a real-time timeline. You can also click any request for a detailed view.',
  },
  {
    keywords: ['new request', 'submit', 'apply', 'create', 'raise'],
    answer:
      '✏️ To **submit a new request**, click the **+ New Request** button in the sidebar or on your dashboard. A step-by-step wizard guides you through selecting a service area, filling the form, and attaching documents.',
  },
  {
    keywords: ['attachment', 'document', 'upload', 'file'],
    answer:
      '📎 For requests that **require attachments**, you will see a file upload section on the last step of the wizard. Accepted formats: PDF, JPG, PNG (max 10 MB each). You can upload up to 5 files per request.',
  },
  {
    keywords: ['sla', 'delay', 'how long', 'deadline', 'time', 'take'],
    answer:
      '⏱️ Each service has an **SLA (Service Level Agreement)** target. For example, Bonafide Certificates are typically processed within 24–48 hours. If a request breaches its SLA, it is automatically escalated by our AI engine.',
  },
  {
    keywords: ['escalate', 'urgent', 'priority', 'critical'],
    answer:
      '🚨 Requests that breach their SLA deadline are **auto-escalated** to Critical priority by the InsightFlow AI engine. You will receive a notification when this happens. You can also mention urgency in the remarks field.',
  },
  {
    keywords: ['cancel', 'withdraw', 'delete'],
    answer:
      '❌ To **cancel or withdraw** a request, open it from My Requests and click **Withdraw Request** if it is still in the initial stage. Once processing has begun, please contact the department directly.',
  },
  {
    keywords: ['notification', 'email', 'alert', 'update'],
    answer:
      '🔔 InsightFlow sends **real-time notifications** (in-app and email) whenever your request moves to a new stage, gets assigned to staff, or requires action from you. Check the bell icon in the top navigation bar.',
  },
  {
    keywords: ['password', 'login', 'account', 'forgot', 'reset'],
    answer:
      '🔐 For **login or password issues**, click "Forgot Password" on the login page. An email will be sent to your registered institute email. If you continue to face issues, contact the IT helpdesk.',
  },
  {
    keywords: ['certificate', 'bonafide', 'transcript', 'degree'],
    answer:
      '🎓 **Academic certificates** (Bonafide, Transcripts, Degree) are under the **Academic Administration** service area. Select it on the New Request page and fill in your programme, semester, and purpose details.',
  },
  {
    keywords: ['staff', 'assigned', 'who', 'officer', 'contact'],
    answer:
      '👤 The request detail page shows the **name of the staff member** currently handling your request. You can see all actions taken and remarks added at each stage in the Activity Timeline.',
  },
  {
    keywords: ['hi', 'hello', 'hey', 'help', 'assist'],
    answer:
      "👋 **Hello! I'm InsightBot**, your AI assistant for InsightFlow. I can help you track requests, understand the process, or answer questions about services. What would you like to know?",
  },
  {
    keywords: ['thank', 'thanks', 'bye', 'goodbye'],
    answer:
      "😊 You're welcome! If you have more questions, I'm always here. Good luck with your request! 🚀",
  },
];

const SUGGESTIONS = [
  'How do I submit a new request?',
  'How do I track my request?',
  'What documents do I need to upload?',
  'How long does processing take?',
];

const BOT_INTRO = {
  id: 'intro',
  role: 'bot',
  text: "👋 Hi! I'm **InsightBot**, your AI assistant.\n\nI can help you navigate InsightFlow, understand service timelines, and answer common questions. Try asking something below!",
  ts: new Date(),
};

// ──────────────────────────────────────────────────────────────────────────────
// Matching logic
// ──────────────────────────────────────────────────────────────────────────────
function getAnswer(input) {
  const q = input.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of KB) {
    const score = entry.keywords.reduce(
      (acc, kw) => acc + (q.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestScore === 0) {
    return "🤔 I'm not sure about that one. Try rephrasing, or contact the department directly through the request form. I'm still learning!";
  }
  return bestMatch.answer;
}

// ──────────────────────────────────────────────────────────────────────────────
// Render bold markdown (**text**) in bot messages
// ──────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : p
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
export function AIHelpWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([BOT_INTRO]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const sendMessage = useCallback(
    (text) => {
      const userText = text || input.trim();
      if (!userText) return;

      const userMsg = { id: Date.now(), role: 'user', text: userText, ts: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setTyping(true);

      setTimeout(() => {
        const botMsg = {
          id: Date.now() + 1,
          role: 'bot',
          text: getAnswer(userText),
          ts: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setTyping(false);
      }, 900 + Math.random() * 600);
    },
    [input]
  );

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Floating Button ─────────────────────────────────────────────── */}
      <button
        id="ai-help-widget-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI Help Widget"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          boxShadow: open
            ? '0 0 0 4px rgba(99,102,241,0.3), 0 8px 32px rgba(99,102,241,0.5)'
            : '0 4px 24px rgba(99,102,241,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: open ? 'rotate(45deg) scale(1.05)' : 'scale(1)',
        }}
      >
        {pulse && !open && (
          <span
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              border: '2px solid rgba(99,102,241,0.6)',
              animation: 'aiPulse 2s ease-out infinite',
            }}
          />
        )}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M9.663 17h4.673M12 3a9 9 0 110 18 9 9 0 010-18zm0 4v5l3 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          )}
        </svg>
        {pulse && !open && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid white',
              fontSize: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
            }}
          >
            AI
          </span>
        )}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      <div
        id="ai-help-panel"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '28px',
          zIndex: 9998,
          width: '370px',
          maxHeight: '560px',
          borderRadius: '20px',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.92)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>
              InsightBot
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              AI Assistant · Always available
            </div>
          </div>
          <button
            onClick={() => setMessages([BOT_INTRO])}
            title="Clear chat"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '8px',
              }}
            >
              {msg.role === 'bot' && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
              )}
              <div style={{ maxWidth: '80%' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius:
                      msg.role === 'user'
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                    background:
                      msg.role === 'user'
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'var(--bg-hover, rgba(255,255,255,0.06))',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary, #e2e8f0)',
                    fontSize: '13.5px',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-line',
                    border:
                      msg.role === 'bot'
                        ? '1px solid var(--border, rgba(255,255,255,0.07))'
                        : 'none',
                  }}
                >
                  {msg.role === 'bot'
                    ? msg.text.split('\n').map((line, i, arr) => (
                        <span key={i}>
                          {renderMarkdown(line)}
                          {i < arr.length - 1 && <br />}
                        </span>
                      ))
                    : msg.text}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted, #64748b)',
                    marginTop: '4px',
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                    padding: '0 4px',
                  }}
                >
                  {formatTime(msg.ts)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'var(--bg-hover, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border, rgba(255,255,255,0.07))',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--text-muted, #64748b)',
                      display: 'inline-block',
                      animation: `aiTypingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.07))',
            background: 'var(--bg-sidebar, rgba(15,23,42,0.5))',
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              style={{
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '20px',
                color: '#a5b4fc',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.07))',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            background: 'var(--bg-card, #1e293b)',
          }}
        >
          <textarea
            ref={inputRef}
            id="ai-help-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask InsightBot anything…"
            rows={1}
            style={{
              flex: 1,
              background: 'var(--bg-hover, rgba(255,255,255,0.06))',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: '12px',
              color: 'var(--text-primary, #e2e8f0)',
              padding: '10px 14px',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.4',
              maxHeight: '80px',
              overflowY: 'auto',
            }}
          />
          <button
            id="ai-help-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              background:
                input.trim() && !typing
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.08)',
              color: 'white',
              cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes aiPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes aiTypingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
