/** Portfolio view (admin preview, fictional data) — one more entry in the
 *  hotel picker, same chrome and sections as the hotel view. Spec frozen
 *  2026-09-10 (backend ENGINEERING_LOG): Yesterday cards + ONE by-hotel table
 *  (Yesterday / MTD / YTD), pickup boxes as slicer + by-hotel rows, Pace with
 *  a KPI switch + 3-column year table (tap a row → chart it), Calendar 7/14/30
 *  with a by-hotel panel. Aggregation rules: sums for revenue/nights,
 *  occupancy = Σnights/Σavailable, ADR = Σrevenue/Σnights — never averaged
 *  percentages; stale hotel out of totals; closed hotel out of occ/ADR. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PaceMonth } from '../types';
import { euro, kilo, signedPct, varPct } from '../api';
import { SectionLabel, LabelSub, ICONS, KIcons } from './Overview';
import { InfoButton } from './Info';
import { BarPace, OccPace } from './Charts';
import { buildPortfolioFixture, type PBlock, type PHotel, type PortfolioData } from '../fixtures/portfolio';

type Kpi = 'rev' | 'occ' | 'adr' | 'revpar';
const KPI_LABEL: Record<Kpi, string> = { rev: 'Revenue', occ: 'Occupancy', adr: 'ADR', revpar: 'RevPAR' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WDL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NAVY = '#0F2860', GREY = '#CDD4E0', GREEN = '#1A7A50';
const NET_F = 1 / 1.13;   // fixture only — production net comes from the PMS

/* ── segmented control: Settings colours, tab-bar lens movement ── */
export function Seg<T extends string>({ options, value, onChange }: {
  options: { k: T; l: string }[]; value: T; onChange: (k: T) => void;
}) {
  const idx = Math.max(options.findIndex(o => o.k === value), 0);
  const pill = useRef<HTMLSpanElement>(null);
  const prev = useRef(idx);
  useEffect(() => {
    const el = pill.current, from = prev.current;
    prev.current = idx;
    if (!el || from === idx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const d = idx - from, stretch = Math.min(1 + Math.abs(d) * 0.3, 1.9);
    el.animate([
      { transform: `translateX(${from * 100}%) scale(1, 1)` },
      { transform: `translateX(${((from + idx) / 2) * 100}%) scale(${stretch}, .88)`, offset: .45 },
      { transform: `translateX(${idx * 100}%) scale(1.05, .97)`, offset: .82 },
      { transform: `translateX(${idx * 100}%) scale(1, 1)` },
    ], { duration: 420 + Math.abs(d) * 70, easing: 'cubic-bezier(.3, .9, .3, 1)' });
  }, [idx]);
  /* grid with equal 1fr columns: every column is as wide as the widest label,
     so the 1/n pill lines up and no label spills into its neighbour */
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, position: 'relative', background: '#F1F3F8', borderRadius: 10, padding: 3, flex: 'none' }}>
      <span ref={pill} style={{
        position: 'absolute', top: 3, bottom: 3, left: 3, width: `calc((100% - 6px) / ${options.length})`,
        borderRadius: 8, background: NAVY, transform: `translateX(${idx * 100}%)`, pointerEvents: 'none',
      }} />
      {options.map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          position: 'relative', zIndex: 1, border: 'none', background: 'none', textAlign: 'center',
          fontSize: 11.5, fontWeight: 700, padding: '6px 10px', whiteSpace: 'nowrap',
          color: o.k === value ? '#fff' : '#4D5A74', transition: 'color .2s',
        }}>{o.l}</button>
      ))}
    </div>
  );
}

/* ── aggregation helpers ── */
interface K { ty: number | null; ly: number | null }
function kp(b: PBlock, f: number): Record<Kpi, K> {
  return {
    rev: { ty: b.revTY * f, ly: b.revLY * f },
    occ: { ty: b.avail > 0 ? b.rnTY / b.avail : null, ly: b.avail > 0 ? b.rnLY / b.avail : null },
    adr: { ty: b.rnTY > 0 ? b.revTY * f / b.rnTY : null, ly: b.rnLY > 0 ? b.revLY * f / b.rnLY : null },
    revpar: { ty: b.avail > 0 ? b.revTY * f / b.avail : null, ly: b.avail > 0 ? b.revLY * f / b.avail : null },
  };
}
function sumBlock(list: PHotel[], pick: (h: PHotel) => PBlock): PBlock {
  const b: PBlock = { rnTY: 0, revTY: 0, rnLY: 0, revLY: 0, avail: 0 };
  for (const h of list) { const x = pick(h); b.rnTY += x.rnTY; b.revTY += x.revTY; b.rnLY += x.rnLY; b.revLY += x.revLY; b.avail += x.avail; }
  return b;
}
const fmtK = (k: Kpi, v: number | null, dec?: boolean) =>
  v == null ? '—' : k === 'occ' ? `${dec ? (v * 100).toFixed(1) : Math.round(v * 100)}%` : k === 'rev' ? euro(v) : `€${Math.round(v)}`;
const fmtBig = (k: Kpi, v: number | null) => v != null && k === 'rev' && v >= 1e6 ? `€${(v / 1e6).toFixed(2)}M` : fmtK(k, v);
const vOf = (x: K) => (x.ly ? varPct(x.ty ?? 0, x.ly) : null);
const dShort = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

const MC = { up: '#1a7a50', upBg: 'rgba(26,122,80,.12)', down: '#c7411b', downBg: 'rgba(199,65,27,.12)', zebra: '#f6f8fc', ink: '#0a1f4d' };
function Pill({ v }: { v: number | null }) {
  if (v == null) return <span style={{ fontSize: 9.5, fontWeight: 800, borderRadius: 99, padding: '1px 6px', background: '#E9EDF4', color: '#6E7A96' }}>—</span>;
  return (
    <span style={{ fontSize: 9.5, fontWeight: 800, borderRadius: 99, padding: '1px 6px', whiteSpace: 'nowrap', color: v >= 0 ? MC.up : MC.down, background: v >= 0 ? MC.upBg : MC.downBg }}>
      {v >= 0 ? '▲' : '▼'}{Math.abs(v).toFixed(1)}%
    </span>
  );
}
const Badge = ({ kind }: { kind: 'stale' | 'closed' }) => (
  <span style={{
    fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 5, flex: 'none',
    background: kind === 'stale' ? '#FBEEDC' : '#E9EDF4', color: kind === 'stale' ? '#6D4C00' : '#6E7A96',
  }}>{kind}</span>
);
function NameCell({ h, radio, on }: { h: PHotel; radio?: boolean; on?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', minWidth: 0 }}>
      {radio && <span style={{ width: 12, height: 12, borderRadius: '50%', flex: 'none', border: `1.5px solid ${on ? '#2E7CF7' : '#CDD4E0'}`, background: on ? '#2E7CF7' : 'transparent', boxShadow: on ? 'inset 0 0 0 2.5px #fff' : undefined }} />}
      <b style={{ fontSize: 11, fontWeight: 800, color: MC.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.short}</b>
      {h.stale && <Badge kind="stale" />}
      {h.closedNow && <Badge kind="closed" />}
    </span>
  );
}
const rowStyle = (cols: string, i: number, last: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: cols, alignItems: 'center', padding: '10px 0', background: MC.zebra,
  borderTop: i > 0 ? '2px solid #fff' : 'none', borderRadius: i === 0 ? '12px 12px 0 0' : last ? '0 0 12px 12px' : 0, ...extra,
});
const Cell = ({ children }: { children: React.ReactNode }) => (
  <span style={{ textAlign: 'center', borderLeft: '2px solid #fff', padding: '0 4px', minWidth: 0 }}>{children}</span>
);
const Val = ({ children, dim }: { children: React.ReactNode; dim?: boolean }) => (
  <span style={{ display: 'block', fontSize: 12.5, fontWeight: dim ? 700 : 800, color: dim ? '#6E7A96' : MC.ink, whiteSpace: 'nowrap' }}>{children}</span>
);
const cardBox: React.CSSProperties = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 20, padding: 16, marginBottom: 22 };
const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' };
const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0 };
const headSpan = (left?: boolean, on?: boolean): React.CSSProperties => ({
  textAlign: left ? 'left' : 'center', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', padding: left ? '0 8px' : '0 4px',
  color: on ? '#1E5FD0' : left ? '#9aa4b8' : '#2e7cf7', cursor: 'pointer',
});

/* ── Overview: Data-health banner, NET strip, KPI cards, ONE by-hotel table ── */
function Overview({ D, f, onToast }: { D: PortfolioData; f: number; onToast: (m: string) => void }) {
  const [per, setPer] = useState<'yd' | 'mtd' | 'ytd'>('yd');
  const [sortKey, setSortKey] = useState<'name' | Kpi>('rev');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fresh = D.hotels.filter(h => !h.stale);
  const stale = D.hotels.filter(h => h.stale);
  const tot = kp(sumBlock(fresh, h => h.yd), f);
  const cards: { k: Kpi; label: string; icon: React.ReactNode }[] = [
    { k: 'rev', label: 'REVENUE', icon: KIcons.rev }, { k: 'occ', label: 'OCCUPANCY', icon: KIcons.occ },
    { k: 'adr', label: 'ADR', icon: KIcons.adr }, { k: 'revpar', label: 'REVPAR', icon: KIcons.rooms },
  ];
  const pick = (h: PHotel) => per === 'yd' ? h.yd : per === 'mtd' ? h.mtd : h.ytd;
  const sub = per === 'yd' ? `${D.reportLabel} vs same day LY` : per === 'mtd' ? `Sep 1–${D.elapsed} vs LY` : `Jan 1 – Sep ${D.elapsed} vs LY`;
  const rows = D.hotels.map(h => ({ h, k: kp(pick(h), f) }));
  const sv = (r: typeof rows[number]) => sortKey === 'name' ? r.h.short : vOf(r.k[sortKey]);
  rows.sort((a, b) => {
    const sa = !!a.h.stale, sb2 = !!b.h.stale; if (sa !== sb2) return sa ? 1 : -1;
    const x = sv(a), y = sv(b);
    if (typeof x === 'string' && typeof y === 'string') return sortDir === 'asc' ? x.localeCompare(y) : y.localeCompare(x);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return sortDir === 'asc' ? (x as number) - (y as number) : (y as number) - (x as number);
  });
  const totK = kp(sumBlock(fresh, pick), f);
  const cols = '1.25fr 1.05fr .8fr .75fr .85fr';
  const clickSort = (k: 'name' | Kpi) => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc'); } };
  const H = ({ k, l, left }: { k: 'name' | Kpi; l: string; left?: boolean }) => (
    <span onClick={() => clickSort(k)} style={headSpan(left, sortKey === k)}>{l}{sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
  );
  const cell = (kk: Record<Kpi, K>, k: Kpi) => <Cell><Val>{fmtK(k, kk[k].ty, true)}</Val><Pill v={vOf(kk[k])} /></Cell>;
  return (
    <div data-share-root="Yesterday">
      {stale.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#FBEEDC', color: '#6D4C00', borderRadius: 12, padding: '9px 13px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          <span>⚠ {stale.map(h => h.name).join(', ')} has no fresh data since {dShort(stale[0].reportDate)} — left out of the portfolio totals</span>
          <button onClick={() => onToast('Preview — fictional data')} style={{ border: 'none', background: '#6D4C00', color: '#fff', borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Data health</button>
        </div>
      )}
      {f !== 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 0 14px', fontSize: 12, fontWeight: 600, color: '#5A6780' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F2860', background: '#E9EDF4', borderRadius: 999, padding: '3px 9px' }}>NET</span>
          Revenue and ADR shown net of VAT &amp; taxes · change in Settings
        </div>
      )}
      <SectionLabel icon="sun" info="yday" title="Yesterday">
        Yesterday <LabelSub>· {D.reportLabel} vs same day LY · whole portfolio</LabelSub>
      </SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {cards.map(c => { const v = varPct(tot[c.k].ty ?? 0, tot[c.k].ly ?? 0); return (
          <div key={c.k} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(15,40,96,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{c.icon}<span style={{ fontSize: 11, letterSpacing: '.08em', color: '#6e7a96', fontWeight: 800 }}>{c.label}</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 29, fontWeight: 800, color: MC.ink }}>{fmtBig(c.k, tot[c.k].ty)}</span>
              <span style={{ fontSize: 13, color: '#9aa4b8', fontWeight: 600 }}>vs</span>
              <span style={{ fontSize: 13, color: '#9aa4b8', fontWeight: 600 }}>{fmtBig(c.k, tot[c.k].ly)}</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, borderRadius: 99, padding: '2px 10px', display: 'inline-block', marginTop: 5, color: v >= 0 ? MC.up : MC.down, background: v >= 0 ? 'rgba(26,122,80,.1)' : 'rgba(199,65,27,.1)' }}>{signedPct(v)} vs LY</div>
          </div>
        ); })}
      </div>
      <div style={cardBox}>
        <div style={cardTop}>
          <span style={cardTitle}>By hotel <LabelSub>· {sub}</LabelSub></span>
          <Seg options={[{ k: 'yd', l: 'Yesterday' }, { k: 'mtd', l: 'MTD' }, { k: 'ytd', l: 'YTD' }]} value={per} onChange={setPer} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '0 0 6px' }}>
          <H k="name" l="HOTEL" left /><H k="rev" l="REVENUE" /><H k="occ" l="OCC" /><H k="adr" l="ADR" /><H k="revpar" l="REVPAR" />
        </div>
        {rows.map((r, i) => (
          <div key={r.h.id} style={rowStyle(cols, i, false, r.h.stale ? { opacity: .5 } : undefined)}>
            <NameCell h={r.h} />{cell(r.k, 'rev')}{cell(r.k, 'occ')}{cell(r.k, 'adr')}{cell(r.k, 'revpar')}
          </div>
        ))}
        <div style={rowStyle(cols, rows.length, true, { background: '#EEF3FC' })}>
          <span style={{ padding: '0 8px', fontSize: 11, fontWeight: 800, color: MC.ink }}>Portfolio</span>
          {cell(totK, 'rev')}{cell(totK, 'occ')}{cell(totK, 'adr')}{cell(totK, 'revpar')}
        </div>
        {per === 'ytd' && <div style={{ fontSize: 10.5, color: '#6E7A96', fontWeight: 600, marginTop: 10 }}>Occupancy and RevPAR use the days each hotel was open this year.</div>}
      </div>
    </div>
  );
}

/* ── Pickup: the four window boxes are the slicer (ring on the selection) + by-hotel rows ── */
const ringStyle: React.CSSProperties = {
  border: '1.8px solid transparent',
  background: 'linear-gradient(var(--card-bg), var(--card-bg)) padding-box,' +
    'linear-gradient(120deg, #0F2860, #2E7CF7, #38E1F0, #2E7CF7, #0F2860) border-box',
  backgroundSize: 'auto, 300% 300%', animation: 'pwring 3.5s ease-in-out infinite',
};
const WINS = [
  { w: 1, title: 'Yesterday', sub: '09 Sep', range: '09 Sep' }, { w: 3, title: '3-Day', sub: '07–09 Sep', range: '07 Sep – 09 Sep' },
  { w: 7, title: '7-Day', sub: '03–09 Sep', range: '03 Sep – 09 Sep' }, { w: 14, title: '14-Day', sub: '27 Aug–09 Sep', range: '27 Aug – 09 Sep' },
];
function Pickup({ D, f }: { D: PortfolioData; f: number }) {
  const [win, setWin] = useState(7);
  const fresh = D.hotels.filter(h => !h.stale);
  const tot = (w: number) => fresh.reduce((a, h) => { const p = h.pickup[w]; return { rn: a.rn + p.rn, rev: a.rev + p.rev * f, c: a.c + p.cancel, cRev: a.cRev + p.cancelRev * f }; }, { rn: 0, rev: 0, c: 0, cRev: 0 });
  const puLbl: React.CSSProperties = { fontSize: 10, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '.05em' };
  const rows = D.hotels.map(h => { const q = h.pickup[win]; return { h, rn: q.rn, c: q.cancel, rev: q.rev * f, cRev: q.cancelRev * f }; })
    .sort((a, b) => { const sa = !!a.h.stale, sb2 = !!b.h.stale; if (sa !== sb2) return sa ? 1 : -1; return (b.rn - b.c) - (a.rn - a.c); });
  const t = tot(win);
  const COLS = '1.25fr 1fr 1fr 1fr';
  const X = ({ color, v, sub }: { color: string; v: string; sub: string }) => (
    <span style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{v}<small style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--cap)' }}>{sub}</small></span>
  );
  const Row = ({ name, rn, c, rev, cRev, dim, total }: { name: React.ReactNode; rn: number; c: number; rev: number; cRev: number; dim?: boolean; total?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', padding: total ? '8px 6px' : '8px 0', borderBottom: total ? 'none' : '1px solid #F5F7FA', opacity: dim ? .45 : 1, background: total ? '#F6F8FC' : undefined, borderRadius: total ? 10 : 0, margin: total ? '4px -6px 0' : 0 }}>
      {name}
      <X color="var(--green)" v={`+${rn} rn`} sub={kilo(rev)} />
      <X color="var(--red)" v={`-${c} rn`} sub={`-${kilo(cRev)}`} />
      <X color={rn - c < 0 ? 'var(--coral)' : 'var(--text)'} v={`${rn - c >= 0 ? '+' : ''}${rn - c} rn`} sub={kilo(rev - cRev)} />
    </div>
  );
  return (
    <div data-share-root="Pickup Activity">
      <style>{`@keyframes pwring{0%{background-position:0 0,0% 50%}50%{background-position:0 0,100% 50%}100%{background-position:0 0,0% 50%}}`}</style>
      <SectionLabel icon="trend" info="pickup" title="Pickup Activity">Pickup Activity</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {WINS.map(x => { const b = tot(x.w); return (
          <div key={x.w} className="card" onClick={() => setWin(x.w)} style={{ padding: 12, cursor: 'pointer', ...(win === x.w ? ringStyle : { border: '1.8px solid transparent' }) }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{x.title}<span style={{ color: 'var(--cap)', marginLeft: 4 }}>{x.sub}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}><span style={puLbl}>Booked</span><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>+{b.rn} rn · {kilo(b.rev)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}><span style={puLbl}>Cancelled</span><span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>-{b.c} rn · -{kilo(b.cRev)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px solid var(--grey-100)' }}><span style={{ ...puLbl, fontWeight: 700, color: 'var(--n600)' }}>Net</span><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{b.rn - b.c} rn · {kilo(b.rev - b.cRev)}</span></div>
          </div>
        ); })}
      </div>
      <div className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {ICONS.fly}<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>By hotel <LabelSub>· {WINS.find(x => x.w === win)?.range}</LabelSub></span><InfoButton k="fly" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '2px 0 6px', borderBottom: '1px solid #EDF0F6' }}>
          {['HOTEL', 'BOOKED', 'CANCELLED', 'NET'].map((l, i) => <span key={l} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--cap)', textAlign: i ? 'right' : 'left' }}>{l}</span>)}
        </div>
        {rows.map(r => (
          <Row key={r.h.id} dim={!!r.h.stale} rn={r.rn} c={r.c} rev={r.rev} cRev={r.cRev}
            name={<span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}><b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.h.short}</b>{r.h.stale && <Badge kind="stale" />}{r.h.closedNow && <Badge kind="closed" />}</span>} />
        ))}
        <Row total rn={t.rn} c={t.c} rev={t.rev} cRev={t.cRev} name={<span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>Portfolio</span>} />
        <div style={{ fontSize: 10.5, color: '#6E7A96', fontWeight: 600, marginTop: 10 }}>Room nights for all future stay dates, booked or cancelled in the window. Revenue under each figure.</div>
      </div>
    </div>
  );
}

/* ── Pace: BarPace / OccPace with a KPI switch, 3-column full-year table, tap a row → chart it ── */
function toPace(list: PHotel[], k: Kpi, f: number): PaceMonth[] {
  return MON.map((month, i) => {
    let rnT = 0, revT = 0, rnS = 0, revS = 0, rnF = 0, revF = 0, av = 0;
    for (const h of list) { const x = h.months[i]; rnT += x.rnTY; revT += x.revTY * f; rnS += x.rnST; revS += x.revST * f; rnF += x.rnLY; revF += x.revLY * f; av += x.avail; }
    const val = (rn: number, rev: number) => k === 'rev' ? rev : k === 'occ' ? (av > 0 ? rn / av : 0) : k === 'adr' ? (rn > 0 ? rev / rn : 0) : (av > 0 ? rev / av : 0);
    const ty = val(rnT, revT), st = val(rnS, revS), fin = val(rnF, revF);
    return {
      month, month_num: i + 1, rn: rnT, rn_stly: rnS, rn_final_ly: rnF,
      rev: k === 'rev' ? ty : revT, rev_stly: k === 'rev' ? st : revS, rev_final: k === 'rev' ? fin : revF,
      adr: k === 'occ' || k === 'rev' ? (rnT ? revT / rnT : 0) : ty, adr_stly: k === 'occ' || k === 'rev' ? (rnS ? revS / rnS : 0) : st, adr_final_ly: k === 'occ' || k === 'rev' ? (rnF ? revF / rnF : 0) : fin,
      occ: av ? rnT / av : 0, stly: av ? rnS / av : 0, final: av ? rnF / av : 0,
      status: ty >= st ? 'ahead' : 'behind',
    };
  });
}
function yearKpi(list: PHotel[], k: Kpi, f: number): K & { fin: number | null } {
  let rnT = 0, revT = 0, rnS = 0, revS = 0, rnF = 0, revF = 0, av = 0;
  for (const h of list) for (const x of h.months) { rnT += x.rnTY; revT += x.revTY * f; rnS += x.rnST; revS += x.revST * f; rnF += x.rnLY; revF += x.revLY * f; av += x.avail; }
  const val = (rn: number, rev: number) => k === 'rev' ? rev : k === 'occ' ? (av > 0 ? rn / av : null) : k === 'adr' ? (rn > 0 ? rev / rn : null) : (av > 0 ? rev / av : null);
  return { ty: val(rnT, revT), ly: val(rnS, revS), fin: val(rnF, revF) };
}
function Pace({ D, f }: { D: PortfolioData; f: number }) {
  const [k, setK] = useState<Kpi>('rev');
  const [sel, setSel] = useState<string>('portfolio');
  const fresh = D.hotels.filter(h => !h.stale);
  const list = sel === 'portfolio' ? fresh : D.hotels.filter(h => h.id === sel);
  const months = useMemo(() => toPace(list, k, f), [list, k, f]);
  const halves = [months.slice(0, 6), months.slice(6)];
  const mx = k === 'occ' ? undefined : k === 'rev'
    ? Math.max(1, ...months.map(m => Math.max(m.rev, m.rev_stly, m.rev_final || 0))) * 1.08
    : Math.max(1, ...months.map(m => Math.max(m.adr, m.adr_stly, m.adr_final_ly || 0))) * 1.08;
  const fmtAxis = (v: number) => v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : kilo(v);
  const icon = { rev: 'euro', occ: 'occ', adr: 'adr', revpar: 'bridge' }[k];
  const title = { rev: 'Revenue OTB', occ: 'Occupancy', adr: 'ADR', revpar: 'RevPAR' }[k];
  const legend: [string, string, boolean?][] = [[NAVY, 'OTB TY'], [GREY, 'STLY'], [GREEN, 'Final LY', true]];
  const rows = D.hotels.map(h => ({ h, ...yearKpi([h], k, f) }))
    .sort((a, b) => { const sa = !!a.h.stale, sb2 = !!b.h.stale; if (sa !== sb2) return sa ? 1 : -1; return (vOf(a) ?? 99) - (vOf(b) ?? 99); });
  const tot = yearKpi(fresh, k, f);
  const cols = '1.35fr 1fr 1fr';
  const chartRef = useRef<HTMLDivElement>(null);
  const pickRow = (id: string) => {
    setSel(id);
    const el = chartRef.current; if (!el) return;
    const stickyH = document.getElementById('fl-sticky')?.offsetHeight ?? 46;
    if (el.getBoundingClientRect().top < stickyH) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - stickyH - 70, behavior: 'smooth' });
  };
  /* selected row = the app's gradient ring (same as the pickup boxes); every
     row carries a transparent 1.8px border so the selection never shifts layout */
  const yrRow = (id: string, name: React.ReactNode, r: K & { fin: number | null }, i: number, last: boolean, dim?: boolean) => (
    <div key={id} onClick={() => pickRow(id)} style={rowStyle(cols, i, last, {
      cursor: 'pointer', borderTop: 'none', border: '1.8px solid transparent', borderRadius: i === 0 ? '12px 12px 0 0' : last ? '0 0 12px 12px' : 0,
      ...(sel === id ? { ...ringStyle, borderRadius: 12 } : {}), ...(dim ? { opacity: .5 } : {}),
    })}>
      {name}
      <Cell><Val>{fmtK(k, r.ty, true)}</Val><Pill v={vOf(r)} /></Cell>
      <Cell><Val dim>{fmtK(k, r.fin, true)}</Val><Pill v={r.fin ? varPct(r.ty ?? 0, r.fin) : null} /></Cell>
    </div>
  );
  return (
    <div data-share-root="Pace">
      <SectionLabel icon="pace" info="pace" title="Pace">Pace — OTB vs STLY vs Final LY</SectionLabel>
      <div ref={chartRef} className="card" style={{ padding: '18px 18px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {ICONS[icon]}<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          <InfoButton k={{ rev: 'crev', occ: 'cocc', adr: 'cadr', revpar: 'cadr' }[k]} />
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 10, fontWeight: 600, color: 'var(--n600)' }}>
            {legend.map(([c, l, dash]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: dash ? 2 : 9, background: dash ? 'transparent' : c, borderTop: dash ? `2px dashed ${c}` : 'none', borderRadius: 2, display: 'inline-block' }} />{l}
              </span>
            ))}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--n600)', fontWeight: 600, flex: 1, minWidth: 0 }}>Showing <b style={{ color: NAVY, fontWeight: 800 }}>{sel === 'portfolio' ? `Portfolio · ${fresh.length} hotels` : list[0]?.name}</b></span>
          <Seg options={[{ k: 'rev', l: 'Revenue' }, { k: 'occ', l: 'Occ' }, { k: 'adr', l: 'ADR' }, { k: 'revpar', l: 'RevPAR' }]} value={k} onChange={setK} />
        </div>
        {/* a full year as two stacked halves (Jan–Jun, Jul–Dec) on ONE shared
            y-scale: each half gets the whole card width, so pills and month
            labels stay full size and the chart is twice as tall */}
        {halves.map((h, i) => (
          <div key={i} style={{ marginTop: i ? 6 : 0, paddingTop: i ? 6 : 0, borderTop: i ? '1px solid #EDF0F6' : 'none' }}>
            {k === 'occ'
              ? <OccPace months={h} />
              : k === 'rev'
                ? <BarPace months={h} field="rev" fieldStly="rev_stly" fieldFinal="rev_final" fmt={fmtAxis} fmtFull={v => euro(v)} mx={mx} />
                : <BarPace months={h} field="adr" fieldStly="adr_stly" fieldFinal="adr_final_ly" fmt={v => `€${Math.round(v)}`} fmtFull={v => `€${Math.round(v)}`} mx={mx} />}
          </div>
        ))}
      </div>
      <div style={cardBox}>
        <style>{`@keyframes pwring{0%{background-position:0 0,0% 50%}50%{background-position:0 0,100% 50%}100%{background-position:0 0,0% 50%}}`}</style>
        <div style={cardTop}><span style={cardTitle}>Full year by hotel <LabelSub>· tap a row to chart it</LabelSub></span></div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '0 0 6px' }}>
          <span style={headSpan(true)}>HOTEL</span><span style={headSpan()}>{KPI_LABEL[k].toUpperCase()} 2026 · VS STLY</span><span style={headSpan()}>FINAL LY · VS FINAL</span>
        </div>
        {yrRow('portfolio', <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}><span style={{ width: 12, height: 12, borderRadius: '50%', flex: 'none', border: `1.5px solid ${sel === 'portfolio' ? '#2E7CF7' : '#CDD4E0'}`, background: sel === 'portfolio' ? '#2E7CF7' : 'transparent', boxShadow: sel === 'portfolio' ? 'inset 0 0 0 2.5px #fff' : undefined }} /><b style={{ fontSize: 11, fontWeight: 800, color: MC.ink }}>Portfolio</b></span>, tot, 0, false)}
        {rows.map((r, i) => yrRow(r.h.id, <NameCell h={r.h} radio on={sel === r.h.id} />, r, i + 1, i === rows.length - 1, !!r.h.stale))}
      </div>
    </div>
  );
}

/* ── Calendar: DemandHeat cut to 7 / 14 / 30 days, portfolio occupancy per stay date, tap → by hotel ── */
const RAMP = ['#F2F2F7', '#E1EBFB', '#C4DAF9', '#9FC4F6', '#6FA7F2', '#3D87EE', '#0A6CDF'];
const bucket = (occ: number) => { const t = [0.20, 0.35, 0.50, 0.65, 0.78, 0.88]; for (let i = 0; i < 6; i++) if (occ < t[i]) return i; return 6; };
function Calendar({ D }: { D: PortfolioData }) {
  const [w, setW] = useState(7);
  const [sel, setSel] = useState<number | null>(null);
  const inc = D.hotels.filter(h => !h.stale);
  const days = Array.from({ length: w }, (_, d) => {
    let rn = 0, rs = 0, av = 0;
    for (const h of inc) { const x = h.next[d]; rn += x.ty * x.avail; rs += x.st * x.avail; av += x.avail; }
    const f0 = inc[0].next[d];
    return { d, m: f0.m, dom: f0.dom, dow: f0.dow, occ: rn / av, ly: rs / av, newMonth: d > 0 && f0.m !== inc[0].next[d - 1].m };
  });
  const anoms = days.filter(c => c.ly >= 0.30 && c.occ < 0.5 * c.ly).map(c => `${String(c.dom).padStart(2, '0')}/${String(c.m).padStart(2, '0')}`);
  const hotelAnoms: string[] = [];
  for (const h of inc) h.next.slice(0, w).forEach((x, d) => { if (x.avail && x.st >= 0.30 && x.ty < 0.5 * x.st) hotelAnoms.push(`${h.short} ${String(days[d].dom).padStart(2, '0')}/${String(days[d].m).padStart(2, '0')}`); });
  const c = sel != null ? days[sel] : null;
  const panel = c ? D.hotels.map(h => ({ h, x: h.next[c.d] })).sort((a, b) => {
    const ca = !a.x.avail, cb = !b.x.avail; if (ca !== cb) return ca ? 1 : -1;
    const sa = !!a.h.stale, sb2 = !!b.h.stale; if (sa !== sb2) return sa ? 1 : -1;
    const va = a.x.st ? varPct(a.x.ty, a.x.st) : 99, vb = b.x.st ? varPct(b.x.ty, b.x.st) : 99; return va - vb;
  }) : [];
  const open = panel.filter(r => r.x.avail && !r.h.stale);
  const behind = open.filter(r => r.x.st && varPct(r.x.ty, r.x.st) < 0).length;
  const hrow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 46px 60px', alignItems: 'center', gap: 6, padding: '6px 0', borderTop: '1px solid rgba(46,124,247,.12)', fontSize: 11.5 };
  return (
    <div data-share-root="Next Days Demand">
      <SectionLabel icon="cal60" info="heat" title={`Next ${w} Days Demand`}>Next {w} Days Demand <LabelSub>· whole portfolio</LabelSub></SectionLabel>
      <div className="card" style={{ padding: '18px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
          <span style={{ fontSize: 11, color: 'var(--n600)', lineHeight: 1.5, flex: 1 }}>Occupancy on the books per stay date — darker = fuller. A red outline marks a date far behind last year. Tap a date to see each hotel.</span>
          <Seg options={[{ k: '7', l: '7d' }, { k: '14', l: '14d' }, { k: '30', l: '30d' }]} value={String(w)} onChange={v => { setW(Number(v)); setSel(null); }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--cap)' }}>{x}</div>)}
          {Array.from({ length: (days[0].dow + 6) % 7 }, (_, i) => <div key={`e${i}`} />)}
          {days.map(x => {
            const b = bucket(x.occ), ring = x.ly >= 0.30 && x.occ < 0.5 * x.ly, on = sel === x.d;
            return (
              <div key={x.d} onClick={() => setSel(on ? null : x.d)} style={{
                borderRadius: 7, padding: '7px 0 6px', textAlign: 'center', cursor: 'pointer', background: RAMP[b], color: b >= 4 ? '#fff' : '#1D1B20',
                boxShadow: [on ? '0 0 0 2px #2E7CF7' : '', ring ? 'inset 0 0 0 2px #BA1A1A' : x.newMonth ? 'inset 2px 0 0 #1D1B20' : ''].filter(Boolean).join(', ') || undefined,
                transform: on ? 'scale(1.04)' : undefined,
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{Math.round(x.occ * 100)}%</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .75 }}>{String(x.dom).padStart(2, '0')}/{String(x.m).padStart(2, '0')}</div>
              </div>
            );
          })}
        </div>
        {c && (
          <div style={{ background: '#F1F6FF', borderRadius: 12, padding: '10px 12px', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>{WDL[c.dow]} {c.dom} {MON[c.m - 1]}
                <span style={{ fontWeight: 600, color: 'var(--n600)', marginLeft: 6 }}>{Math.round(c.occ * 100)}% booked · last year {Math.round(c.ly * 100)}% · {behind} of {open.length} hotels behind</span></span>
              <button onClick={() => setSel(null)} style={{ border: 'none', background: 'none', fontSize: 11.5, fontWeight: 700, color: '#6E7A96', padding: '0 4px' }}>Clear</button>
            </div>
            <div style={{ ...hrow, borderTop: 'none', marginTop: 6, paddingBottom: 2 }}>
              {['HOTEL', 'OTB', 'LY', 'VS LY'].map((l, i) => <span key={l} style={{ fontSize: 9.5, letterSpacing: '.06em', fontWeight: 700, color: 'var(--cap)', textAlign: i ? 'right' : 'left' }}>{l}</span>)}
            </div>
            {panel.map(({ h, x }) => {
              if (!x.avail) return (
                <div key={h.id} style={hrow}><span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: .55 }}><b>{h.short}</b><Badge kind="closed" /></span><span style={{ textAlign: 'right', opacity: .4 }}>—</span><span style={{ textAlign: 'right', color: '#9aa4b8' }}>—</span><span /></div>
              );
              const ring = x.st >= 0.30 && x.ty < 0.5 * x.st;
              return (
                <div key={h.id} style={{ ...hrow, opacity: h.stale ? .5 : 1 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    {ring && <span style={{ width: 8, height: 8, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px #BA1A1A', flex: 'none' }} />}
                    <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.short}</b>{h.stale && <Badge kind="stale" />}
                  </span>
                  <span style={{ fontWeight: 800, color: MC.ink, textAlign: 'right' }}>{Math.round(x.ty * 100)}%</span>
                  <span style={{ fontWeight: 600, color: '#9aa4b8', textAlign: 'right', fontSize: 10.5 }}>{Math.round(x.st * 100)}%</span>
                  <span style={{ textAlign: 'right' }}><Pill v={x.st ? varPct(x.ty, x.st) : null} /></span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 10, fontSize: 10, fontWeight: 600, color: 'var(--n600)' }}>
          empty {RAMP.map(x => <span key={x} style={{ width: 12, height: 12, borderRadius: 3, background: x, display: 'inline-block' }} />)} full
          <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#F2F2F7', boxShadow: 'inset 0 0 0 2px #BA1A1A', display: 'inline-block' }} /> behind LY</span>
        </div>
        {(anoms.length > 0 || hotelAnoms.length > 0) && (
          <div style={{ background: '#FBEEDC', color: '#6D4C00', borderRadius: 12, fontSize: 12, lineHeight: 1.5, padding: '10px 13px', marginTop: 10, fontWeight: 600 }}>
            ⚠ {anoms.length ? `Dates far behind last year: ${anoms.slice(0, 6).join(', ')}` : `Far behind last year at one hotel: ${hotelAnoms.slice(0, 4).join(', ')} — tap the date to see it.`}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── the view ── */
export function PortfolioView({ revMode, onToast }: { revMode: 'gross' | 'net'; onToast: (m: string) => void }) {
  const D = useMemo(() => buildPortfolioFixture(), []);
  const f = revMode === 'net' ? NET_F : 1;
  return (
    <>
      <div style={{ background: '#FBEEDC', color: '#6D4C00', borderRadius: 12, padding: '7px 13px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
        Portfolio preview · fictional data · 8 test hotels · {D.groupName}
      </div>
      <Overview D={D} f={f} onToast={onToast} />
      <div id="sec-pickup" style={{ scrollMarginTop: 46 }} />
      <Pickup D={D} f={f} />
      <div id="sec-pace" style={{ scrollMarginTop: 46 }} />
      <Pace D={D} f={f} />
      <div id="sec-cal" style={{ scrollMarginTop: 46 }} />
      <Calendar D={D} />
      <div style={{ fontSize: 10.5, color: '#6E7A96', fontWeight: 600, lineHeight: 1.5, margin: '18px 4px 0' }}>
        Fictional data for eight test hotels. Portara Bay carries a stale briefing (last run 7 Sep); Lefka Ori is closed until November. Net = gross ÷ 1.13 in this preview.
      </div>
    </>
  );
}
