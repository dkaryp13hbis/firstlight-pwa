/** Overview blocks below the KPI row: MTD strip + On The Books next-3-months
 *  cards — faithful ports of the canon markup, computed from data. */
import type { Briefing } from '../types';
import { euro, kilo, pct, signedPct, varPct } from '../api';

export function MtdStrip({ briefing }: { briefing: Briefing }) {
  const m = briefing.data.mtd;
  const cells: [string, string, number][] = [
    ['MTD Rev', kilo(m.revenue), varPct(m.revenue, m.revenueLY)],
    ['MTD Occ', pct(m.occupancy), varPct(m.occupancy, m.occupancyLY)],
    ['MTD ADR', `${Math.round(m.adr)} €`, varPct(m.adr, m.adrLY)],
    ['MTD Rooms', String(m.roomNights), varPct(m.roomNights, m.roomNightsLY)],
  ];
  return (
    <div className="card" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      borderRadius: 'var(--r-lg)', marginBottom: 14, overflow: 'hidden',
      background: 'var(--grey-50)',
    }}>
      {cells.map(([label, value, v]) => (
        <div key={label} style={{ padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
          <div className="t-value" style={{ fontSize: 14, letterSpacing: '-.02em', color: 'var(--text)' }}>{value}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {v >= 0 ? '▲' : '▼'} {signedPct(v)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700,
      color: '#0F2860', margin: '18px 0 8px', letterSpacing: '-.01em',
    }}>{children}</div>
  );
}

export function OtbCards({ briefing }: { briefing: Briefing }) {
  const months = briefing.data.pace_current ?? [];
  if (!months.length) return null;
  return (
    <>
      <SectionLabel>On The Books — Next 3 Months</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
        {months.map(p => {
          const vs = p.rev_stly ? ((p.rev - p.rev_stly) / p.rev_stly) * 100 : 0;
          const col = p.status === 'ahead' ? 'var(--green)' : p.status === 'behind' ? 'var(--red)' : 'var(--n500)';
          const bar = p.status === 'ahead'
            ? 'linear-gradient(90deg, var(--blue), var(--cyan))'
            : p.status === 'behind' ? 'var(--red)' : 'var(--n500)';
          return (
            <div key={p.month} className="card" style={{ borderRadius: 'var(--r-lg)', padding: '0 0 12px', textAlign: 'center', overflow: 'hidden' }}>
              <div style={{ height: 4, background: bar }} />
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '10px 0 4px' }}>{p.month}</div>
              <div className="t-value" style={{ fontSize: 20, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text)' }}>{euro(p.rev)}</div>
              <div style={{ fontSize: 11, color: 'var(--n500)', fontWeight: 700, marginTop: 6 }}>
                <b style={{ fontWeight: 800, color: 'var(--text)' }}>{p.rn}</b> rn · <span style={{ color: col, fontWeight: 700 }}>{pct(p.occ)}</span> occ
              </div>
              <div className="t-delta" style={{ fontSize: 11, marginTop: 3, color: vs >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {vs >= 0 ? '▲' : '▼'} {signedPct(vs, 0)} vs STLY
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
