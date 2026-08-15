/** Login — ported from the current app's login page (navy, gradient brand). */
import { useState } from 'react';
import { sb } from '../lib/sb';

export function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!sb) return;
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message);
    setBusy(false);
  };

  const field: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.11)',
    borderRadius: 11, padding: '14px 15px', fontSize: 16, fontFamily: 'inherit',
    color: '#fff', outline: 'none',
  };
  const label: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)',
    textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 7,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '24px 20px', background: '#061535',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 32, fontWeight: 800, letterSpacing: '-.03em',
            background: 'linear-gradient(135deg, #2E7CF7, #38E1F0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>FirstLight</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.14em', marginTop: 6 }}>
            Morning Briefing
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
          borderRadius: 18, padding: '28px 24px 24px',
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Email</label>
            <input style={field} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Password</label>
            <input style={field} type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()} />
          </div>
          <button onClick={go} disabled={busy} style={{
            width: '100%', padding: 15, border: 'none', borderRadius: 11,
            background: 'linear-gradient(135deg, #2E7CF7, #38E1F0)', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', opacity: busy ? .6 : 1,
          }}>Sign in</button>
          <div style={{ color: '#E07878', fontSize: 13, textAlign: 'center', marginTop: 14, minHeight: 18 }}>{err}</div>
        </div>
      </div>
    </div>
  );
}
