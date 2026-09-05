/** Pace tab visuals — parity spec 2026-08-15. Legacy chart conventions:
 *  y-axis ticks + gridlines, right-aligned square-swatch legends
 *  (OTB TY / STLY / Final LY), no per-bar labels, navy series, occupancy
 *  area fill, taller plots. Plus: Where each month stands, booking speed
 *  with trend words, demand heat with behind-LY note, ADR bridge table. */
import { useEffect, useMemo, useState } from 'react';
import type { Briefing, PaceMonth } from '../types';
import { euro, kilo, signedPct } from '../api';
import { SectionLabel, LabelSub, ICONS } from './Overview';
import { InfoButton } from './Info';
import { monthSpeed } from '../lib/speed';
import { softRuns, rangeKey, rangeTitle, isoAdd } from '../lib/watch';

const NAVY = '#0F2860', GREY = '#CDD4E0', GREEN = '#1A7A50', RED = '#B83A1B', AMBER = '#B47D09';

function ChartCard({ title, sub, icon, info, legend, inner, children }: {
  title: string; sub?: string; icon?: string; info?: string;
  legend?: [string, string, boolean?][]; inner?: boolean; children: React.ReactNode;
}) {
  if (inner) {
    return (
      <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {icon && ICONS[icon]}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          {info && <InfoButton k={info} />}
          {legend && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 10, fontWeight: 600, color: 'var(--n600)' }}>
              {legend.map(([c, l, dash]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 9, height: dash ? 2 : 9, background: dash ? 'transparent' : c,
                    borderTop: dash ? `2px dashed ${c}` : 'none', borderRadius: 2, display: 'inline-block',
                  }} />{l}
                </span>
              ))}
            </span>
          )}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel icon={icon} info={info} title={title}>
        {title}{sub && <LabelSub> · {sub}</LabelSub>}
      </SectionLabel>
      <div className="card" style={{ padding: '18px 18px 14px' }}>
        {legend && (
          <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, fontSize: 10, fontWeight: 600, color: 'var(--n600)', marginBottom: 8 }}>
            {legend.map(([c, l, dash]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 9, height: dash ? 2 : 9, background: dash ? 'transparent' : c,
                  borderTop: dash ? `2px dashed ${c}` : 'none', borderRadius: 2, display: 'inline-block',
                }} />{l}
              </span>
            ))}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── Pace bar charts: axis + gridlines, no per-bar labels ─────────────── */

const W = 560, H = 268, BOT = 200, CH = 172;

function Grid({ mx, fmt }: { mx: number; fmt: (v: number) => string }) {
  return (
    <>
      {[0, 1 / 3, 2 / 3, 1].map(f => (
        <g key={f}>
          <line x1={62} y1={BOT - f * CH} x2={W - 10} y2={BOT - f * CH} stroke="#EBEEF4" strokeWidth={f === 0 ? 1.5 : 1} />
          <text x={56} y={BOT - f * CH + 4} textAnchor="end" style={{ fontSize: 13, fontWeight: 600, fill: '#79747E' }}>{fmt(f * mx)}</text>
        </g>
      ))}
    </>
  );
}

function BarPace({ months, field, fieldStly, fieldFinal, fmt, fmtFull }: {
  months: PaceMonth[]; field: 'rev' | 'adr'; fieldStly: 'rev_stly' | 'adr_stly';
  fieldFinal: 'rev_final' | 'adr_final_ly'; fmt: (v: number) => string;
  fmtFull: (v: number) => string;
}) {
  const n = months.length, step = (W - 82) / n, bw = n > 6 ? 13 : 15;
  const curM = new Date().getMonth() + 1;
  const mx = Math.max(1, ...months.map(m => Math.max(m[field] as number, m[fieldStly] as number, (m[fieldFinal] as number) || 0))) * 1.08;
  const [tip, setTip] = useState<number | null>(null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}
      onMouseLeave={() => setTip(null)}
      onPointerDown={e => { if (e.pointerType !== 'mouse' && e.target === e.currentTarget) setTip(null); }}>
      <Grid mx={mx} fmt={fmt} />
      {months.map((m, i) => {
        const x = 62 + i * step + step / 2;
        const vTy = (m[field] as number) / mx * CH;
        const vLy = (m[fieldStly] as number) / mx * CH;
        const vs = (m[fieldStly] as number) ? (((m[field] as number) - (m[fieldStly] as number)) / (m[fieldStly] as number)) * 100 : 0;
        return (
          <g key={m.month}
            /* mouse: hover shows; touch: tap toggles (iOS fires synthetic
               mouseenter+click on tap, which double-toggled — so pointer
               events with a type check, and touch never runs the hover path) */
            onPointerEnter={e => { if (e.pointerType === 'mouse') setTip(i); }}
            onPointerDown={e => { if (e.pointerType !== 'mouse') setTip(t => (t === i ? null : i)); }}
            onClick={e => e.stopPropagation()}
            style={{ cursor: 'pointer', touchAction: 'pan-y' }}>
            <rect x={62 + i * step} y={0} width={step} height={BOT + 44} fill="transparent" />
            <rect x={x - bw - 1} y={BOT - vTy} width={bw} height={vTy} rx={1.5}
              fill={(m[field] as number) >= ((m[fieldFinal] as number) || Infinity) ? GREEN : NAVY} />
            <rect x={x + 1} y={BOT - vLy} width={bw} height={vLy} rx={1.5} fill={GREY} />
            {(m[fieldFinal] as number) > 0 && m.month_num >= curM && (
              <line x1={x - bw - 7} y1={BOT - (m[fieldFinal] as number) / mx * CH}
                x2={x + bw + 7} y2={BOT - (m[fieldFinal] as number) / mx * CH}
                stroke={GREEN} strokeWidth={2.5} strokeDasharray="4,3" />
            )}
            <text x={x} y={BOT + 15} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: '#4D5A74' }}>{m.month}</text>
            <rect x={x - 27} y={BOT + 22} width={54} height={22} rx={5}
              fill={vs >= 0 ? 'rgba(26,122,80,0.10)' : 'rgba(184,58,27,0.10)'} />
            <text x={x} y={BOT + 38} textAnchor="middle" style={{ fontSize: 14.5, fontWeight: 800, fill: vs >= 0 ? GREEN : RED }}>
              {vs >= 0 ? '+' : ''}{Math.round(vs)}%
            </text>
          </g>
        );
      })}
      {tip != null && months[tip] && (() => {
        const m = months[tip];
        const closed = m.month_num < curM;
        const fin = (m[fieldFinal] as number) || 0;
        const rows: { sw: string; dash?: boolean; label: string; v: number }[] = closed
          ? [{ sw: (m[field] as number) >= (fin || Infinity) ? GREEN : NAVY, label: 'TY', v: m[field] as number },
             ...(fin > 0 ? [{ sw: GREEN, dash: true, label: 'Final LY', v: fin }] : []),
             ...(fin <= 0 ? [{ sw: GREY, label: 'STLY', v: m[fieldStly] as number }] : [])]
          : [{ sw: (m[field] as number) >= (fin || Infinity) ? GREEN : NAVY, label: 'OTB TY', v: m[field] as number },
             { sw: GREY, label: 'STLY', v: m[fieldStly] as number },
             ...(fin > 0 ? [{ sw: GREEN, dash: true, label: 'Final LY', v: fin }] : [])];
        const ref = closed ? (fin || (m[fieldStly] as number)) : (m[fieldStly] as number);
        const dv = ref ? (((m[field] as number) - ref) / ref) * 100 : 0;
        const tw = 168, th = 34 + rows.length * 21 + 20;
        const cx = 62 + tip * step + step / 2;
        const tx = Math.max(64, Math.min(W - 12 - tw, cx - tw / 2));
        const ty = 6;
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx} y={ty} width={tw} height={th} rx={12}
              fill="#fff" stroke="rgba(10,31,77,.12)" strokeWidth={1}
              filter="drop-shadow(0 4px 10px rgba(10,20,45,.18))" />
            <text x={tx + 14} y={ty + 21} style={{ fontSize: 12.5, fontWeight: 800, fill: '#0A1F4D' }}>
              {m.month}{closed ? ' · final' : ''}
            </text>
            {rows.map((r, ri) => (
              <g key={r.label}>
                {r.dash
                  ? <line x1={tx + 14} y1={ty + 34 + ri * 21} x2={tx + 24} y2={ty + 34 + ri * 21}
                      stroke={r.sw} strokeWidth={2.5} strokeDasharray="3,2.5" />
                  : <rect x={tx + 14} y={ty + 30 + ri * 21} width={10} height={10} rx={2.5} fill={r.sw} />}
                <text x={tx + 31} y={ty + 39 + ri * 21} style={{ fontSize: 11.5, fontWeight: 600, fill: '#6E7A96' }}>{r.label}</text>
                <text x={tx + tw - 14} y={ty + 39 + ri * 21} textAnchor="end"
                  style={{ fontSize: 12, fontWeight: 800, fill: '#1A2540' }}>{fmtFull(r.v)}</text>
              </g>
            ))}
            <text x={tx + 14} y={ty + th - 9}
              style={{ fontSize: 11, fontWeight: 800, fill: dv >= 0 ? GREEN : RED }}>
              {dv >= 0 ? '▲ +' : '▼ '}{Math.round(dv)}% vs {closed ? (fin > 0 ? 'final LY' : 'STLY') : 'STLY'}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

function OccPace({ months }: { months: PaceMonth[] }) {
  const n = months.length, step = (W - 82) / n;
  const curM = new Date().getMonth() + 1;
  const x = (i: number) => 62 + i * step + step / 2;
  const y = (v: number) => BOT - Math.min(v, 1.05) * CH;
  /* monotone-style smoothing: Catmull-Rom -> cubic Bezier, tension .5 —
     curves through every point without overshooting between months */
  const path = (pts: [number, number][]) => {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const occPts: [number, number][] = months.map((m, i) => [x(i), y(m.occ)]);
  const stlyPts: [number, number][] = months.map((m, i) => [x(i), y(m.stly)]);
  const finPts: [number, number][] = months.filter(m => m.month_num >= curM).map(m => [x(months.indexOf(m)), y(m.final)]);
  const area = `${path(occPts)} L${occPts[occPts.length - 1][0]},${BOT} L${occPts[0][0]},${BOT} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <Grid mx={1} fmt={v => `${Math.round(v * 100)}%`} />
      <path d={area} fill="rgba(15,40,96,.07)" />
      <path d={path(stlyPts)} fill="none" stroke={GREY} strokeWidth={2.5} />
      {finPts.length > 1 && <path d={path(finPts)} fill="none" stroke={GREEN} strokeWidth={2.2} strokeDasharray="5,3.5" strokeLinecap="round" />}
      <path d={path(occPts)} fill="none" stroke={NAVY} strokeWidth={3} />
      {months.map((m, i) => {
        const beat = m.final > 0 && m.occ >= m.final;
        const vs = m.stly ? ((m.occ - m.stly) / m.stly) * 100 : 0;
        return (
          <g key={m.month}>
            <circle cx={x(i)} cy={y(m.occ)} r={3.5} fill={NAVY} />
            <rect x={x(i) - 22} y={y(m.occ) - 28} width={44} height={19} rx={4} fill="white" opacity={0.92} />
            <text x={x(i)} y={y(m.occ) - 14} textAnchor="middle" style={{ fontSize: 13.5, fontWeight: 800, fill: beat ? GREEN : '#1A2540' }}>
              {Math.round(m.occ * 100)}%
            </text>
            <text x={x(i)} y={BOT + 15} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: '#4D5A74' }}>{m.month}</text>
            <rect x={x(i) - 27} y={BOT + 22} width={54} height={22} rx={5}
              fill={vs >= 0 ? 'rgba(26,122,80,0.10)' : 'rgba(184,58,27,0.10)'} />
            <text x={x(i)} y={BOT + 38} textAnchor="middle" style={{ fontSize: 14.5, fontWeight: 800, fill: vs >= 0 ? GREEN : RED }}>
              {vs >= 0 ? '+' : ''}{Math.round(vs)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}


/* ── Booking speed (legend, trend word, needed marker, passed detail) ── */

interface DailyRow { ref_date: string; stay_year: number; stay_month: number; net_rn: number; }

export function BookingSpeed({ months, daily }: { months: PaceMonth[]; daily: DailyRow[] }) {
  /* speed math lives in lib/speed.ts — shared with the Watchlist so both agree */
  const rows = useMemo(() => months
    .map(m => { const s = monthSpeed(m, daily); return s && { month: m.month, ...s }; })
    .filter((r): r is NonNullable<typeof r> => !!r), [months, daily]);
  if (!rows.length) return null;
  const mx = Math.max(1, ...rows.flatMap(r => [r.s7, r.s14, r.needed])) * 1.1;
  return (
    <ChartCard title="Booking Speed" sub="rooms per day" icon="speed" info="vel"
      legend={[[NAVY, 'last 7 days'], ['#7FB0FA', 'last 14 days'], [AMBER, 'needed for LY final', true]]}>
      {rows.map(r => (
        <div key={r.month} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{r.month}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              color: r.trend === 'slowing down' ? RED : r.trend === 'speeding up' ? GREEN : 'var(--n500)',
            }}>{r.trend}</span>
            {r.hasRef && <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 600, color: 'var(--n600)' }}>
              {r.passed
                ? <b style={{ color: GREEN, fontWeight: 700 }}>✓ passed LY final (+{Math.round(r.over)} rn)</b>
                : <>need <b style={{ fontWeight: 800, color: 'var(--text)' }}>{r.needed.toFixed(1)}</b>/day to reach LY final</>}
            </span>}
          </div>
          {([['7d', r.s7, NAVY], ['14d', r.s14, '#7FB0FA']] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cap)', width: 26 }}>{l}</span>
              <div style={{ flex: 1, height: 10, background: '#EDF0F6', borderRadius: 5, position: 'relative' }}>
                <div style={{ width: `${Math.min(v / mx, 1) * 100}%`, height: '100%', background: c, borderRadius: 5 }} />
                {r.hasRef && !r.passed && <div style={{ position: 'absolute', left: `${Math.min(r.needed / mx, 1) * 100}%`, top: -2, bottom: -2, width: 2, background: AMBER }} />}
              </div>
              <b style={{ fontSize: 11, fontWeight: 800, width: 66, textAlign: 'right', color: 'var(--text)' }}>
                {v.toFixed(1)} <span style={{ fontWeight: 600, color: 'var(--cap)', fontSize: 9.5 }}>/day·{l}</span>
              </b>
            </div>
          ))}
        </div>
      ))}
    </ChartCard>
  );
}

/* ── Demand heat (subtitle, single-letter weekdays, behind-LY note) ───── */

const RAMP = ['#F2F2F7', '#E1EBFB', '#C4DAF9', '#9FC4F6', '#6FA7F2', '#3D87EE', '#0A6CDF'];
const bucket = (occ: number) => { for (let i = 0; i < 6; i++) if (occ < [0.20, 0.35, 0.50, 0.65, 0.78, 0.88][i]) return i; return 6; };

const WDL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLbl = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); return `${WDL[d.getUTCDay()]} ${d.getUTCDate()}`; };

/** Heatmap cells are tap targets when `onWatch` is given: one tap = a date,
 *  a second tap = a range; the panel under the grid offers Watch this date /
 *  this week / the flagged soft run the date sits in. */
function DemandHeat({ briefing, onWatch, watched }: {
  briefing: Briefing;
  onWatch?: (from: string, to: string) => void;
  watched?: Set<string>;                       // range keys "from..to" already watched
}) {
  const [sel, setSel] = useState<string[]>([]);
  /* the tapped selection belongs to ONE hotel — clear it when the briefing
     switches to another (the component stays mounted, so state survives) */
  const hotelKey = briefing.data.hotel_name;
  useEffect(() => { setSel([]); }, [hotelKey]);
  const rooms = briefing.data.total_rooms;
  const otb = (briefing.data.otb_by_date ?? []).slice(0, 60);
  const runs = useMemo(() => softRuns(briefing, 20), [briefing]);
  if (!otb.length || !rooms) return null;
  const cells: ({ empty: true } | { empty: false; iso: string; d: Date; occ: number; ring: boolean; newMonth: boolean })[] = [];
  const anoms: string[] = [];
  const first = new Date(otb[0].stay_date + 'T00:00:00Z');
  for (let i = 0; i < (first.getUTCDay() + 6) % 7; i++) cells.push({ empty: true });
  let prevMonth = first.getUTCMonth();
  for (const r of otb) {
    const d = new Date(r.stay_date + 'T00:00:00Z');
    const occ = (r.rn_ty || 0) / rooms;
    const occLy = (r.rn_stly || 0) / rooms;
    const ring = occLy >= 0.30 && occ < 0.5 * occLy;
    if (ring) anoms.push(`${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    cells.push({ empty: false, iso: r.stay_date, d, occ, ring, newMonth: d.getUTCMonth() !== prevMonth });
    prevMonth = d.getUTCMonth();
  }

  /* selection → candidate ranges */
  const tap = (iso: string) => {
    if (!onWatch) return;
    setSel(s => s.length === 1 && s[0] !== iso ? [s[0], iso].sort() : s.length === 1 ? [] : [iso]);
  };
  const from = sel[0], to = sel[sel.length - 1];
  const inSel = (iso: string) => !!from && iso >= from && iso <= to;
  const stats = (a: string, b: string) => {
    const rows = otb.filter(r => r.stay_date >= a && r.stay_date <= b);
    const n = rows.length || 1;
    return {
      occ: Math.round(rows.reduce((s, r) => s + r.rn_ty, 0) / (rooms * n) * 100),
      ly: Math.round(rows.reduce((s, r) => s + r.rn_stly, 0) / (rooms * n) * 100),
      days: rows.length,
    };
  };
  const options: { from: string; to: string; label: string; soft?: boolean }[] = [];
  if (from) {
    if (sel.length === 1) {
      options.push({ from, to: from, label: `Watch ${dayLbl(from)}` });
      const dow = (new Date(from + 'T00:00:00Z').getUTCDay() + 6) % 7;          // Mon = 0
      const mon = isoAdd(from, -dow), sun = isoAdd(mon, 6);
      const wFrom = mon < otb[0].stay_date ? otb[0].stay_date : mon;
      if (wFrom !== sun) options.push({ from: wFrom, to: sun, label: `Watch this week · ${rangeTitle(wFrom, sun)}` });
      const run = runs.find(r => from >= r.from && from <= r.to);
      if (run && run.from !== run.to) options.push({ from: run.from, to: run.to, label: `Watch ${rangeTitle(run.from, run.to)} · behind LY`, soft: true });
    } else {
      options.push({ from, to, label: `Watch ${rangeTitle(from, to)}` });
    }
  }
  const selStats = from ? stats(from, to) : null;

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel icon="heat" info="heat" title="Next 60 Days Demand">Next 60 Days Demand</SectionLabel>
      <div className="card" style={{ padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--n600)', lineHeight: 1.5, margin: '4px 0 12px' }}>
        Occupancy on the books per stay date — darker = fuller. A red outline marks a date far behind last year.
        {onWatch && ' Tap a date to watch it — tap a second date for a range.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--cap)' }}>{w}</div>
        ))}
        {cells.map((c, i) => c.empty ? <div key={i} /> : (
          <div key={i} onClick={() => tap(c.iso)} style={{
            borderRadius: 7, padding: '7px 0 6px', textAlign: 'center', cursor: onWatch ? 'pointer' : undefined,
            background: RAMP[bucket(c.occ)],
            color: bucket(c.occ) >= 4 ? '#fff' : '#1D1B20',
            boxShadow: [
              inSel(c.iso) ? '0 0 0 2px #2E7CF7' : '',
              c.ring ? 'inset 0 0 0 2px #BA1A1A' : c.newMonth ? 'inset 2px 0 0 #1D1B20' : '',
            ].filter(Boolean).join(', ') || undefined,
            transform: inSel(c.iso) ? 'scale(1.04)' : undefined,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{Math.round(c.occ * 100)}%</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .75 }}>
              {String(c.d.getUTCDate()).padStart(2, '0')}/{String(c.d.getUTCMonth() + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
      {onWatch && from && selStats && (
        <div style={{ background: '#F1F6FF', borderRadius: 12, padding: '10px 12px', marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F2860' }}>
              {sel.length === 1 ? dayLbl(from) : rangeTitle(from, to)}
              <span style={{ fontWeight: 600, color: 'var(--n600)', marginLeft: 6 }}>
                {selStats.occ}% booked · last year {selStats.ly}%{sel.length > 1 ? ` · ${selStats.days} dates` : ''}
              </span>
            </span>
            {sel.length === 1 && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n500)' }}>tap another date for a range</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {options.map(o => {
              const on = !!watched?.has(rangeKey(o.from, o.to));
              return (
                <button key={o.label} disabled={on} onClick={() => { onWatch(o.from, o.to); setSel([]); }} style={{
                  border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 11.5, fontWeight: 700,
                  background: on ? '#E2E7F0' : o.soft ? '#FFF1D6' : '#0F2860',
                  color: on ? '#6E7A96' : o.soft ? '#8A5A00' : '#fff',
                }}>{on ? `Watching ✓ ${o.label.replace(/^Watch (this week · )?/, '')}` : o.label}</button>
              );
            })}
            <button onClick={() => setSel([])} style={{ border: 'none', background: 'none', fontSize: 11.5, fontWeight: 700, color: '#6E7A96', padding: '7px 8px' }}>Clear</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 10, fontSize: 10, fontWeight: 600, color: 'var(--n600)' }}>
        empty {RAMP.map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />)} full
        <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#F2F2F7', boxShadow: 'inset 0 0 0 2px #BA1A1A', display: 'inline-block' }} /> behind LY
        </span>
      </div>
      {anoms.length > 0 && (
        <div style={{
          background: '#FBEEDC', color: '#6D4C00', borderRadius: 12,
          fontSize: 12, lineHeight: 1.5, padding: '10px 13px', marginTop: 10, fontWeight: 600,
        }}>⚠ Dates far behind last year: {anoms.slice(0, 6).join(', ')}</div>
      )}
    </div>
    </div>
  );
}

/* ── ADR bridge — why the rate moved (explainer + channel table) ──────── */

interface ConsumedRow { period: 'TY' | 'LY'; source: string; rn: number; rev: number; }

function AdrBridge({ briefing }: { briefing: Briefing }) {
  const rows = (briefing.data as unknown as { consumed_by_source?: ConsumedRow[] }).consumed_by_source ?? [];
  const model = useMemo(() => {
    // zero-night rows (pure revenue adjustments) can't be decomposed —
    // exclude from BOTH sides so mix+rate stays exactly equal to the delta
    const ty = rows.filter(r => r.period === 'TY' && r.rn > 0);
    const ly = rows.filter(r => r.period === 'LY' && r.rn > 0);
    const tot = (xs: ConsumedRow[]) => xs.reduce((a, r) => ({ rn: a.rn + r.rn, rev: a.rev + r.rev }), { rn: 0, rev: 0 });
    const T = tot(ty), L = tot(ly);
    if (!T.rn || !L.rn) return null;
    const adrT = T.rev / T.rn, adrL = L.rev / L.rn;
    const srcs = [...new Set(rows.map(r => r.source))];
    const per = srcs.map(s => {
      const t = ty.find(r => r.source === s), l = ly.find(r => r.source === s);
      const shT = (t?.rn ?? 0) / T.rn, shL = (l?.rn ?? 0) / L.rn;
      const aT = t && t.rn ? t.rev / t.rn : 0, aL = l && l.rn ? l.rev / l.rn : 0;
      return {
        source: s, shT, shL, aT: t && t.rn ? aT : aL, aL,
        mix: (shT - shL) * (aL - adrL),
        rate: shT * ((t && t.rn ? aT : aL) - aL),
      };
    });
    const mix = per.reduce((s, p) => s + p.mix, 0);
    const rate = per.reduce((s, p) => s + p.rate, 0);
    const delta = adrT - adrL;
    if (Math.abs(mix + rate - delta) > 0.05) return null;
    return { adrT, adrL, delta, mix, rate, per: per.sort((a, b) => Math.abs(b.mix + b.rate) - Math.abs(a.mix + a.rate)).slice(0, 5) };
  }, [rows]);
  if (!model) return null;
  const sgn = (v: number) => `${v >= 0 ? '+' : '−'}€${Math.abs(v).toFixed(0)}`;
  const scale = Math.max(model.adrT, model.adrL) * 1.06 || 1;
  const W = (v: number) => (Math.abs(v) / scale) * 100;
  const mixStart = Math.min(model.adrL, model.adrL + model.mix);
  const rateStart = Math.min(model.adrL + model.mix, model.adrL + model.mix + model.rate);
  const top = model.per.reduce<{ name: string; kind: string; v: number }>((best, p) => {
    const cand = Math.abs(p.mix) >= Math.abs(p.rate)
      ? { name: p.source, kind: 'mix', v: p.mix } : { name: p.source, kind: 'rate', v: p.rate };
    return Math.abs(cand.v) > Math.abs(best.v) ? cand : best;
  }, { name: '', kind: '', v: 0 });
  const sentence = `ADR is ${model.delta >= 0 ? 'up' : 'down'} €${Math.abs(model.delta).toFixed(0)} vs last year — mix ${sgn(model.mix)}, rate ${sgn(model.rate)}. Biggest driver: ${top.name} ${top.kind} ${sgn(top.v)}.`;
  const Row = ({ label, left, width, color, value, vColor }: {
    label: string; left: number; width: number; color: string; value: string; vColor?: string;
  }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 46, fontSize: 10, fontWeight: 700, color: 'var(--n600)' }}>{label}</div>
      <div style={{ flex: 1, height: 13, background: 'var(--grey-100)', borderRadius: 7, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${Math.max(width, 0.8)}%`, background: color, borderRadius: 7 }} />
      </div>
      <div style={{ width: 52, textAlign: 'right', fontSize: 11, fontWeight: 800, color: vColor ?? 'var(--text)' }}>{value}</div>
    </div>
  );
  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel icon="bridge" info="bridge" title="ADR Bridge">
        ADR Bridge <LabelSub>· why the rate moved</LabelSub>
      </SectionLabel>
      <div className="card" style={{ padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--n600)', lineHeight: 1.5, margin: '4px 0 12px' }}>
        Month to date vs last year. <b style={{ color: '#2E7CF7' }}>Mix</b> = selling a different book of business
        · <b style={{ color: AMBER }}>Rate</b> = selling at different prices. They sum exactly to the ADR change.
      </div>
      <Row label="LY ADR" left={0} width={W(model.adrL)} color="#CDD4E0" value={`€${model.adrL.toFixed(0)}`} />
      <Row label="Mix" left={W(mixStart)} width={W(model.mix)} color="#2E7CF7" value={sgn(model.mix)} vColor="#2E7CF7" />
      <Row label="Rate" left={W(rateStart)} width={W(model.rate)} color={AMBER} value={sgn(model.rate)} vColor={AMBER} />
      <Row label="TY ADR" left={0} width={W(model.adrT)} color="#0F2860" value={`€${model.adrT.toFixed(0)}`} />
      <div style={{ fontSize: 11.5, color: '#1C2333', lineHeight: 1.5, marginTop: 10 }}>{sentence}</div>
      <div style={{ display: 'flex', fontSize: 10, color: '#79747E', fontWeight: 600, padding: '2px 0', borderBottom: '1px solid #EDF0F6' }}>
        <div style={{ flex: 1.2 }}>CHANNEL</div><div style={{ flex: 1 }}>SHARE</div><div style={{ flex: 1 }}>ADR</div>
        <div style={{ width: 42, textAlign: 'right', color: '#2E7CF7' }}>MIX</div>
        <div style={{ width: 42, textAlign: 'right', color: AMBER }}>RATE</div>
      </div>
      {model.per.map(p => (
        <div key={p.source} style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: 'var(--n600)', padding: '6px 0', borderBottom: '1px solid #F5F7FA' }}>
          <div style={{ flex: 1.2, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{p.source}</div>
          <div style={{ flex: 1 }}>{Math.round(p.shL * 100)}% → {Math.round(p.shT * 100)}%</div>
          <div style={{ flex: 1 }}>€{Math.round(p.aL)} → €{Math.round(p.aT)}</div>
          <div style={{ width: 42, textAlign: 'right', fontWeight: 800, color: p.mix >= 0 ? GREEN : RED }}>{sgn(p.mix)}</div>
          <div style={{ width: 42, textAlign: 'right', fontWeight: 800, color: p.rate >= 0 ? GREEN : RED }}>{sgn(p.rate)}</div>
        </div>
      ))}
    </div>
    </div>
  );
}

/* ── Top sources (wrapping names, taller rows) ────────────────────────── */

function TopSources({ briefing }: { briefing: Briefing }) {
  const chans = briefing.data.topChannels ?? [];
  if (!chans.length) return null;
  const totalRev = chans[0].pct ? chans[0].rev / chans[0].pct : 1;
  return (
    <ChartCard title="Top Sources" sub="OTB Full Year" icon="sources" info="sources">
      {(() => {
        const COLS = '92px minmax(0,1fr) 54px 50px 66px';
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, alignItems: 'center', padding: '0 0 6px', borderBottom: '1px solid var(--grey-100)' }}>
              <span />
              <span />
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--cap)', textAlign: 'right' }}>OTB</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--cap)', textAlign: 'right' }}>STLY</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--cap)', textAlign: 'right' }}>VS STLY</span>
            </div>
            {chans.map(ch => {
              const w = Math.round(ch.pct * 100);
              const stly = Math.min(100, Math.max(0, (ch.rev_stly / totalRev) * 100));
              const v = ch.var != null ? ch.var * 100 : 0;
              return (
                <div key={ch.name} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, alignItems: 'center', padding: '9px 0' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, overflow: 'hidden' }}>{ch.name}</span>
                  <div style={{ height: 14, background: 'var(--grey-100)', borderRadius: 7, position: 'relative', minWidth: 0 }}>
                    <div style={{ width: `${w}%`, height: '100%', background: 'var(--grad-cyan)', borderRadius: 7 }} />
                    <div style={{ position: 'absolute', left: `calc(${stly}% - 1.5px)`, top: -3, width: 3, height: 20, background: 'var(--navy)', opacity: .55, borderRadius: 1.5 }} />
                  </div>
                  <b style={{ fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{kilo(ch.rev)}</b>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cap)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{kilo(ch.rev_stly)}</span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 0', borderRadius: 7, whiteSpace: 'nowrap',
                      width: 62, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                      background: ch.trend === 'up' ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: ch.trend === 'up' ? 'var(--green)' : 'var(--red)',
                    }}>{ch.trend === 'up' ? '▲' : '▼'} {signedPct(v)}</span>
                  </span>
                </div>
              );
            })}
          </>
        );
      })()}
    </ChartCard>
  );
}

/* ── Pace tab assembly ────────────────────────────────────────────────── */

const PACE_LEGEND: [string, string, boolean?][] = [[NAVY, 'OTB TY'], [GREY, 'STLY'], [GREEN, 'Final LY', true]];

interface NextYearRow {
  month: string; month_num: number; rn: number; rn_stly: number; rev: number; rev_stly: number;
  rn_stly2?: number; rev_stly2?: number;
}

const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** comp: 'this' = vs this year at same stage; 'prev' = vs last completed year
 *  (two-year stage + that year's FINAL, taken from the pace table). */
export function buildNextPace(briefing: Briefing, comp: 'this' | 'prev' = 'this'): PaceMonth[] {
  const rooms = briefing.data.total_rooms || 1;
  const rows = ((briefing.data as unknown as { pace_next_year?: NextYearRow[] }).pace_next_year ?? []);
  const paceByMonth = new Map((briefing.data.pace ?? []).map(p => [p.month_num, p]));
  const curM = new Date().getMonth() + 1;
  return rows.map(r => {
    const thisRow = paceByMonth.get(r.month_num);
    // vs this (unfinished) year: closed months use their ACTUALS (their final),
    // current + future months use the same-booking-stage value
    const cmpRn = comp === 'this'
      ? (r.month_num < curM && thisRow ? thisRow.rn : r.rn_stly)
      : (r.rn_stly2 ?? 0);
    const cmpRev = comp === 'this'
      ? (r.month_num < curM && thisRow ? thisRow.rev : r.rev_stly)
      : (r.rev_stly2 ?? 0);
    const fin = comp === 'prev' ? thisRow : undefined;
    return {
      month: r.month, month_num: r.month_num,
      rn: r.rn, rn_stly: cmpRn, rn_final_ly: fin?.rn_final_ly ?? 0,
      rev: r.rev, rev_stly: cmpRev, rev_final: fin?.rev_final ?? 0,
      adr: r.rn ? r.rev / r.rn : 0,
      adr_stly: cmpRn ? cmpRev / cmpRn : 0,
      adr_final_ly: fin?.adr_final_ly ?? 0,
      occ: r.rn / (rooms * DIM[r.month_num - 1]),
      stly: cmpRn / (rooms * DIM[r.month_num - 1]),
      final: fin?.final ?? 0,
      status: r.rn >= cmpRn ? 'ahead' : 'behind',
    };
  });
}

export function OtbTab({ briefing, year, comp, onWatchRange, watchedRanges }: {
  briefing: Briefing; year: 'this' | 'next'; comp: 'this' | 'prev';
  onWatchRange?: (from: string, to: string) => void;   // heatmap → watchlist
  watchedRanges?: Set<string>;
}) {
  const thisYear = new Date().getFullYear();
  const paceAll = year === 'this' ? (briefing.data.pace ?? []) : buildNextPace(briefing, comp);
  return (
    <>
      <div data-share-root="Pace">
      <SectionLabel icon="pace" info="pace" title="Pace">
        {year === 'this'
          ? 'Pace — OTB vs STLY vs Final LY'
          : 'Pace — ' + String(thisYear + 1) + ' OTB vs ' + String(comp === 'this' ? thisYear : thisYear - 1) + (comp === 'prev' ? ' (same stage & final)' : ' same stage')}
      </SectionLabel>
      {year === 'next' && paceAll.every(m => m.rn === 0) && (
        <div className="card" style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--n600)', marginBottom: 12 }}>
          No {thisYear + 1} bookings on the books yet — the grey STLY bars show where {thisYear} stood at this date last year.
        </div>
      )}
      <ChartCard inner title="Revenue OTB" icon="euro" legend={PACE_LEGEND} info="crev">
        <BarPace months={paceAll} field="rev" fieldStly="rev_stly" fieldFinal="rev_final" fmt={v => kilo(v)} fmtFull={v => euro(v)} />
      </ChartCard>
      <ChartCard inner title="Occupancy" icon="occ" legend={PACE_LEGEND} info="cocc">
        <OccPace months={paceAll} />
      </ChartCard>
      <ChartCard inner title="ADR" icon="adr" legend={PACE_LEGEND} info="cadr">
        <BarPace months={paceAll} field="adr" fieldStly="adr_stly" fieldFinal="adr_final_ly" fmt={v => `€${Math.round(v)}`} fmtFull={v => `€${Math.round(v)}`} />
      </ChartCard>
      </div>

      <div id="sec-cal" style={{ scrollMarginTop: 46 }} />
      <DemandHeat briefing={briefing} onWatch={onWatchRange} watched={watchedRanges} />
      {year === 'this' && <AdrBridge briefing={briefing} />}
      {year === 'this' && <TopSources briefing={briefing} />}
    </>
  );
}
