/** App chrome: navy top bar with the CANONICAL lockup B (verbatim geometry —
 *  never redraw), icon cluster, hotel row with picker, refresh, tab bar. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/* Bottom-nav icons per the user's bottom-nav-final.html design: each tab has
   an outline (line) and an active (fill) variant. Pace = icon B, TY bars
   solid / LY bars hollow — MUST stay identical to ICONS.pace in Overview.tsx. */
const TAB_ICONS: Record<Tab, { line: React.ReactNode; fill: React.ReactNode }> = {
  Overview: {
    line: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
    fill: <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  },
  Pickup: {
    line: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>,
    fill: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>,
  },
  Pace: {
    line: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="4" y="12" width="2.6" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.1" /><rect x="9.2" y="4" width="2.6" height="16" rx="1.3" fill="currentColor" /><rect x="14.4" y="14" width="2.6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.1" /><rect x="19.6" y="9" width="2.6" height="11" rx="1.3" fill="currentColor" /></svg>,
    fill: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="4" y="12" width="2.6" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.1" /><rect x="9.2" y="4" width="2.6" height="16" rx="1.3" fill="currentColor" /><rect x="14.4" y="14" width="2.6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.1" /><rect x="19.6" y="9" width="2.6" height="11" rx="1.3" fill="currentColor" /></svg>,
  },
  Calendar: {
    line: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /></svg>,
    fill: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" fill="currentColor" /><path d="M8 2v4M16 2v4" /><path d="M3.5 10h17" stroke="#fff" strokeWidth="1.6" /><circle cx="12" cy="15" r="1.6" fill="#fff" stroke="none" /></svg>,
  },
  'FL Pulse': {
    line: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16h3l2.4-5 3.2 8 2.4-5H21" stroke="currentColor" strokeWidth="2.2" /><path d="M12 2v2.4M5 4.6l1.6 1.6M19 4.6l-1.6 1.6" stroke="currentColor" strokeWidth="1.8" opacity=".6" /></svg>,
    fill: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16h3l2.4-5 3.2 8 2.4-5H21" stroke="currentColor" strokeWidth="2.6" /><path d="M12 2v2.4M5 4.6l1.6 1.6M19 4.6l-1.6 1.6" stroke="currentColor" strokeWidth="1.8" /></svg>,
  },
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
  tabs?: readonly Tab[];        // portfolio view: Overview · Pickup · Pace · Calendar (no FL Pulse)
  children: ReactNode;
}) {
  const tabs = props.tabs ?? TABS;
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
  /* liquid-glass lens morph: stretch mid-flight like a drop, settle on the
     target; stretch + duration scale with travel distance (WAAPI — a CSS
     left-transition can only slide, it cannot flex) */
  const lensRef = useRef<HTMLSpanElement>(null);
  const lensIdx = Math.max(tabs.indexOf(props.tab), 0);
  const prevIdx = useRef(lensIdx);
  useEffect(() => {
    const el = lensRef.current;
    const from = prevIdx.current;
    prevIdx.current = lensIdx;
    if (!el || from === lensIdx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const d = lensIdx - from;
    const stretch = Math.min(1 + Math.abs(d) * 0.3, 1.9);
    el.animate([
      { transform: `translateX(${from * 100}%) scale(1, 1)` },
      { transform: `translateX(${((from + lensIdx) / 2) * 100}%) scale(${stretch}, .88)`, offset: .45 },
      { transform: `translateX(${lensIdx * 100}%) scale(1.05, .97)`, offset: .82 },
      { transform: `translateX(${lensIdx * 100}%) scale(1, 1)` },
    ], { duration: 420 + Math.abs(d) * 70, easing: 'cubic-bezier(.3, .9, .3, 1)' });
  }, [lensIdx]);
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

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '14px 14px calc(96px + env(safe-area-inset-bottom))', ...(props.textZoom && props.textZoom !== 1 ? { zoom: props.textZoom } as React.CSSProperties : {}) }}>
        {props.children}
      </main>

      {/* §1 bottom tab bar (v2.2). §9 tablet rail: PLACEHOLDER — not built yet.
          Portaled to <body>: the pull-to-refresh wrapper transforms while
          dragging, and a transformed ancestor would drag the fixed bar down. */}
      {createPortal(
      <nav className="fl-tabbar" style={{
        position: 'fixed', left: 12, right: 12, zIndex: 1000, display: 'flex',
        bottom: 'calc(4px + env(safe-area-inset-bottom) / 2)',
        maxWidth: 536, margin: '0 auto', padding: '10px 8px',
      }}>
        <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
        {/* liquid-glass lens: rests via transform, morphs via WAAPI above */}
        <span ref={lensRef} className="fl-lens" style={{ transform: `translateX(${lensIdx * 100}%)`, width: `${100 / tabs.length}%` }} />
        {tabs.map(t => {
          const on = props.tab === t;
          return (
            <button key={t}
              /* select on touch-DOWN like the native iOS tab bar; the
                 guarded onClick keeps keyboard activation working */
              onPointerDown={() => { navigator.vibrate?.(10); props.onTab(t); }}
              onClick={e => { if (e.detail === 0) props.onTab(t); }}
              style={{
              flex: 1, border: 'none', background: 'none', position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: on ? '#1E5FD0' : '#6E7A96', padding: '2px 0',
            }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {on ? TAB_ICONS[t].fill : TAB_ICONS[t].line}
                {t === 'FL Pulse' && props.aiCount ? (
                  <span style={{
                    position: 'absolute', top: -5, right: -10,
                    background: '#2E7CF7', color: '#fff', borderRadius: 999,
                    fontSize: 9, fontWeight: 700, minWidth: 15, height: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>{props.aiCount}</span>
                ) : null}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: on ? 800 : 600, whiteSpace: 'nowrap' }}>{t}</span>
            </button>
          );
        })}
        </div>
      </nav>,
      document.body)}
    </div>
  );
}
