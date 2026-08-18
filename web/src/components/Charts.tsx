/** Pace tab visuals — parity spec 2026-08-15. Legacy chart conventions:
 *  y-axis ticks + gridlines, right-aligned square-swatch legends
 *  (OTB TY / STLY / Final LY), no per-bar labels, navy series, occupancy
 *  area fill, taller plots. Plus: Where each month stands, booking speed
 *  with trend words, demand heat with behind-LY note, ADR bridge table. */
import { useMemo } from 'react';
import type { Briefing, PaceMonth } from '../types';
import { kilo, signedPct } from '../api';
import { SectionLabel } from './Overview';
import { InfoButton } from './Info';

const NAVY = '#0F2860', GREY = '#CDD4E0', GREEN = '#1A7A50', RED = '#B83A1B', AMBER = '#B47D09';

function ChartCard({ title, info, legend, children }: {
  title: string; info?: string; legend?: [string, string, boolean?][]; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
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

function BarPace({ months, field, fieldStly, fieldFinal, fmt }: {
  months: PaceMonth[]; field: 'rev' | 'adr'; fieldStly: 'rev_stly' | 'adr_stly';
  fieldFinal: 'rev_final' | 'adr_final_ly'; fmt: (v: number) => string;
}) {
  const n = months.length, step = (W - 82) / n, bw = n > 6 ? 13 : 15;
  const curM = new Date().getMonth() + 1;
  const mx = Math.max(1, ...months.map(m => Math.max(m[field] as number, m[fieldStly] as number, (m[fieldFinal] as number) || 0))) * 1.08;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <Grid mx={mx} fmt={fmt} />
      {months.map((m, i) => {
        const x = 62 + i * step + step / 2;
        const vTy = (m[field] as number) / mx * CH;
        const vLy = (m[fieldStly] as number) / mx * CH;
        const vs = (m[fieldStly] as number) ? (((m[field] as number) - (m[fieldStly] as number)) / (m[fieldStly] as number)) * 100 : 0;
        return (
          <g key={m.month}>
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
    </svg>
  );
}

function OccPace({ months }: { months: PaceMonth[] }) {
  const n = months.length, step = (W - 82) / n;
  const curM = new Date().getMonth() + 1;
  const x = (i: number) => 62 + i * step + step / 2;
  const y = (v: number) => BOT - Math.min(v, 1.05) * CH;
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
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

/* ── Where each month stands (canon fl meter) ─────────────────────────── */

function MonthStands({ months }: { months: PaceMonth[] }) {
  return (
    <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Where each month stands</span>
        <InfoButton k="meter" />
      </div>
      <div style={{ fontSize: 11, color: 'var(--n600)', lineHeight: 1.5, marginBottom: 14 }}>
        Track = last year's final month · bar = booked now · tick = LY same date.
        Green spill past the end = above LY final · red bar = behind LY pace. All numbers are room nights.
      </div>
      {months.map(m => {
        const scaleMax = Math.max(m.rn_final_ly, m.rn, 1) * 1.02;
        const w = (v: number) => `${Math.min(v / scaleMax, 1) * 100}%`;
        const behind = m.rn < m.rn_stly;
        const beat = m.rn_final_ly > 0 && m.rn > m.rn_final_ly;
        const vsPace = m.rn - m.rn_stly;
        const vsFinal = m.rn - m.rn_final_ly;
        return (
          <div key={m.month} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>{m.month}</div>
              <div style={{ position: 'relative', height: 14 }}>
                <div style={{ position: 'absolute', inset: 0, width: w(m.rn_final_ly), background: '#EDF0F6', borderRadius: 7 }} />
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: w(Math.min(m.rn, m.rn_final_ly || m.rn)),
                  background: behind ? RED : NAVY, borderRadius: 7,
                }} />
                {beat && (
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: w(m.rn_final_ly),
                    width: `calc(${w(m.rn)} - ${w(m.rn_final_ly)})`, background: GREEN, borderRadius: '0 7px 7px 0',
                  }} />
                )}
                <div style={{ position: 'absolute', left: w(m.rn_stly), top: -3, bottom: -3, width: 2, background: '#9AA4B8' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: 'var(--n600)', fontWeight: 600, marginTop: 6, flexWrap: 'wrap' }}>
                <span>booked: <b style={{ fontWeight: 800, color: 'var(--text)' }}>{m.rn.toLocaleString()} rn</b></span>
                <span>▲ LY same date: {m.rn_stly.toLocaleString()}</span>
                <span>LY final: {m.rn_final_ly.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ width: 108, textAlign: 'right', paddingTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: vsPace >= 0 ? GREEN : RED }}>
                {vsPace >= 0 ? '+' : ''}{vsPace.toLocaleString()} rn
              </div>
              <div style={{ fontSize: 10, color: 'var(--n600)', fontWeight: 600 }}>vs LY pace</div>
              <div style={{ fontSize: 10, marginTop: 4, fontWeight: beat ? 700 : 600, color: beat ? GREEN : 'var(--n600)', lineHeight: 1.3 }}>
                {m.rn_final_ly > 0
                  ? (beat ? `+${vsFinal.toLocaleString()} rn above LY final` : `${(-vsFinal).toLocaleString()} rn to LY final`)
                  : 'no LY final'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Booking speed (legend, trend word, needed marker, passed detail) ── */

interface DailyRow { ref_date: string; stay_year: number; stay_month: number; net_rn: number; }

export function BookingSpeed({ months, daily }: { months: PaceMonth[]; daily: DailyRow[] }) {
  const rows = useMemo(() => {
    if (!daily.length) return [];
    const end = daily.reduce((m, r) => (r.ref_date > m ? r.ref_date : m), daily[0].ref_date);
    const endD = new Date(end + 'T00:00:00Z');
    const cut = (days: number) => new Date(endD.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const c7 = cut(7), c14 = cut(14);
    const year = endD.getUTCFullYear();
    return months.map(m => {
      const rn = (lo: string) => daily
        .filter(r => r.stay_month === m.month_num && r.stay_year >= year && r.ref_date >= lo && r.ref_date <= end)
        .reduce((s, r) => s + r.net_rn, 0);
      const monthEnd = new Date(Date.UTC(year, m.month_num, 0));
      const daysLeft = Math.max(1, Math.round((monthEnd.getTime() - endD.getTime()) / 86400000));
      const remaining = m.rn_final_ly - m.rn;
      const s7 = rn(c7) / 7, s14 = rn(c14) / 14;
      const trend = s7 < s14 * 0.85 ? 'slowing down' : s7 > s14 * 1.15 ? 'speeding up' : 'steady';
      return {
        month: m.month, s7, s14, trend, hasRef: m.rn_final_ly > 0,
        needed: remaining > 0 ? remaining / daysLeft : 0,
        passed: m.rn_final_ly > 0 && remaining <= 0, over: -remaining,
      };
    });
  }, [months, daily]);
  if (!rows.length) return null;
  const mx = Math.max(1, ...rows.flatMap(r => [r.s7, r.s14, r.needed])) * 1.1;
  return (
    <ChartCard title="Booking speed — rooms per day" info="vel"
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

function DemandHeat({ briefing }: { briefing: Briefing }) {
  const rooms = briefing.data.total_rooms;
  const otb = ((briefing.data as unknown as { otb_by_date?: { stay_date: string; rn_ty: number; rn_stly: number }[] }).otb_by_date ?? []).slice(0, 60);
  if (!otb.length || !rooms) return null;
  const cells: ({ empty: true } | { empty: false; d: Date; occ: number; ring: boolean; newMonth: boolean })[] = [];
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
    cells.push({ empty: false, d, occ, ring, newMonth: d.getUTCMonth() !== prevMonth });
    prevMonth = d.getUTCMonth();
  }
  return (
    <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Demand heat — next 60 days</span>
        <InfoButton k="heat" />
      </div>
      <div style={{ fontSize: 11, color: 'var(--n600)', lineHeight: 1.5, margin: '4px 0 12px' }}>
        Occupancy on the books per stay date — darker = fuller. A red outline marks a date far behind last year.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--cap)' }}>{w}</div>
        ))}
        {cells.map((c, i) => c.empty ? <div key={i} /> : (
          <div key={i} style={{
            borderRadius: 7, padding: '7px 0 6px', textAlign: 'center',
            background: RAMP[bucket(c.occ)],
            color: bucket(c.occ) >= 4 ? '#fff' : '#1D1B20',
            boxShadow: c.ring ? 'inset 0 0 0 2px #BA1A1A' : c.newMonth ? 'inset 2px 0 0 #1D1B20' : undefined,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{Math.round(c.occ * 100)}%</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .75 }}>
              {String(c.d.getUTCDate()).padStart(2, '0')}/{String(c.d.getUTCMonth() + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
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
    <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>ADR bridge — why the rate moved</span>
        <InfoButton k="bridge" />
      </div>
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
  );
}

/* ── Top sources (wrapping names, taller rows) ────────────────────────── */

function TopSources({ briefing }: { briefing: Briefing }) {
  const chans = briefing.data.topChannels ?? [];
  if (!chans.length) return null;
  const totalRev = chans[0].pct ? chans[0].rev / chans[0].pct : 1;
  return (
    <ChartCard title="Top Sources — OTB Full Year" info="sources">
      {chans.map(ch => {
        const w = Math.round(ch.pct * 100);
        const stly = Math.min(100, Math.max(0, (ch.rev_stly / totalRev) * 100));
        const v = ch.var != null ? ch.var * 100 : 0;
        return (
          <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <span style={{ flex: '0 0 92px', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>{ch.name}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--grey-100)', borderRadius: 4, position: 'relative' }}>
              <div style={{ width: `${w}%`, height: '100%', background: 'var(--grad-cyan)', borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: `${stly}%`, top: -3, width: 2, height: 12, background: 'var(--blue)', opacity: .5, borderRadius: 1 }} />
            </div>
            <b style={{ fontSize: 11.5, fontWeight: 800, width: 52, textAlign: 'right', color: 'var(--text)' }}>{kilo(ch.rev)}</b>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cap)', width: 48, textAlign: 'right' }}>{kilo(ch.rev_stly)}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 7, whiteSpace: 'nowrap',
              background: ch.trend === 'up' ? 'var(--green-bg)' : 'var(--red-bg)',
              color: ch.trend === 'up' ? 'var(--green)' : 'var(--red)',
            }}>{ch.trend === 'up' ? '▲' : '▼'} {signedPct(v)}</span>
          </div>
        );
      })}
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

export function OtbTab({ briefing, year, comp }: { briefing: Briefing; year: 'this' | 'next'; comp: 'this' | 'prev' }) {
  const thisYear = new Date().getFullYear();
  const paceAll = year === 'this' ? (briefing.data.pace ?? []) : buildNextPace(briefing, comp);
  const curM = new Date().getMonth() + 1;
  const fwd = (briefing.data.pace ?? []).filter(m => m.month_num >= curM).slice(0, 4);
  return (
    <>
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
      <ChartCard title="Revenue OTB" legend={PACE_LEGEND} info="crev">
        <BarPace months={paceAll} field="rev" fieldStly="rev_stly" fieldFinal="rev_final" fmt={v => kilo(v)} />
      </ChartCard>
      <ChartCard title="Occupancy" legend={PACE_LEGEND} info="cocc">
        <OccPace months={paceAll} />
      </ChartCard>
      <ChartCard title="ADR" legend={PACE_LEGEND} info="cadr">
        <BarPace months={paceAll} field="adr" fieldStly="adr_stly" fieldFinal="adr_final_ly" fmt={v => `€${Math.round(v)}`} />
      </ChartCard>
      {year === 'this' && <MonthStands months={fwd.slice(0, 3)} />}
      <DemandHeat briefing={briefing} />
      {year === 'this' && <AdrBridge briefing={briefing} />}
      {year === 'this' && <TopSources briefing={briefing} />}
    </>
  );
}
