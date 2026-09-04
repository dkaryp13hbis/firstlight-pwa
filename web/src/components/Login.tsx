/** Login — "Pre-dawn" design (login-1b-2a-code.html handoff, 2026-09-04):
 *  bg #0b1530, aurora glows, slow-orbit corona on the mark (30s, reduced-motion
 *  aware), glass inputs, gradient submit. Layout/colors verbatim from the
 *  handoff; TYPE follows the app's one-type-system rule (user 2026-09-04):
 *  Manrope everywhere, Outfit 700 for the wordmark only. */
import { useState } from 'react';
import { sb } from '../lib/sb';

const KEYFRAMES = `
@keyframes flSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fl-rays{transform-box:view-box;transform-origin:center;animation:flSpin 30s linear infinite}
@media (prefers-reduced-motion:reduce){.fl-rays{animation:none}}
.fl-input::placeholder{color:rgba(255,255,255,.45)}
.fl-input:focus{border-color:rgba(56,225,240,.6)!important;box-shadow:0 0 0 3px rgba(56,225,240,.15)}
.fl-submit:active{transform:translateY(1px)}
`;

export function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!sb || busy) return;
    setBusy(true); setErr(''); setNote('');
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message === 'Invalid login credentials'
      ? 'Wrong email or password.' : error.message);
    setBusy(false);
  };

  const forgot = async () => {
    if (!sb) return;
    if (!email) { setErr('Type your email first, then tap "Forgot password?".'); return; }
    setErr('');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setNote(error ? error.message : 'Password reset email sent — check your inbox.');
  };

  const input: React.CSSProperties = {
    height: 54, borderRadius: 15, border: '1px solid rgba(120,170,255,.28)',
    background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    padding: '0 18px', font: "500 15px Manrope, sans-serif", color: '#fff', outline: 'none', width: '100%',
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 26px', position: 'relative', overflow: 'hidden',
      background: '#0b1530', fontFamily: 'Manrope, sans-serif',
    }}>
      <style>{KEYFRAMES}</style>
      {/* aurora gradients */}
      <div style={{ position: 'absolute', top: -140, left: -60, width: 380, height: 380, background: 'radial-gradient(circle, rgba(46,124,247,.38), transparent 66%)', filter: 'blur(18px)' }} />
      <div style={{ position: 'absolute', top: 120, right: -120, width: 320, height: 320, background: 'radial-gradient(circle, rgba(56,225,240,.22), transparent 66%)', filter: 'blur(16px)' }} />
      <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0, height: 220, background: 'linear-gradient(180deg, transparent, rgba(56,225,240,.08))' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 38 }}>
        {/* 9g mark, 2a slow-orbit corona — raised 90px above the wordmark */}
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" role="img" aria-label="FirstLight logo"
          style={{ overflow: 'visible', position: 'relative', top: -90, marginBottom: -90 }}>
          <defs>
            <linearGradient id="flGrad" x1="16" y1="44" x2="84" y2="14" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2E7CF7" /><stop offset="1" stopColor="#38E1F0" />
            </linearGradient>
          </defs>
          <g className="fl-rays" stroke="#38E1F0" strokeWidth="3" strokeLinecap="round" opacity=".3">
            <path d="M50 -2 50 6" /><path d="M96 14 89 18" /><path d="M102 50 94 50" /><path d="M96 86 89 82" />
            <path d="M50 102 50 94" /><path d="M4 86 11 82" /><path d="M-2 50 6 50" /><path d="M4 14 11 18" />
          </g>
          <g transform="translate(50,50) scale(.78) translate(-52,-50)">
            <path d="M18 38 38 28 54 33 74 16" stroke="url(#flGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="74" cy="16" r="5" fill="#38E1F0" />
            <rect x="18" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="18" y="50" width="26" height="8" rx="4" fill="#fff" /><rect x="18" y="64" width="19" height="8" rx="4" fill="#fff" />
            <rect x="62" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="62" y="78" width="24" height="8" rx="4" fill="#fff" />
          </g>
        </svg>
        <div>
          <div style={{ font: "700 30px/1 Outfit, sans-serif", letterSpacing: '-.02em', color: '#fff', textAlign: 'center' }}>
            First<b style={{ color: '#38E1F0', fontWeight: 800 }}>Light</b>
          </div>
          <div style={{ font: "600 12px/1 Manrope, sans-serif", letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginTop: 10, textAlign: 'center' }}>
            Before the day begins
          </div>
        </div>
      </div>

      <form style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420, margin: '0 auto' }}
        onSubmit={e => { e.preventDefault(); void go(); }}>
        <input className="fl-input" style={input} type="email" placeholder="Email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="fl-input" style={input} type="password" placeholder="Password" autoComplete="current-password" required
          value={pw} onChange={e => setPw(e.target.value)} />
        <button className="fl-submit" type="submit" disabled={busy} style={{
          height: 54, borderRadius: 15, border: 'none', width: '100%',
          background: 'linear-gradient(120deg, #2E7CF7, #38E1F0)', color: '#fff',
          font: "700 16px Manrope, sans-serif", cursor: 'pointer', marginTop: 8,
          boxShadow: '0 0 34px rgba(56,225,240,.35)', opacity: busy ? .6 : 1,
        }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <a href="#" onClick={e => { e.preventDefault(); void forgot(); }}
            style={{ font: "600 13px Manrope, sans-serif", color: '#7fd9ff', textDecoration: 'none' }}>
            Forgot password?
          </a>
        </div>
        <div style={{ minHeight: 20, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
          {err && <span style={{ color: '#FFB4A3' }}>{err}</span>}
          {note && <span style={{ color: '#7fd9ff' }}>{note}</span>}
        </div>
      </form>

      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', font: "600 11px Manrope, sans-serif", letterSpacing: '.14em', color: 'rgba(255,255,255,.32)' }}>
        POWERED BY HBIS
      </div>
    </div>
  );
}
