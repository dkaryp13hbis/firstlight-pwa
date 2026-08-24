/** Smart Summary v2 — the navy hero card. Headline + sections are fully
 *  DETERMINISTIC (rule ladder over pre-computed facts; no Claude, updates on
 *  every refresh, follows net mode). "Read the full briefing" expands the
 *  once-a-day narrated hero paragraph. */
import { useMemo, useState } from 'react';
import type { Briefing } from '../types';
import { euro, kilo, signedPct, varPct } from '../api';
import { InfoButton } from './Info';
import { track } from '../lib/track';

function speak(text: string, btn: HTMLButtonElement) {
  const s = window.speechSynthesis;
  if (!s) return;
  if (s.speaking) { s.cancel(); btn.textContent = '🔊'; return; }
  const go = () => {
    const vs = s.getVoices();
    const fem = /samantha|karen|moira|tessa|martha|serena|victoria|zira|aria|jenny|susan|catherine|nicky|female|woman/i;
    let pick = vs.find(v => v.lang?.startsWith('en') && fem.test(v.name))
      ?? vs.find(v => /google us english|google uk english female/i.test(v.name))
      ?? vs.find(v => v.lang?.startsWith('en'));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1.0; u.pitch = 1.05;
    if (pick) u.voice = pick;
    u.onend = () => { btn.textContent = '🔊'; };
    u.onerror = () => { btn.textContent = '🔊'; };
    btn.textContent = '⏹';
    s.speak(u);
  };
  if (s.getVoices().length) go();
  else {
    s.onvoiceschanged = () => { s.onvoiceschanged = null; go(); };
    setTimeout(() => { if (btn.textContent !== '⏹') go(); }, 300);
  }
}

/* bold €/%/numbers on the navy surface, mirroring highlight_dark */
function Rich({ text }: { text: string }) {
  const parts = text.split(/([+\-−]?€?\d(?:[\d.,]*\d)?(?:[KkMm]\b)?%?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[+\-−]?€?\d/.test(p)
          ? <strong key={i} style={{
              color: p.startsWith('-') || p.startsWith('−') ? '#FFB4A3'
                : p.startsWith('+') ? '#56FFC4' : '#fff',
              fontWeight: 800,
            }}>{p}</strong>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

interface Facts {
  weekday: string;
  ydRev: number; ydVar: number; mtdRev: number; mtdVar: number;
  booked7: number; cancelled7: number; net7: number;
  priorNet7: number | null; pickupTrend: 'up' | 'down' | 'flat' | null;
  churnPct: number;
  fyRev: number; fyVar: number;
  best: { month: string; v: number } | null;
  worst: { month: string; v: number } | null;
  perfState: 'AHEAD' | 'BEHIND' | 'MIXED';
  otbState: 'AHEAD' | 'BEHIND' | 'MIXED';
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeFacts(b: Briefing): Facts {
  const d = b.data;
  const ydVar = varPct(d.yesterday.revenue, d.yesterday.revenueLY);
  const mtdVar = varPct(d.mtd.revenue, d.mtd.revenueLY);
  const booked7 = d.pickup.last7d.roomNights;
  const cancelled7 = d.pickup.cancellations7d;
  const net7 = booked7 - cancelled7;
  const churnPct = booked7 > 0 ? (cancelled7 / booked7) * 100 : 0;
  /* prior 7-day net pickup from the daily rows (booking-date axis) */
  const pd = (d as unknown as { pickup_daily?: { ref_date: string; net_rn: number }[] }).pickup_daily ?? [];
  let priorNet7: number | null = null;
  if (pd.length) {
    const end = pd.reduce((m, r) => (r.ref_date > m ? r.ref_date : m), pd[0].ref_date);
    const endD = new Date(end + 'T00:00:00Z').getTime();
    const day = (r: { ref_date: string }) => new Date(r.ref_date + 'T00:00:00Z').getTime();
    const prior = pd.filter(r => { const t = day(r); return t <= endD - 7 * 86400000 && t > endD - 14 * 86400000; });
    if (prior.length) priorNet7 = prior.reduce((s, r) => s + r.net_rn, 0);
  }
  const pickupTrend: Facts['pickupTrend'] = priorNet7 == null ? null
    : priorNet7 <= 0 ? (net7 > 0 ? 'up' : 'flat')
    : net7 >= priorNet7 * 1.15 ? 'up' : net7 <= priorNet7 * 0.85 ? 'down' : 'flat';
  const fyRev = d.pace.reduce((s, p) => s + p.rev, 0);
  const fyStly = d.pace.reduce((s, p) => s + p.rev_stly, 0);
  const fyVar = fyStly ? ((fyRev - fyStly) / fyStly) * 100 : 0;
  const curM = new Date(b.report_date + 'T00:00:00Z').getUTCMonth() + 1;
  const fwd = d.pace.filter(p => p.month_num >= curM && p.rev_stly > 0)
    .map(p => ({ month: p.month, v: varPct(p.rev, p.rev_stly) }));
  const best = fwd.length ? fwd.reduce((a, x) => (x.v > a.v ? x : a)) : null;
  const worst = fwd.length ? fwd.reduce((a, x) => (x.v < a.v ? x : a)) : null;
  const state = (vals: number[]): Facts['perfState'] =>
    vals.every(v => v >= 0) ? 'AHEAD' : vals.every(v => v < 0) ? 'BEHIND' : 'MIXED';
  return {
    weekday: WEEKDAYS[new Date(b.report_date + 'T00:00:00Z').getUTCDay()],
    ydRev: d.yesterday.revenue, ydVar, mtdRev: d.mtd.revenue, mtdVar,
    booked7, cancelled7, net7, priorNet7, pickupTrend, churnPct,
    fyRev, fyVar, best, worst,
    perfState: state([ydVar, mtdVar]),
    otbState: fwd.length ? state(fwd.map(x => x.v)) : 'MIXED',
  };
}

/* Rule ladder — first match wins. All numbers pre-computed; templates only fill slots. */
function headlineFor(f: Facts): string {
  if (f.churnPct >= 15 && f.cancelled7 >= 10)
    return `Watch cancellations — ${f.cancelled7} rooms out this week.`;
  if (Math.abs(f.ydVar) >= 15)
    return f.ydVar > 0
      ? `Strong ${f.weekday} — ${euro(f.ydRev)}, +${Math.round(f.ydVar)}% on last year.`
      : `Soft ${f.weekday} — ${euro(f.ydRev)}, ${Math.round(f.ydVar)}% on last year.`;
  if (f.worst && f.worst.v <= -5)
    return `${f.worst.month} needs attention — ${Math.round(f.worst.v)}% behind last year.`;
  if (f.pickupTrend === 'up' && f.priorNet7 != null && f.net7 >= 20)
    return `Booking pace is accelerating — +${f.net7} rooms this week.`;
  if (f.pickupTrend === 'down' && f.net7 >= 0)
    return `Booking pace is slowing — +${f.net7} rooms this week vs +${f.priorNet7} last week.`;
  return `Steady day — MTD ${f.mtdVar >= 0 ? '+' : ''}${Math.round(f.mtdVar)}% on last year.`;
}

function StatePill({ s }: { s: 'AHEAD' | 'BEHIND' | 'MIXED' | 'SPEEDING UP' | 'SLOWING' | 'STEADY' }) {
  const tone = s === 'AHEAD' || s === 'SPEEDING UP' ? 'ok' : s === 'BEHIND' || s === 'SLOWING' ? 'bad' : 'mid';
  const style: React.CSSProperties = {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', borderRadius: 999, padding: '2px 8px',
    background: tone === 'ok' ? 'rgba(86,255,196,.16)' : tone === 'bad' ? 'rgba(255,180,163,.16)' : 'rgba(255,255,255,.14)',
    color: tone === 'ok' ? '#56FFC4' : tone === 'bad' ? '#FFB4A3' : 'rgba(255,255,255,.75)',
  };
  return <span style={style}>{s}</span>;
}

function Section(props: { label: string; pill?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.12)' }}>
      <div style={{
        fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'var(--cyan)', fontWeight: 600, marginBottom: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}><span>{props.label}</span>{props.pill}</div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,.78)', fontWeight: 600 }}>
        {props.children}
      </div>
    </div>
  );
}

const B = (p: { children: React.ReactNode }) =>
  <b style={{ color: '#fff', fontWeight: 800 }}>{p.children}</b>;

export function SmartSummary({ briefing }: { briefing: Briefing }) {
  const [open, setOpen] = useState(false);
  const d = briefing.data;
  const hero = briefing.ai_insights?.executive_summary ?? '';
  const f = useMemo(() => computeFacts(briefing), [briefing]);
  const headline = useMemo(() => headlineFor(f), [f]);
  const pickupPill = f.pickupTrend === 'up' ? 'SPEEDING UP' as const
    : f.pickupTrend === 'down' ? 'SLOWING' as const : 'STEADY' as const;

  return (
    <div style={{
      borderRadius: 'var(--r-card)', padding: 20, marginBottom: 14, color: '#fff',
      background:
        'radial-gradient(90% 100% at 92% 0%, rgba(56,225,240,.4) 0%, rgba(46,124,247,.16) 40%, rgba(10,31,77,0) 70%),' +
        'linear-gradient(160deg, #0F2860, #0A1F4D)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10,
          letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--cyan)', fontWeight: 600,
        }}>
          <span style={{ width: 5, height: 5, background: 'var(--cyan)', borderRadius: '50%' }} />
          Smart Summary
          <InfoButton k="hero" dark />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 600, letterSpacing: '.04em' }}>
            Last refresh {(() => { const dt = new Date(briefing.data.report_date + 'T00:00:00Z'); return `${String(dt.getUTCDate()).padStart(2, '0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getUTCMonth()]}`; })()} · {d.generated_at}
          </span>
          {hero && <button title="Listen to the briefing" onClick={e => { track('voice_play', {}); speak(hero, e.currentTarget); }} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 999, width: 32, height: 32, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>🔊</button>}
        </span>
      </div>

      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.02em', marginBottom: 12 }}>
        <Rich text={headline} />
      </div>
      <Section label="Performance" pill={<StatePill s={f.perfState} />}>
        Yesterday <B>{euro(f.ydRev)}</B> · <B>{signedPct(f.ydVar, 0)}</B> vs LY
        &ensp;·&ensp;MTD <B>{kilo(f.mtdRev)}</B> · <B>{signedPct(f.mtdVar, 0)}</B>
      </Section>
      <Section label="Pickup" pill={<StatePill s={pickupPill} />}>
        <B>+{f.booked7}</B> booked · <B>−{f.cancelled7}</B> cancelled · net <B>+{f.net7}</B> rn / 7 days
        {f.priorNet7 != null && <>
          {' '}{f.pickupTrend === 'down'
            ? <b style={{ color: '#FFB4A3', fontWeight: 800 }}>▼</b>
            : f.pickupTrend === 'up' ? <b style={{ color: '#56FFC4', fontWeight: 800 }}>▲</b> : null}
          {' '}vs prior week <B>{f.priorNet7 >= 0 ? '+' : ''}{f.priorNet7}</B>
        </>}
      </Section>
      <Section label="On the Books" pill={<StatePill s={f.otbState} />}>
        Full year <B>€{(f.fyRev / 1e6).toFixed(2)}M</B> · <B>{signedPct(f.fyVar, 0)}</B> vs STLY
        {f.best && f.worst && f.best.month !== f.worst.month && <>
          &ensp;·&ensp;best <B>{f.best.month} {signedPct(f.best.v, 0)}</B>
          {f.worst.v < 0 ? <> · watch <B>{f.worst.month} {signedPct(f.worst.v, 0)}</B></> : null}
        </>}
      </Section>

      {hero && (open ? (
        <>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,.85)', marginTop: 10 }}>
            <Rich text={hero} />
          </div>
          <button onClick={() => setOpen(false)} style={{
            border: 'none', background: 'none', color: 'var(--cyan)',
            fontSize: 13.5, fontWeight: 700, marginTop: 8, padding: 0,
          }}>Show less ↑</button>
        </>
      ) : (
        <button onClick={() => { track('hero_expand', {}); setOpen(true); }} style={{
          border: 'none', background: 'none', color: 'var(--cyan)',
          fontSize: 13.5, fontWeight: 700, marginTop: 3, padding: 0,
        }}>Read the full briefing →</button>
      ))}
    </div>
  );
}
