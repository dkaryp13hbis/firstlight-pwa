/** Pickup section: four tappable window boxes (Instagram-style gradient ring
 *  on the selection) driving the booked-vs-cancelled butterfly — the compute
 *  is a faithful TS port of charts._butterfly, run client-side. */
import { useMemo, useState } from 'react';
import type { Briefing } from '../types';
import { kilo, euro } from '../api';
import { SectionLabel } from './Overview';

type WinKey = 'today' | '1d' | '3d' | '7d';
const LABELS: Record<WinKey, string> = { today: 'today', '1d': 'yesterday', '3d': '3 days', '7d': '7 days' };

interface DailyRow { ref_date: string; stay_year: number; stay_month: number; net_rn: number; }
interface CancelRow { ref_date: string; stay_year: number; stay_month: number; cancel_rn: number; }

const MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function iso(d: Date) { return d.toISOString().slice(0, 10); }

function computeButterfly(pd: DailyRow[], cd: CancelRow[]) {
  if (!pd.length) return null;
  const end = pd.reduce((m, r) => (r.ref_date > m ? r.ref_date : m), pd[0].ref_date);
  const endD = new Date(end + 'T00:00:00Z');
  const shift = (days: number) => iso(new Date(endD.getTime() - days * 86400000));
  const WINDOWS: Record<WinKey, [string, string]> = {
    today: [end, end], '1d': [shift(1), shift(1)], '3d': [shift(2), end], '7d': [shift(6), end],
  };
  const fmtD = (s: string) => {
    const d = new Date(s + 'T00:00:00Z');
    return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH_ABBR[d.getUTCMonth() + 1]}`;
  };
  const ranges = Object.fromEntries(Object.entries(WINDOWS).map(([k, [lo, hi]]) =>
    [k, lo === hi ? fmtD(lo) : `${fmtD(lo)} – ${fmtD(hi)}`])) as Record<WinKey, string>;

  const keys = [...new Set(pd.map(r => r.stay_year * 100 + r.stay_month))].sort();
  const now = new Date();
  const curKey = now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);

  const sums = (y: number, m: number, lo: string, hi: string) => {
    const n = pd.filter(r => r.stay_year === y && r.stay_month === m && r.ref_date >= lo && r.ref_date <= hi)
      .reduce((s, r) => s + r.net_rn, 0);
    const c = cd.filter(r => r.stay_year === y && r.stay_month === m && r.ref_date >= lo && r.ref_date <= hi)
      .reduce((s, r) => s + r.cancel_rn, 0);
    return { n, c, b: Math.max(n + c, 0) };
  };

  const months: { m: string; w: Record<WinKey, { n: number; c: number; b: number }> }[] = [];
  const past = { m: 'Earlier', w: { today: { n: 0, c: 0, b: 0 }, '1d': { n: 0, c: 0, b: 0 }, '3d': { n: 0, c: 0, b: 0 }, '7d': { n: 0, c: 0, b: 0 } } as Record<WinKey, { n: number; c: number; b: number }> };
  let pastAny = false;
  for (const key of keys) {
    const y = Math.floor(key / 100), m = key % 100;
    const w = Object.fromEntries(Object.entries(WINDOWS).map(([k, [lo, hi]]) =>
      [k, sums(y, m, lo, hi)])) as Record<WinKey, { n: number; c: number; b: number }>;
    if (key < curKey) {
      (Object.keys(w) as WinKey[]).forEach(k => { past.w[k].n += w[k].n; past.w[k].c += w[k].c; });
      pastAny = pastAny || Object.values(w).some(v => v.n || v.c);
      continue;
    }
    months.push({ m: MONTH_ABBR[m], w });
  }
  const named = months.slice(0, 5);
  if (pastAny) {
    (Object.keys(past.w) as WinKey[]).forEach(k => { past.w[k].b = Math.max(past.w[k].n + past.w[k].c, 0); });
    named.push(past);
  }
  return named.length ? { months: named, ranges } : null;
}

const ringStyle: React.CSSProperties = {
  border: '1.5px solid transparent',
  background:
    'linear-gradient(var(--card-bg), var(--card-bg)) padding-box,' +
    'linear-gradient(120deg, #0F2860, #2E7CF7, #38E1F0, #2E7CF7, #0F2860) border-box',
  backgroundSize: 'auto, 300% 300%',
  animation: 'pwring 3.5s ease-in-out infinite',
};

export function PickupSection({ briefing }: { briefing: Briefing }) {
  const [win, setWin] = useState<WinKey>('7d');
  const d = briefing.data;
  const pu = d.pickup;
  const fly = useMemo(() => computeButterfly(
    (d as unknown as { pickup_daily?: DailyRow[] }).pickup_daily ?? [],
    (d as unknown as { cancel_daily?: CancelRow[] }).cancel_daily ?? [],
  ), [d]);

  const boxes: { key: WinKey; title: string; tCol: string; sub?: string;
    bRn: number; bRev: number; cRn: number; cRev: number }[] = [
    { key: 'today', title: 'Today', tCol: 'var(--green)', bRn: pu.today.roomNights, bRev: pu.today.revenue, cRn: pu.cancellationsToday, cRev: pu.cancellationRevenueToday },
    { key: '1d', title: 'Yesterday', tCol: 'var(--blue)', sub: pu.date1d, bRn: pu.last1d.roomNights, bRev: pu.last1d.revenue, cRn: pu.cancellations1d, cRev: pu.cancellationRevenue },
    { key: '3d', title: '3-Day', tCol: 'var(--blue)', sub: pu.date3d, bRn: pu.last3d.roomNights, bRev: pu.last3d.revenue, cRn: pu.cancellations3d, cRev: pu.cancellationRevenue3d },
    { key: '7d', title: '7-Day', tCol: 'var(--blue)', sub: pu.date7d, bRn: pu.last7d.roomNights, bRev: pu.last7d.revenue, cRn: pu.cancellations7d, cRev: pu.cancellationRevenue7d },
  ];
  const puLbl: React.CSSProperties = { fontSize: 10, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '.05em' };

  const mx = fly ? Math.max(1, ...fly.months.map(mo => Math.max(mo.w[win].b, mo.w[win].c))) * 1.08 : 1;

  return (
    <>
      <style>{`@keyframes pwring{0%{background-position:0 0,0% 50%}50%{background-position:0 0,100% 50%}100%{background-position:0 0,0% 50%}}`}</style>
      <SectionLabel>Pickup Activity</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {boxes.map(b => (
          <div key={b.key} className="card" onClick={() => setWin(b.key)}
            style={{ padding: 12, cursor: 'pointer', ...(win === b.key ? ringStyle : { border: '1.5px solid transparent' }) }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: b.tCol, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              {b.title}{b.sub ? <span style={{ color: 'var(--cap)', marginLeft: 4 }}>{b.sub}</span> : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={puLbl}>Booked</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>+{b.bRn} rn · {kilo(b.bRev)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={puLbl}>Cancel</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>-{b.cRn} rn · -{kilo(b.cRev)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px solid var(--grey-100)' }}>
              <span style={{ ...puLbl, fontWeight: 700, color: 'var(--n600)' }}>Net</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{b.bRn - b.cRn} rn · {kilo(b.bRev - b.cRev)}</span>
            </div>
          </div>
        ))}
      </div>

      {fly && (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Booked vs cancelled <span style={{ fontWeight: 600, color: 'var(--n600)' }}>· {fly.ranges[win]}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, fontWeight: 600, color: 'var(--n600)', margin: '6px 0 8px' }}>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#0F2860', marginRight: 5 }} />booked · {LABELS[win]}</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#B83A1B', marginRight: 5 }} />cancelled · {LABELS[win]}</span>
          </div>
          {fly.months.map(mo => {
            const v = mo.w[win];
            const warn = v.b > 0 && v.c > 0.6 * v.b;
            return (
              <div key={mo.m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 42, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{mo.m}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: `${(v.c / mx) * 100}%`, background: '#B83A1B', height: 13, borderRadius: '7px 0 0 7px', transition: 'width .25s' }} />
                  </div>
                  <div style={{ width: 2, height: 19, background: '#E2E7F0' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: `${(v.b / mx) * 100}%`, background: '#0F2860', height: 13, borderRadius: '0 7px 7px 0', transition: 'width .25s' }} />
                  </div>
                </div>
                <div style={{ width: 58, textAlign: 'right' }}>
                  <span className="t-value" style={{ fontSize: 13, color: v.n < 0 || warn ? 'var(--coral)' : 'var(--green)' }}>
                    {v.n >= 0 ? '+' : ''}{v.n}
                  </span>
                  <span style={{ fontSize: 9.5, color: 'var(--cap)', fontWeight: 400, marginLeft: 3 }}> net</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--n600)', fontWeight: 600 }}>
        Cancelled revenue · 7 days: <b style={{ fontWeight: 800, color: 'var(--coral)' }}>−{euro(pu.cancellationRevenue7d)}</b>
      </div>
    </>
  );
}
