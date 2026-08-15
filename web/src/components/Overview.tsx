/** Overview modules — parity spec 2026-08-15: section headers with icon +
 *  info + Share pill, Yesterday 2x2 KPI grid with gradient top borders,
 *  MTD as 4 discrete cards, OTB months stacked full-width. */
import type { Briefing } from '../types';
import { euro, kilo, pct, signedPct, varPct } from '../api';
import { InfoButton } from './Info';

export const ICONS: Record<string, React.ReactNode> = {
  sun: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  cal: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  trend: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  pace: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  star: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>,
};

async function shareSection(title: string) {
  try {
    if (navigator.share) await navigator.share({ title: `FirstLight — ${title}`, url: location.href });
  } catch { /* dismissed */ }
}

export function SectionLabel({ children, info, icon, title }: {
  children: React.ReactNode; info?: string; icon?: string; title?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700,
      color: '#0F2860', margin: '22px 0 10px', letterSpacing: '-.01em', flexWrap: 'wrap',
    }}>
      {icon && ICONS[icon]}
      {children}
      {info && <InfoButton k={info} />}
      <button onClick={() => shareSection(title ?? 'Briefing')} style={{
        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
        border: '1px solid #CDD4E0', background: '#fff', borderRadius: 999,
        padding: '4px 11px', fontSize: 10.5, fontWeight: 700, color: '#4D5A74',
      }}>↑ Share</button>
    </div>
  );
}

export function KpiRow({ briefing }: { briefing: Briefing }) {
  const y = briefing.data.yesterday;
  const cells: [string, string, number, string][] = [
    ['TOTAL REVENUE', euro(y.revenue), varPct(y.revenue, y.revenueLY), `vs LY ${euro(y.revenueLY)}`],
    ['OCCUPANCY', pct(y.occupancy), varPct(y.occupancy, y.occupancyLY), `vs LY ${pct(y.occupancyLY)}`],
    ['ADR', `${Math.round(y.adr)} €`, varPct(y.adr, y.adrLY), `vs LY ${Math.round(y.adrLY)} €`],
    ['ROOM NIGHTS', String(y.roomNights), varPct(y.roomNights, y.roomNightsLY), `vs LY ${y.roomNightsLY}`],
  ];
  return (
    <>
      <SectionLabel icon="sun" info="yday" title="Yesterday">Yesterday</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {cells.map(([label, value, v, sub]) => (
          <div key={label} className="card" style={{ padding: '0 10px 16px', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'var(--grad-cyan)', margin: '0 -10px 14px' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--n700)', letterSpacing: '.08em', marginBottom: 8 }}>{label}</div>
            <div className="t-value" style={{ fontSize: 26, letterSpacing: '-.03em', lineHeight: 1, marginBottom: 8, color: 'var(--text)' }}>{value}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {v >= 0 ? '▲' : '▼'} {signedPct(v)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cap)', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function MtdStrip({ briefing }: { briefing: Briefing }) {
  const m = briefing.data.mtd;
  const cells: [string, string, number][] = [
    ['MTD REV', kilo(m.revenue), varPct(m.revenue, m.revenueLY)],
    ['MTD OCC', pct(m.occupancy), varPct(m.occupancy, m.occupancyLY)],
    ['MTD ADR', `${Math.round(m.adr)} €`, varPct(m.adr, m.adrLY)],
    ['MTD ROOMS', String(m.roomNights), varPct(m.roomNights, m.roomNightsLY)],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
      {cells.map(([label, value, v]) => (
        <div key={label} className="card" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--n500)', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
          <div className="t-value" style={{ fontSize: 14, letterSpacing: '-.02em', color: 'var(--text)' }}>{value}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {v >= 0 ? '▲' : '▼'} {signedPct(v)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OtbCards({ briefing }: { briefing: Briefing }) {
  const months = briefing.data.pace_current ?? [];
  if (!months.length) return null;
  return (
    <>
      <SectionLabel icon="cal" info="otb3" title="On The Books">On The Books — Next 3 Months</SectionLabel>
      {months.map(p => {
        const vs = p.rev_stly ? ((p.rev - p.rev_stly) / p.rev_stly) * 100 : 0;
        const col = p.status === 'ahead' ? 'var(--green)' : p.status === 'behind' ? 'var(--red)' : 'var(--n500)';
        const bar = p.status === 'ahead' ? 'var(--grad-cyan)' : p.status === 'behind' ? 'var(--red)' : 'var(--n500)';
        return (
          <div key={p.month} className="card" style={{ padding: '0 0 16px', textAlign: 'center', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: 4, background: bar }} />
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 6px' }}>{p.month}</div>
            <div className="t-value" style={{ fontSize: 26, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text)' }}>{euro(p.rev)}</div>
            <div style={{ fontSize: 12, color: 'var(--n500)', fontWeight: 700, marginTop: 8 }}>
              <b style={{ fontWeight: 800, color: 'var(--text)' }}>{p.rn}</b> rn · <span style={{ color: col }}>{pct(p.occ)}</span> occ
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5, color: vs >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {vs >= 0 ? '▲' : '▼'} {signedPct(vs, 0)} vs STLY
            </div>
          </div>
        );
      })}
    </>
  );
}
