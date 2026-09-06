/** App chrome: navy top bar with the CANONICAL lockup B (verbatim geometry —
 *  never redraw), icon cluster, hotel row with picker, refresh, tab bar. */
import { useEffect, useState } from 'react';
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
        <g stroke="#38E1F0" strokeWidth="3" strokeLinecap="round" opacity=".5">
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

const TABS = ['Overview', 'Pickup', 'Pace', 'Calendar', 'FL Pulse'] as const;
export type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Overview: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  Pickup: <><path d="M4 19l5-6 4 3 7-9" /><path d="M15 7h5v5" /></>,
  Pace: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  Calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9.5h18" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /></>,
  'FL Pulse': <><path d="M3 16h3l2.4-5 3.2 8 2.4-5H21" strokeWidth="2.2" /><g opacity=".8"><path d="M12 3.2v2.2" /><path d="M5.6 5.6l1.5 1.5" /><path d="M18.4 5.6l-1.5 1.5" /></g></>,
};

const icoStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.11)',
  color: 'rgba(255,255,255,.85)', fontSize: 14,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};

export function Shell(props: {
  hotels: { id: string; name: string }[];
  hotelId: string;
  onHotel: (id: string) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  aiCount?: number;
  textZoom?: number;
  refreshState: 'idle' | 'busy' | 'done' | 'error';
  onRefresh: () => void;
  bellOn: boolean;
  onBell: () => void;
  onSettings: () => void;
  children: ReactNode;
}) {
  const [pickOpen, setPickOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let col = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!col && y > 60) { col = true; setCollapsed(true); }
      else if (col && y < 20) { col = false; setCollapsed(false); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const current = props.hotels.find(h => h.id === props.hotelId)?.name ?? 'Hotel';
  const busy = props.refreshState === 'busy';
  return (
    <div>
      <div id="fl-sticky" style={{ position: 'sticky', top: 0, zIndex: 999 }}>
      <header style={{ background: 'var(--app-top)', padding: 'calc(10px + env(safe-area-inset-top)) 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: collapsed ? 48 : undefined }}>
          {collapsed ? (
            <span onClick={() => { if (props.hotels.length > 1) { window.scrollTo({ top: 0, behavior: 'smooth' }); setPickOpen(true); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: props.hotels.length > 1 ? 'pointer' : 'default', minWidth: 0 }}>
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
                <g transform="translate(50,50) scale(.78) translate(-52,-50)">
                  <path d="M18 38 38 28 54 33 74 16" stroke="#2E7CF7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="74" cy="16" r="5" fill="#38E1F0" />
                  <rect x="18" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="18" y="50" width="26" height="8" rx="4" fill="#fff" /><rect x="18" y="64" width="19" height="8" rx="4" fill="#fff" />
                  <rect x="62" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="62" y="78" width="24" height="8" rx="4" fill="#fff" />
                </g>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '46vw' }}>{current}</span>
              {props.hotels.length > 1 && <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>▾</span>}
            </span>
          ) : <LogoLockup />}
          <div style={{ display: 'flex', gap: 10 }}>
            {collapsed && (
              <button onClick={props.onRefresh} disabled={busy} title="Refresh"
                style={{ ...icoStyle, width: 30, height: 30, fontSize: 12, color: 'var(--cyan)', borderColor: 'rgba(56,225,240,.45)' }}>
                {busy ? '…' : '↻'}
              </button>
            )}
            <button style={{ ...icoStyle, display: collapsed ? 'none' : icoStyle.display, position: 'relative', overflow: 'visible', color: props.bellOn ? '#38E1F0' : icoStyle.color, borderColor: 'rgba(56,225,240,.4)' }}
              onClick={props.onBell} title={props.bellOn ? 'Notifications on' : 'Notifications off'}>
              🔔
              <span style={{
                position: 'absolute', right: -3, bottom: -3, width: 15, height: 15, borderRadius: '50%',
                background: props.bellOn ? '#1A7A50' : '#D64545', border: '2px solid var(--app-top)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  {props.bellOn
                    ? <polyline points="4 12.5 10 18 20 6" />
                    : <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>}
                </svg>
              </span>
            </button>
            <button style={{ ...icoStyle, display: collapsed ? 'none' : icoStyle.display }} title="Share"
              onClick={() => { if (navigator.share) navigator.share({ title: 'FirstLight — Morning Briefing', url: location.href }).catch(() => undefined); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <button style={icoStyle} onClick={props.onSettings} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
          marginTop: collapsed ? 0 : 12, maxHeight: collapsed ? 0 : 44, opacity: collapsed ? 0 : 1,
          overflow: pickOpen ? 'visible' : 'hidden', transition: 'max-height .25s ease, opacity .25s ease, margin .25s ease',
          pointerEvents: collapsed ? 'none' : undefined,
        }}>
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

      </div>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '14px 14px calc(84px + env(safe-area-inset-bottom))', ...(props.textZoom && props.textZoom !== 1 ? { zoom: props.textZoom } as React.CSSProperties : {}) }}>
        {props.children}
      </main>

      {/* §1 bottom tab bar (v2.2). §9 tablet rail: PLACEHOLDER — not built yet. */}
      <nav style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
        background: '#fff', borderTop: '1px solid #E2E7F0',
        boxShadow: '0 -6px 18px rgba(10,20,45,.06)', display: 'flex',
        padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
      }}>
        {TABS.map(t => {
          const on = props.tab === t;
          return (
            <button key={t} onClick={() => { navigator.vibrate?.(10); props.onTab(t); }} style={{
              flex: 1, border: 'none', background: 'none', position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: on ? '#1E5FD0' : '#6E7A96', padding: '2px 0',
            }}>
              {on && <span style={{
                position: 'absolute', top: -8, left: '22%', right: '22%', height: 3,
                borderRadius: '0 0 3px 3px', background: 'linear-gradient(90deg,#2E7CF7,#38E1F0)',
              }} />}
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{TAB_ICONS[t]}</svg>
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 600 }}>{t}</span>
              {t === 'FL Pulse' && props.aiCount ? (
                <span style={{
                  position: 'absolute', top: -4, right: 'calc(50% - 22px)',
                  background: 'var(--blue)', color: '#fff', borderRadius: 999,
                  fontSize: 9, fontWeight: 700, minWidth: 15, height: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{props.aiCount}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
