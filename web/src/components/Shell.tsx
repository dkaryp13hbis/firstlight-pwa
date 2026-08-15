/** App chrome: navy top bar with the CANONICAL lockup B (verbatim geometry —
 *  never redraw), icon cluster, hotel row with picker, refresh, tab bar. */
import { useState } from 'react';
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

const icoStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.11)',
  color: 'rgba(255,255,255,.85)', fontSize: 14,
};

export function Shell(props: {
  hotels: { id: string; name: string }[];
  hotelId: string;
  onHotel: (id: string) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  aiCount?: number;
  refreshState: 'idle' | 'busy' | 'done' | 'error';
  onRefresh: () => void;
  bellOn: boolean;
  onBell: () => void;
  onSettings: () => void;
  children: ReactNode;
}) {
  const [pickOpen, setPickOpen] = useState(false);
  const current = props.hotels.find(h => h.id === props.hotelId)?.name ?? 'Hotel';
  const busy = props.refreshState === 'busy';
  return (
    <div>
      <header style={{ background: 'var(--app-top)', padding: '12px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LogoLockup />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...icoStyle, color: props.bellOn ? '#38E1F0' : icoStyle.color, borderColor: props.bellOn ? 'rgba(56,225,240,.4)' : undefined }}
              onClick={props.onBell} title={props.bellOn ? 'Notifications on' : 'Notifications off'}>🔔</button>
            <button style={icoStyle} onClick={props.onSettings} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, position: 'relative' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>Hotel</span>
          <div onClick={() => props.hotels.length > 1 && setPickOpen(!pickOpen)} style={{
            flex: 1, padding: '7px 12px', borderRadius: 8, color: '#fff',
            border: '1px solid rgba(46,124,247,.35)', background: 'rgba(46,124,247,.1)',
            fontSize: 11, fontWeight: 600, display: 'flex', justifyContent: 'space-between',
            cursor: props.hotels.length > 1 ? 'pointer' : 'default',
          }}>
            <span>{current}</span>{props.hotels.length > 1 && <span>▾</span>}
          </div>
          {pickOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 40, zIndex: 1001,
              background: '#0A1F4D', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 10, overflow: 'hidden', minWidth: 190, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
              {props.hotels.map(h => (
                <button key={h.id} onClick={() => { setPickOpen(false); props.onHotel(h.id); }} style={{
                  display: 'block', width: '100%', background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,.06)', textAlign: 'left',
                  color: h.id === props.hotelId ? '#38E1F0' : 'rgba(255,255,255,.8)',
                  fontSize: 12, fontWeight: h.id === props.hotelId ? 700 : 500, padding: '12px 14px',
                }}>{h.name}</button>
              ))}
            </div>
          )}
          <button onClick={props.onRefresh} disabled={busy} style={{
            padding: '7px 16px', borderRadius: 8, whiteSpace: 'nowrap',
            border: busy ? '1px solid rgba(56,225,240,.35)' : '1px solid rgba(255,255,255,.13)',
            background: busy ? 'rgba(56,225,240,.12)' : 'rgba(255,255,255,.06)',
            color: busy ? '#38E1F0' : 'rgba(255,255,255,.8)', fontSize: 11, fontWeight: 600,
            opacity: busy ? 1 : undefined,
          }}>{busy ? '↻ Refreshing…' : '↻ Refresh'}</button>
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
