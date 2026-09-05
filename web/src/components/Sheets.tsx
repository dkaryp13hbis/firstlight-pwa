/** Bottom sheets — canon styling from the current app's settings/feedback
 *  sheets (white, 22px top radius, drag handle, navy titles). */
import { useState } from 'react';
import type { ReactNode } from 'react';

export function Sheet(props: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div onClick={props.onClose} style={{
        display: props.open ? 'block' : 'none', position: 'fixed', inset: 0,
        background: 'rgba(4,10,26,.55)', zIndex: 1100,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1101,
        background: '#fff', borderRadius: '22px 22px 0 0', color: '#1B2A4A',
        padding: '8px 22px calc(24px + env(safe-area-inset-bottom))',
        maxHeight: '88dvh', overflowY: 'auto',   /* big text sizes: header/✕ stay reachable */
        transform: props.open ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform .25s ease',
      }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: '#D5DAE6', margin: '8px auto 16px' }} />
        {props.children}
      </div>
    </>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 0', borderBottom: '1px solid #EDF0F6',
};
const labelStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#1B2A4A' };

export function SettingsSheet(props: {
  open: boolean; onClose: () => void;
  lang: 'en' | 'el'; onLang: (l: 'en' | 'el') => void;
  revMode: 'gross' | 'net'; onRevMode: (m: 'gross' | 'net') => void;
  pushPrefs: { morning: boolean; alerts: boolean; momentum: boolean } | null;
  onPushPref: (k: 'morning' | 'alerts' | 'momentum', v: boolean) => void;
  bellOn: boolean;
  year: 'this' | 'next'; onYear: (y: 'this' | 'next') => void;
  comp: 'this' | 'prev'; onComp: (c: 'this' | 'prev') => void;
  textSize: number; onTextSize: (d: number) => void;
  onSignOut: () => void;
  onDataHealth: () => void;
}) {
  const segBtn = (on: boolean): React.CSSProperties => ({
    border: 'none', background: on ? '#0F2860' : 'transparent',
    fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
    color: on ? '#fff' : '#5A6780',
  });
  const Y = new Date().getFullYear();
  const tsBtn: React.CSSProperties = {
    width: 44, height: 38, border: 'none', borderRadius: 10,
    background: '#F1F3F8', fontSize: 15, fontWeight: 800, color: '#0F2860',
  };
  return (
    <Sheet open={props.open} onClose={props.onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>Settings</div>
        <button onClick={props.onClose} style={{ border: 'none', background: '#F1F3F8', borderRadius: '50%', width: 32, height: 32, fontSize: 14, color: '#5A6780' }}>✕</button>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Language</span>
        <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
          <button style={segBtn(props.lang === 'en')} onClick={() => props.onLang('en')}>EN</button>
          <button style={segBtn(props.lang === 'el')} onClick={() => props.onLang('el')}>ΕΛ</button>
        </div>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Revenue</span>
        <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
          <button style={segBtn(props.revMode === 'gross')} onClick={() => props.onRevMode('gross')}>Gross</button>
          <button style={segBtn(props.revMode === 'net')} onClick={() => props.onRevMode('net')}>Net</button>
        </div>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Reporting year</span>
        <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
          <button style={segBtn(props.year === 'this')} onClick={() => props.onYear('this')}>{Y}</button>
          <button style={segBtn(props.year === 'next')} onClick={() => props.onYear('next')}>{Y + 1}</button>
        </div>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Comparison year</span>
        {props.year === 'this' ? (
          <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
            <button style={segBtn(true)}>{Y - 1}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
            <button style={segBtn(props.comp === 'this')} onClick={() => props.onComp('this')}>{Y}</button>
            <button style={segBtn(props.comp === 'prev')} onClick={() => props.onComp('prev')}>{Y - 1}</button>
          </div>
        )}
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none', paddingTop: 0, marginTop: -6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6e7a96', lineHeight: 1.4 }}>
          {props.year === 'this'
            ? 'Same time last year & final ' + (Y - 1) + ' on every chart'
            : props.comp === 'prev' ? 'Same stage & final ' + (Y - 1)
            : 'Closed months: final ' + Y + ' · open months: same stage ' + Y}
        </span>
      </div>
      <div style={{ ...rowStyle, display: 'block' }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Notifications</div>
        {props.bellOn && props.pushPrefs ? (
          (['morning', 'alerts', 'momentum'] as const).map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4D5A74' }}>
                {k === 'morning' ? 'Morning briefing' : k === 'alerts' ? 'Intraday alerts' : 'Momentum'}
              </span>
              <div style={{ display: 'flex', background: '#F1F3F8', borderRadius: 10, padding: 3 }}>
                <button style={segBtn(props.pushPrefs![k])} onClick={() => props.onPushPref(k, true)}>On</button>
                <button style={segBtn(!props.pushPrefs![k])} onClick={() => props.onPushPref(k, false)}>Off</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6E7A96', lineHeight: 1.5 }}>
            Turn on the bell 🔔 first — then choose which moments reach your phone:
            the morning briefing, intraday alerts, and momentum highlights.
          </div>
        )}
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Text size</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={tsBtn} onClick={() => props.onTextSize(-1)}>A−</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A6780', minWidth: 34, textAlign: 'center' }}>{props.textSize} / 5</span>
          <button style={tsBtn} onClick={() => props.onTextSize(1)}>A+</button>
        </div>
      </div>
      <div style={rowStyle}>
        <button onClick={props.onDataHealth} style={{ border: 'none', background: 'none', padding: 0, fontSize: 14, fontWeight: 700, color: '#0F2860', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          Data health <span style={{ fontWeight: 600, color: '#6E7A96' }}>· refresh history ›</span>
        </button>
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <button onClick={props.onSignOut} style={{ border: 'none', background: 'none', padding: 0, fontSize: 15, fontWeight: 700, color: '#D64545' }}>Sign out</button>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9AA4B8', letterSpacing: '.06em' }}>v{__BUILD__}</span>
      </div>
    </Sheet>
  );
}

export function FeedbackSheet(props: {
  open: boolean; verdict: 1 | -1; onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Sheet open={props.open} onClose={props.onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>
          Feedback {props.verdict === 1 ? '👍' : '👎'}
        </div>
        <button onClick={props.onClose} style={{ border: 'none', background: '#F1F3F8', borderRadius: '50%', width: 32, height: 32, fontSize: 14, color: '#5A6780' }}>✕</button>
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)}
        placeholder="Add a note (optional) — what was right or wrong?"
        style={{
          width: '100%', minHeight: 90, border: '1.5px solid #E2E7F0', borderRadius: 12,
          padding: 12, fontFamily: 'inherit', fontSize: 15, color: '#1B2A4A', resize: 'none', outline: 'none',
        }} />
      <button onClick={() => { props.onSubmit(note.trim()); setNote(''); }} style={{
        width: '100%', padding: 15, border: 'none', borderRadius: 11, marginTop: 14,
        background: 'linear-gradient(135deg, #2E7CF7, #38E1F0)', color: '#fff',
        fontSize: 16, fontWeight: 700, letterSpacing: '-.01em',
      }}>Submit</button>
    </Sheet>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1200,
      background: '#0A1F4D', color: '#fff', borderRadius: 12, padding: '10px 18px',
      fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.35)', whiteSpace: 'nowrap',
    }}>{msg}</div>
  );
}

/* ── Data health: freshness verdict + Power-BI-style refresh history ── */
import type { RefreshRun } from '../api';

const RUN_LABEL: Record<string, string> = { full: 'Morning briefing', data_only: 'Data refresh', manual: 'Manual refresh' };

function runBadge(status: string) {
  const map: Record<string, [string, string, string]> = {
    success: ['✓', '#1A7A50', 'rgba(26,122,80,.10)'],
    degraded: ['✓', '#B47D09', '#FBEEDC'],
    failed: ['✕', '#B83A1B', 'rgba(184,58,27,.10)'],
    skipped: ['–', '#6E7A96', '#F1F3F8'],
    running: ['…', '#1E5FD0', 'rgba(46,124,247,.10)'],
  };
  const [g, c, bg] = map[status] ?? ['?', '#6E7A96', '#F1F3F8'];
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 99, padding: '2px 8px', color: c, background: bg, whiteSpace: 'nowrap' }}>
      {g} {status}
    </span>
  );
}

export function DataHealthSheet(props: {
  open: boolean; onClose: () => void;
  reportDate: string | null;          // latest briefing report_date (ISO)
  movement: number | null;            // bookings+cancellations over last 2 report days (null = unknown)
  runs: RefreshRun[] | null;          // null = loading or not readable
  runsLoaded: boolean;
}) {
  if (!props.open) return null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const fresh = !!props.reportDate && props.reportDate >= yesterday;
  const fmtDay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z');
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
  };
  const byDay = new Map<string, RefreshRun[]>();
  for (const r of props.runs ?? []) {
    const k = r.started_at.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(r);
  }
  return (
    <Sheet open={props.open} onClose={props.onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>Data health</div>
        <button onClick={props.onClose} style={{ border: 'none', background: '#F1F3F8', borderRadius: '50%', width: 32, height: 32, fontSize: 14, color: '#5A6780' }}>✕</button>
      </div>

      <div style={{
        borderRadius: 12, padding: '11px 13px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 8,
        background: fresh ? 'rgba(26,122,80,.08)' : '#FBEEDC',
        color: fresh ? '#1A7A50' : '#6D4C00',
      }}>
        {props.reportDate
          ? (fresh
            ? <>✓ Data is up to date — latest briefing covers <b>{fmtDay(props.reportDate)}</b>.</>
            : <>⚠ Data may be stale — latest briefing covers <b>{fmtDay(props.reportDate)}</b>; the overnight refresh has not published a newer one.</>)
          : 'No briefing loaded yet.'}
      </div>

      {props.movement !== null && props.movement === 0 && fresh && (
        <div style={{ borderRadius: 12, padding: '11px 13px', fontSize: 12, fontWeight: 600, lineHeight: 1.5, marginBottom: 8, background: '#FBEEDC', color: '#6D4C00' }}>
          ⚠ Refreshes are running, but <b>no new bookings or cancellations for 2 days</b>. If the hotel is in season, the PMS export job on the hotel server may have stopped — worth checking.
        </div>
      )}

      <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: '#6E7A96', margin: '12px 0 4px' }}>Refresh history · last 3 days</div>
      {!props.runsLoaded ? (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6E7A96', padding: '8px 0' }}>Loading…</div>
      ) : props.runs === null ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6E7A96', lineHeight: 1.5, padding: '8px 0' }}>
          Run history is not readable from the app yet — the database policy for it has to be applied first.
        </div>
      ) : props.runs.length === 0 ? (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6E7A96', padding: '8px 0' }}>No refreshes recorded in the last 3 days.</div>
      ) : (
        [...byDay.entries()].map(([day, runs]) => (
          <div key={day} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0F2860', padding: '6px 0 2px' }}>{fmtDay(day)}</div>
            {runs.map((r, i) => {
              const t = new Date(r.started_at);
              const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
              const dur = r.completed_at ? Math.max(1, Math.round((+new Date(r.completed_at) - +t) / 1000)) : null;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 8, alignItems: 'center', padding: '5px 0', borderTop: '1px solid #F1F3F8' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4D5A74', fontVariantNumeric: 'tabular-nums' }}>{hhmm}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1A2540' }}>
                    {RUN_LABEL[r.run_type] ?? r.run_type}
                    {r.attempt && r.attempt > 1 ? <span style={{ color: '#6E7A96' }}> · retry {r.attempt}</span> : null}
                    {r.error_type ? <span style={{ color: '#B83A1B' }}> · {r.error_type}</span> : null}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9AA4B8', fontVariantNumeric: 'tabular-nums' }}>{dur !== null ? `${dur}s` : ''}</span>
                  {runBadge(r.status)}
                </div>
              );
            })}
          </div>
        ))
      )}
      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.5, marginTop: 10 }}>
        Scheduled refreshes: morning briefing 06:30, data refreshes 14:00 and 20:00 (Athens time). Times shown in your local time.
      </div>
    </Sheet>
  );
}
