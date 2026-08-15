/** OTB tab visuals — faithful ports of briefing/charts.py + the pace SVG
 *  charts, computed client-side from raw briefing data. */
import { useMemo } from 'react';
import type { Briefing, PaceMonth } from '../types';
import { euro, kilo, pct, signedPct } from '../api';
import { SectionLabel } from './Overview';

const AX = { fontSize: 11, fontWeight: 700, fill: '#4D5A74' } as const;

/* ── Pace charts: revenue / ADR grouped bars + occupancy lines ─────────── */

function BarPace({ months, field, fieldStly, fieldFinal, fmt }: {
  months: PaceMonth[]; field: 'rev' | 'adr'; fieldStly: 'rev_stly' | 'adr_stly';
  fieldFinal: 'rev_final' | 'adr_final_ly'; fmt: (v: number) => string;
}) {
  const W = 560, H = 192, bot = 145, ch = 131;
  const n = months.length, step = 440 / n, bw = n > 6 ? 12 : 13;
  const mx = Math.max(1, ...months.map(m => Math.max(m[field] as number, m[fieldStly] as number, (m[fieldFinal] as number) || 0))) * 1.1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {months.map((m, i) => {
        const x = 70 + i * step + step / 2;
        const vTy = (m[field] as number) / mx * ch;
        const vLy = (m[fieldStly] as number) / mx * ch;
        const vsPct = (m[fieldStly] as number) ? (((m[field] as number) - (m[fieldStly] as number)) / (m[fieldStly] as number)) * 100 : 0;
        return (
          <g key={m.month}>
            <rect x={x - bw - 1} y={bot - vTy} width={bw} height={vTy} rx={1.5}
              fill={(m[field] as number) >= ((m[fieldFinal] as number) || Infinity) ? '#1A7A50' : '#0F2860'} />
            <rect x={x + 1} y={bot - vLy} width={bw} height={vLy} rx={1.5} fill="#CDD4E0" />
            {(m[fieldFinal] as number) > 0 && (
              <line x1={x - bw - 3} y1={bot - (m[fieldFinal] as number) / mx * ch}
                x2={x + bw + 3} y2={bot - (m[fieldFinal] as number) / mx * ch}
                stroke="#1A7A50" strokeWidth={1.5} strokeDasharray="3,2.5" />
            )}
            <text x={x} y={bot + 18} textAnchor="middle" {...AX}>{m.month}</text>
            <text x={x} y={bot - vTy - 6} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 800, fill: '#1A2540' }}>
              {fmt(m[field] as number)}
            </text>
            <rect x={x - 18} y={167} width={36} height={13} rx={3}
              fill={vsPct >= 0 ? 'rgba(26,122,80,0.10)' : 'rgba(184,58,27,0.10)'} />
            <text x={x} y={177} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: vsPct >= 0 ? '#1A7A50' : '#B83A1B' }}>
              {vsPct >= 0 ? '+' : ''}{Math.round(vsPct)}%
            </text>
          </g>
        );
      })}
      <line x1={40} y1={bot} x2={W - 20} y2={bot} stroke="#E2E7F0" strokeWidth={1.5} />
    </svg>
  );
}

function OccPace({ months }: { months: PaceMonth[] }) {
  const W = 560, H = 192, bot = 145, ch = 131;
  const n = months.length, step = 440 / n;
  const curM = new Date().getMonth() + 1;
  const x = (i: number) => 70 + i * step + step / 2;
  const y = (v: number) => bot - Math.min(v, 1.05) * ch;
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const occPts: [number, number][] = months.map((m, i) => [x(i), y(m.occ)]);
  const stlyPts: [number, number][] = months.map((m, i) => [x(i), y(m.stly)]);
  const finPts: [number, number][] = months.filter(m => m.month_num >= curM).map(m => [x(months.indexOf(m)), y(m.final)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <path d={path(stlyPts)} fill="none" stroke="#C9D2E3" strokeWidth={2.5} />
      {finPts.length > 1 && <path d={path(finPts)} fill="none" stroke="#1A7A50" strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round" />}
      <path d={path(occPts)} fill="none" stroke="#2E7CF7" strokeWidth={3} />
      {months.map((m, i) => (
        <g key={m.month}>
          <circle cx={x(i)} cy={y(m.occ)} r={4} fill="#2E7CF7" />
          <rect x={x(i) - 16} y={y(m.occ) - 20} width={32} height={14} rx={3} fill="white" />
          <text x={x(i)} y={y(m.occ) - 9} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 800, fill: '#1A2540' }}>
            {Math.round(m.occ * 100)}%
          </text>
          <text x={x(i)} y={bot + 18} textAnchor="middle" {...AX}>{m.month}</text>
        </g>
      ))}
      <line x1={40} y1={bot} x2={W - 20} y2={bot} stroke="#E2E7F0" strokeWidth={1.5} />
    </svg>
  );
}

const Legend = ({ items }: { items: [string, string, boolean?][] }) => (
  <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 600, color: 'var(--n600)', marginBottom: 4 }}>
    {items.map(([c, l, dash]) => (
      <span key={l}>
        <span style={{
          display: 'inline-block', width: 9, height: dash ? 2 : 9, borderRadius: 3,
          background: dash ? 'transparent' : c, borderTop: dash ? `2px dashed ${c}` : 'none',
          marginRight: 5, verticalAlign: 'middle',
        }} />{l}
      </span>
    ))}
  </div>
);

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '16px 16px 12px', marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/* ── Curve position meter (rn vs STLY vs Final LY, green overflow) ─────── */

function CurveMeter({ months }: { months: PaceMonth[] }) {
  return (
    <ChartCard title="Curve position — room nights vs last year">
      {months.map(m => {
        const maxRef = Math.max(m.rn, m.rn_final_ly, m.rn_stly, 1) * 1.05;
        const w = (v: number) => `${Math.min(v / maxRef, 1) * 100}%`;
        const over = m.rn > m.rn_final_ly && m.rn_final_ly > 0;
        const behind = m.rn < m.rn_stly;
        return (
          <div key={m.month} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: 'var(--n600)', marginBottom: 4 }}>
              <span>{m.month}</span>
              <span><b style={{ fontWeight: 800, color: '#1D1B20' }}>{m.rn.toLocaleString()}</b> rn
                · STLY {m.rn_stly.toLocaleString()} · Final LY {m.rn_final_ly.toLocaleString()}</span>
            </div>
            <div style={{ position: 'relative', height: 14, background: '#EDF0F6', borderRadius: 7 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: w(m.rn),
                background: over ? 'var(--green)' : behind ? '#B83A1B' : 'linear-gradient(90deg,#2E7CF7,#38E1F0)',
                borderRadius: 7,
              }} />
              <div style={{ position: 'absolute', left: w(m.rn_stly), top: -2, bottom: -2, width: 2, background: '#9AA4B8' }} />
              <div style={{ position: 'absolute', left: w(m.rn_final_ly), top: -3, bottom: -3, width: 2.5, background: '#0F2860' }} />
            </div>
          </div>
        );
      })}
      <Legend items={[['#2E7CF7', 'on the books'], ['#9AA4B8', 'STLY'], ['#0F2860', 'final LY'], ['#1A7A50', 'past final LY']]} />
    </ChartCard>
  );
}

/* ── Booking speed (7d / 14d rn per day + needed pace) ─────────────────── */

interface DailyRow { ref_date: string; stay_year: number; stay_month: number; net_rn: number; }

function BookingSpeed({ months, daily }: { months: PaceMonth[]; daily: DailyRow[] }) {
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
      return {
        month: m.month, s7: rn(c7) / 7, s14: rn(c14) / 14,
        needed: remaining > 0 ? remaining / daysLeft : 0, passed: remaining <= 0,
      };
    });
  }, [months, daily]);
  if (!rows.length) return null;
  const mx = Math.max(1, ...rows.flatMap(r => [r.s7, r.s14, r.needed])) * 1.1;
  return (
    <ChartCard title="Booking speed — rooms per day">
      {rows.map(r => (
        <div key={r.month} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: 'var(--n600)', marginBottom: 4 }}>
            <span>{r.month}</span>
            <span>{r.passed
              ? <b style={{ color: 'var(--green)', fontWeight: 800 }}>✓ past LY final</b>
              : <>need <b style={{ fontWeight: 800, color: '#1D1B20' }}>{r.needed.toFixed(1)}</b>/day for LY final</>}</span>
          </div>
          {[['7d', r.s7, '#2E7CF7'], ['14d', r.s14, '#7FB0FA']].map(([l, v, c]) => (
            <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span className="t-cap" style={{ width: 24 }}>{l as string}</span>
              <div style={{ flex: 1, height: 10, background: '#EDF0F6', borderRadius: 5, position: 'relative' }}>
                <div style={{ width: `${Math.min((v as number) / mx, 1) * 100}%`, height: '100%', background: c as string, borderRadius: 5 }} />
                {!r.passed && <div style={{ position: 'absolute', left: `${Math.min(r.needed / mx, 1) * 100}%`, top: -2, bottom: -2, width: 2, background: '#0F2860' }} />}
              </div>
              <b style={{ fontSize: 11.5, fontWeight: 800, width: 34, textAlign: 'right' }}>{(v as number).toFixed(1)}</b>
            </div>
          ))}
        </div>
      ))}
    </ChartCard>
  );
}

/* ── Demand calendar (60 days, 8b thresholds, blue ramp) ───────────────── */

const RAMP = ['#F2F2F7', '#E1EBFB', '#C4DAF9', '#9FC4F6', '#6FA7F2', '#3D87EE', '#0A6CDF'];
const bucket = (occ: number) => { for (let i = 0; i < 6; i++) if (occ < [0.20, 0.35, 0.50, 0.65, 0.78, 0.88][i]) return i; return 6; };

function DemandHeat({ briefing }: { briefing: Briefing }) {
  const rooms = briefing.data.total_rooms;
  const otb = ((briefing.data as unknown as { otb_by_date?: { stay_date: string; rn_ty: number; rn_stly: number }[] }).otb_by_date ?? []).slice(0, 60);
  if (!otb.length || !rooms) return null;
  const cells: ({ empty: true } | { empty: false; d: Date; occ: number; ring: boolean; newMonth: boolean })[] = [];
  const first = new Date(otb[0].stay_date + 'T00:00:00Z');
  for (let i = 0; i < (first.getUTCDay() + 6) % 7; i++) cells.push({ empty: true });
  let prevMonth = first.getUTCMonth();
  for (const r of otb) {
    const d = new Date(r.stay_date + 'T00:00:00Z');
    const occ = (r.rn_ty || 0) / rooms;
    const occLy = (r.rn_stly || 0) / rooms;
    cells.push({
      empty: false, d, occ,
      ring: occLy >= 0.30 && occ < 0.5 * occLy,
      newMonth: d.getUTCMonth() !== prevMonth,
    });
    prevMonth = d.getUTCMonth();
  }
  return (
    <ChartCard title="Demand calendar — next 60 days">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(w => (
          <div key={w} className="t-cap" style={{ textAlign: 'center' }}>{w}</div>
        ))}
        {cells.map((c, i) => c.empty ? <div key={i} /> : (
          <div key={i} style={{
            borderRadius: 7, padding: '6px 0 5px', textAlign: 'center',
            background: RAMP[bucket(c.occ)],
            color: bucket(c.occ) >= 4 ? '#fff' : '#1D1B20',
            boxShadow: [
              c.newMonth ? 'inset 2px 0 0 #1D1B20' : '',
              c.ring ? '0 0 0 2px #BA1A1A' : '',
            ].filter(Boolean).join(', ') || undefined,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{Math.round(c.occ * 100)}</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .75 }}>
              {String(c.d.getUTCDate()).padStart(2, '0')}/{String(c.d.getUTCMonth() + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── ADR bridge (mix / rate decomposition, identity-guarded) ───────────── */

interface ConsumedRow { period: 'TY' | 'LY'; source: string; rn: number; rev: number; }

function AdrBridge({ briefing }: { briefing: Briefing }) {
  const rows = (briefing.data as unknown as { consumed_by_source?: ConsumedRow[] }).consumed_by_source ?? [];
  const model = useMemo(() => {
    const ty = rows.filter(r => r.period === 'TY'), ly = rows.filter(r => r.period === 'LY');
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
        source: s,
        mix: (shT - shL) * (aL - adrL),
        rate: shT * ((t && t.rn ? aT : aL) - aL),
      };
    });
    const mix = per.reduce((s, p) => s + p.mix, 0);
    const rate = per.reduce((s, p) => s + p.rate, 0);
    const delta = adrT - adrL;
    if (Math.abs(mix + rate - delta) > 0.05) return null; // identity guard
    return { adrT, adrL, delta, mix, rate, per: per.sort((a, b) => Math.abs(b.mix + b.rate) - Math.abs(a.mix + a.rate)).slice(0, 5) };
  }, [rows]);
  if (!model) return null;
  const sgn = (v: number) => `${v >= 0 ? '+' : '−'}€${Math.abs(v).toFixed(0)}`;
  return (
    <ChartCard title="ADR bridge — month to date vs last year">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span className="t-value" style={{ fontSize: 20 }}>€{model.adrT.toFixed(0)}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--n600)' }}>vs €{model.adrL.toFixed(0)} LY</span>
        <span className="t-delta" style={{ color: model.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>{sgn(model.delta)}</span>
      </div>
      {[['Mix effect', model.mix, '#2E7CF7'], ['Rate effect', model.rate, '#C77E00']].map(([l, v, c]) => (
        <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 78, fontSize: 11.5, fontWeight: 700, color: 'var(--n600)' }}>{l as string}</span>
          <div style={{ flex: 1, height: 12, position: 'relative', background: '#EDF0F6', borderRadius: 6 }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: (v as number) >= 0 ? '50%' : `${50 - Math.min(Math.abs(v as number) / Math.max(Math.abs(model.mix), Math.abs(model.rate), 1), 1) * 45}%`,
              width: `${Math.min(Math.abs(v as number) / Math.max(Math.abs(model.mix), Math.abs(model.rate), 1), 1) * 45}%`,
              background: c as string, borderRadius: 6,
            }} />
            <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1.5, background: '#C9D2E3' }} />
          </div>
          <b style={{ fontSize: 12, fontWeight: 800, width: 48, textAlign: 'right', color: (v as number) >= 0 ? 'var(--green)' : 'var(--red)' }}>{sgn(v as number)}</b>
        </div>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid #EDF0F6', paddingTop: 8 }}>
        {model.per.map(p => (
          <div key={p.source} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: 'var(--n600)', padding: '3px 0' }}>
            <span>{p.source}</span>
            <span>mix <b style={{ fontWeight: 800, color: p.mix >= 0 ? 'var(--green)' : 'var(--red)' }}>{sgn(p.mix)}</b>
              &ensp;rate <b style={{ fontWeight: 800, color: p.rate >= 0 ? 'var(--green)' : 'var(--red)' }}>{sgn(p.rate)}</b></span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── Top sources ───────────────────────────────────────────────────────── */

function TopSources({ briefing }: { briefing: Briefing }) {
  const chans = briefing.data.topChannels ?? [];
  if (!chans.length) return null;
  const totalRev = chans[0].pct ? chans[0].rev / chans[0].pct : 1;
  return (
    <ChartCard title="Top Sources — OTB Full Year">
      {chans.map(ch => {
        const w = Math.round(ch.pct * 100);
        const stly = Math.min(100, Math.max(0, (ch.rev_stly / totalRev) * 100));
        const v = ch.var != null ? ch.var * 100 : 0;
        return (
          <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
            <span style={{ width: 88, fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--grey-100)', borderRadius: 4, position: 'relative' }}>
              <div style={{ width: `${w}%`, height: '100%', background: 'var(--grad-cyan)', borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: `${stly}%`, top: -3, width: 2, height: 14, background: 'var(--blue)', opacity: .5, borderRadius: 1 }} />
            </div>
            <b style={{ fontSize: 11.5, fontWeight: 800, width: 52, textAlign: 'right' }}>{kilo(ch.rev)}</b>
            <span className="t-cap" style={{ width: 48, textAlign: 'right' }}>{kilo(ch.rev_stly)}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 7,
              background: ch.trend === 'up' ? 'var(--green-bg)' : 'var(--red-bg)',
              color: ch.trend === 'up' ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap',
            }}>{ch.trend === 'up' ? '▲' : '▼'} {signedPct(v)}</span>
          </div>
        );
      })}
    </ChartCard>
  );
}

/* ── OTB tab assembly ──────────────────────────────────────────────────── */

export function OtbTab({ briefing }: { briefing: Briefing }) {
  const pace = briefing.data.pace ?? [];
  const daily = ((briefing.data as unknown as { pickup_daily?: DailyRow[] }).pickup_daily ?? []);
  const curM = new Date().getMonth() + 1;
  const fwd = pace.filter(m => m.month_num >= curM).slice(0, 3);
  return (
    <>
      <SectionLabel>Pace — OTB vs STLY vs Final LY</SectionLabel>
      <ChartCard title="Revenue by month">
        <Legend items={[['#2E7CF7', 'on the books'], ['#C9D2E3', 'STLY'], ['#1A7A50', 'final LY', true]]} />
        <BarPace months={pace} field="rev" fieldStly="rev_stly" fieldFinal="rev_final" fmt={v => kilo(v)} />
      </ChartCard>
      <ChartCard title="ADR by month">
        <Legend items={[['#2E7CF7', 'on the books'], ['#C9D2E3', 'STLY'], ['#1A7A50', 'final LY', true]]} />
        <BarPace months={pace} field="adr" fieldStly="adr_stly" fieldFinal="adr_final_ly" fmt={v => `€${Math.round(v)}`} />
      </ChartCard>
      <ChartCard title="Occupancy by month">
        <Legend items={[['#2E7CF7', 'on the books'], ['#C9D2E3', 'STLY'], ['#1A7A50', 'final LY', true]]} />
        <OccPace months={pace} />
      </ChartCard>
      <CurveMeter months={fwd} />
      <BookingSpeed months={fwd} daily={daily} />
      <DemandHeat briefing={briefing} />
      <AdrBridge briefing={briefing} />
      <TopSources briefing={briefing} />
    </>
  );
}

export { euro, pct };
