/** Forced password change on first login (own login system, C3 2026-09-30).
 *  Shown instead of the app while `must_change_password` is set: the initial
 *  password was read out by phone, so the user picks their own before seeing
 *  anything. Same "Pre-dawn" surface as Login (colours + type verbatim). */
import { useState } from 'react';
import { ownChangePassword, ownLogout, ownUser } from '../lib/session';

const KEYFRAMES = `
.fl-input::placeholder{color:rgba(255,255,255,.45)}
.fl-input:focus{border-color:rgba(56,225,240,.6)!important;box-shadow:0 0 0 3px rgba(56,225,240,.15)}
.fl-submit:active{transform:translateY(1px)}
`;

export function ChangePassword() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const user = ownUser();

  const go = async () => {
    if (busy) return;
    setErr('');
    if (next.length < 10) { setErr('Use at least 10 characters.'); return; }
    if (!/[a-zA-Z]/.test(next) || !/\d/.test(next)) { setErr('Use both letters and numbers.'); return; }
    if (next !== again) { setErr('The two new passwords do not match.'); return; }
    setBusy(true);
    const r = await ownChangePassword(cur, next);
    if (!r.ok) setErr(r.msg);
    setBusy(false);
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
      <div style={{ position: 'absolute', top: -140, left: -60, width: 380, height: 380, background: 'radial-gradient(circle, rgba(46,124,247,.38), transparent 66%)', filter: 'blur(18px)' }} />
      <div style={{ position: 'absolute', top: 120, right: -120, width: 320, height: 320, background: 'radial-gradient(circle, rgba(56,225,240,.22), transparent 66%)', filter: 'blur(16px)' }} />

      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 28 }}>
        <div style={{ font: "700 30px/1 Outfit, sans-serif", letterSpacing: '-.02em', color: '#fff' }}>
          First<b style={{ color: '#38E1F0', fontWeight: 700 }}>Light</b>
        </div>
        <div style={{ font: "600 12px/1 Manrope, sans-serif", letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginTop: 10 }}>
          Choose your password
        </div>
        <div style={{ font: "500 14px/1.5 Manrope, sans-serif", color: 'rgba(255,255,255,.7)', marginTop: 16, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          {user?.display_name ? `Welcome, ${user.display_name}. ` : ''}
          You signed in with a temporary password. Pick your own to continue — at least 10 characters, letters and numbers.
        </div>
      </div>

      <form style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420, margin: '0 auto' }}
        onSubmit={e => { e.preventDefault(); void go(); }}>
        <input className="fl-input" style={input} type="password" placeholder="Temporary password" autoComplete="current-password" required
          value={cur} onChange={e => setCur(e.target.value)} />
        <input className="fl-input" style={input} type="password" placeholder="New password" autoComplete="new-password" required
          value={next} onChange={e => setNext(e.target.value)} />
        <input className="fl-input" style={input} type="password" placeholder="New password again" autoComplete="new-password" required
          value={again} onChange={e => setAgain(e.target.value)} />
        <button className="fl-submit" type="submit" disabled={busy} style={{
          height: 54, borderRadius: 15, border: 'none', width: '100%',
          background: 'linear-gradient(120deg, #2E7CF7, #38E1F0)', color: '#fff',
          font: "700 16px Manrope, sans-serif", cursor: 'pointer', marginTop: 8,
          boxShadow: '0 0 34px rgba(56,225,240,.35)', opacity: busy ? .6 : 1,
        }}>{busy ? 'Saving…' : 'Save and continue'}</button>
        <div style={{ minHeight: 20, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
          {err && <span style={{ color: '#FFB4A3' }}>{err}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a href="#" onClick={e => { e.preventDefault(); void ownLogout(); }}
            style={{ font: "600 13px Manrope, sans-serif", color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>
            Sign out
          </a>
        </div>
      </form>

      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', font: "600 11px Manrope, sans-serif", letterSpacing: '.14em', color: 'rgba(255,255,255,.32)' }}>
        POWERED BY HBIS
      </div>
    </div>
  );
}
