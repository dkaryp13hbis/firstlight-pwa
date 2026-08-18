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
  year: 'this' | 'next'; onYear: (y: 'this' | 'next') => void;
  comp: 'this' | 'prev'; onComp: (c: 'this' | 'prev') => void;
  textSize: number; onTextSize: (d: number) => void;
  onSignOut: () => void;
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
      <div style={rowStyle}>
        <span style={labelStyle}>Text size</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={tsBtn} onClick={() => props.onTextSize(-1)}>A−</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A6780', minWidth: 34, textAlign: 'center' }}>{props.textSize} / 5</span>
          <button style={tsBtn} onClick={() => props.onTextSize(1)}>A+</button>
        </div>
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <button onClick={props.onSignOut} style={{ border: 'none', background: 'none', padding: 0, fontSize: 15, fontWeight: 700, color: '#D64545' }}>Sign out</button>
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
