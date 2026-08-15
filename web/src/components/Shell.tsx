/** App chrome: navy top bar with the CANONICAL lockup B (verbatim geometry —
 *  never redraw), icon cluster, hotel row, tab bar. */
import type { ReactNode } from 'react';

export function LogoLockup() {
  /* canonical lockup B — geometry is final */
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fl-lock-b" x1="16" y1="44" x2="84" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2E7CF7" />
            <stop offset="1" stopColor="#38E1F0" />
          </linearGradient>
        </defs>
        <g stroke="#38E1F0" strokeWidth="3" strokeLinecap="round" opacity=".22">
          <path d="M50 -2 50 6" /><path d="M96 14 89 18" /><path d="M102 50 94 50" />
          <path d="M96 86 89 82" /><path d="M50 102 50 94" /><path d="M4 86 11 82" />
          <path d="M-2 50 6 50" /><path d="M4 14 11 18" />
        </g>
        <g transform="translate(50,50) scale(.78) translate(-52,-50)">
          <path d="M18 38 38 28 54 33 74 16" stroke="url(#fl-lock-b)" strokeWidth="8"
            strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="74" cy="16" r="5" fill="#38E1F0" />
          <rect x="18" y="50" width="8" height="36" rx="4" fill="#fff" />
          <rect x="18" y="50" width="26" height="8" rx="4" fill="#fff" />
          <rect x="18" y="64" width="19" height="8" rx="4" fill="#fff" />
          <rect x="62" y="50" width="8" height="36" rx="4" fill="#fff" />
          <rect x="62" y="78" width="24" height="8" rx="4" fill="#fff" />
        </g>
      </svg>
      <span style={{
        font: "700 19px/1 'Outfit', sans-serif", letterSpacing: '-.02em',
        color: '#fff', marginTop: 2,
      }}>
        First<span style={{ color: 'var(--cyan)' }}>Light</span>
      </span>
    </div>
  );
}

const TABS = ['Overview', 'Pickup', 'OTB', 'AI Insights'] as const;
export type Tab = typeof TABS[number];

export function Shell(props: {
  hotelName: string;
  tab: Tab;
  onTab: (t: Tab) => void;
  aiCount?: number;
  children: ReactNode;
}) {
  return (
    <div>
      <header style={{ background: 'var(--app-top)', padding: '12px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LogoLockup />
          <div style={{ display: 'flex', gap: 10 }}>
            {['🔔', '⇪', '⚙'].map(g => (
              <button key={g} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.11)',
                color: 'rgba(255,255,255,.85)', fontSize: 14,
              }}>{g}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>Hotel</span>
          <div style={{
            flex: 1, padding: '7px 12px', borderRadius: 8, color: '#fff',
            border: '1px solid rgba(46,124,247,.35)', background: 'rgba(46,124,247,.1)',
            fontSize: 11, fontWeight: 600, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{props.hotelName}</span><span>▾</span>
          </div>
          <button style={{
            padding: '7px 16px', borderRadius: 8, whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.06)',
            color: 'rgba(255,255,255,.8)', fontSize: 11, fontWeight: 600,
          }}>↻ Refresh</button>
        </div>
      </header>

      <nav style={{
        display: 'flex', justifyContent: 'center', gap: 4, background: '#fff',
        padding: '8px 10px', borderBottom: '1px solid #E8EBF2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => props.onTab(t)} style={{
            border: 'none', background: 'transparent',
            borderBottom: props.tab === t ? '2px solid #2E7CF7' : '2px solid transparent',
            color: props.tab === t ? '#1E5FD0' : 'var(--n500)',
            fontWeight: 700, fontSize: 12.5, padding: '7px 10px 6px', borderRadius: 0,
          }}>
            {t}{t === 'AI Insights' && props.aiCount ? (
              <span style={{
                marginLeft: 5, background: 'var(--blue)', color: '#fff', borderRadius: 999,
                fontSize: 10, fontWeight: 700, padding: '1px 6px',
              }}>{props.aiCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '14px 14px 40px' }}>
        {props.children}
      </main>
    </div>
  );
}
