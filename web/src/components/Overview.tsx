/** Overview modules — parity spec 2026-08-15: section headers with icon +
 *  info + Share pill, Yesterday 2x2 KPI grid with gradient top borders,
 *  MTD as 4 discrete cards, OTB months stacked full-width. */
import type { Briefing } from '../types';
import { euro, pct, signedPct, varPct } from '../api';
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

const KC = {
  ink: '#0a1f4d', sub: '#6e7a96', muted: '#9aa4b8',
  up: '#1a7a50', upBg: 'rgba(26,122,80,.1)', down: '#c7411b', downBg: 'rgba(199,65,27,.1)',
  panelBg: '#f1f4fa', border: '#e2e7f0', hairline: '#edf1f8',
};

const KIcon = ({ children }: { children: React.ReactNode }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7cf7"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const KIcons = {
  rooms: <KIcon><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" /><path d="M3 18h18" /><path d="M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></KIcon>,
  occ: <KIcon><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.7c2 .3 3.6 1.6 4.3 4.3" /></KIcon>,
  adr: <KIcon><path d="M17 7a6 6 0 1 0 0 10" /><path d="M5 10h9" /><path d="M5 14h9" /></KIcon>,
  rev: <KIcon><path d="M4 19l5-6 4 3 7-9" /><path d="M15 7h5v5" /></KIcon>,
};

const kiloK = (v: number) => (v >= 1000 ? `€${(v / 1000).toFixed(1)}K` : `€${Math.round(v)}`);

export function KpiRow({ briefing }: { briefing: Briefing }) {
  const y = briefing.data.yesterday;
  const dt = new Date(briefing.data.report_date + 'T00:00:00Z');
  const subtitle = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getUTCDay()]}, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]} ${dt.getUTCDate()} vs same day LY`;
  const kpis = [
    { icon: KIcons.rooms, label: 'ROOMS SOLD', value: String(y.roomNights), ly: String(y.roomNightsLY), v: varPct(y.roomNights, y.roomNightsLY) },
    { icon: KIcons.occ, label: 'OCCUPANCY', value: `${Math.round(y.occupancy * 100)}%`, ly: `${Math.round(y.occupancyLY * 100)}%`, v: varPct(y.occupancy, y.occupancyLY) },
    { icon: KIcons.adr, label: 'ADR', value: `€${Math.round(y.adr)}`, ly: `€${Math.round(y.adrLY)}`, v: varPct(y.adr, y.adrLY) },
    { icon: KIcons.rev, label: 'REVENUE', value: kiloK(y.revenue), ly: kiloK(y.revenueLY), v: varPct(y.revenue, y.revenueLY) },
  ];
  return (
    <div style={{ background: KC.panelBg, borderRadius: 20, padding: 16, marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: KC.ink }}>Yesterday</span>
        <span style={{ fontSize: 11, color: KC.sub, fontWeight: 600 }}>· {subtitle}</span>
        <InfoButton k="yday" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 16, padding: 13, boxShadow: '0 2px 8px rgba(15,40,96,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {k.icon}
              <span style={{ fontSize: 10, letterSpacing: '.08em', color: KC.sub, fontWeight: 800 }}>{k.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: KC.ink }}>{k.value}</span>
              <span style={{ fontSize: 12, color: KC.muted, fontWeight: 600 }}>vs {k.ly}</span>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 800, borderRadius: 99, padding: '1px 8px',
              display: 'inline-block', marginTop: 3,
              color: k.v >= 0 ? KC.up : KC.down, background: k.v >= 0 ? KC.upBg : KC.downBg,
            }}>{signedPct(k.v)} vs LY</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MtdStrip({ briefing }: { briefing: Briefing }) {
  const m = briefing.data.mtd;
  const dt = new Date(briefing.data.report_date + 'T00:00:00Z');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()];
  const revpar = m.adr * m.occupancy;
  const revparLY = m.adrLY * m.occupancyLY;
  const kpis = [
    { label: 'OCC', value: `${(m.occupancy * 100).toFixed(1)}%`, v: varPct(m.occupancy, m.occupancyLY) },
    { label: 'ADR', value: `€${Math.round(m.adr)}`, v: varPct(m.adr, m.adrLY) },
    { label: 'REVPAR', value: `€${Math.round(revpar)}`, v: varPct(revpar, revparLY) },
    { label: 'REVENUE', value: (m.revenue >= 1000 ? `€${Math.round(m.revenue / 1000)}K` : `€${Math.round(m.revenue)}`), v: varPct(m.revenue, m.revenueLY) },
  ];
  return (
    <div style={{ background: '#fff', border: `1px solid ${KC.border}`, borderRadius: 18, padding: '14px 0 16px', marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: KC.ink, padding: '0 14px 10px' }}>
        Month to date <span style={{ fontSize: 10, color: KC.sub, fontWeight: 600 }}>· {mon} 1–{dt.getUTCDate()} vs LY</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {kpis.map((k, i) => (
          <div key={k.label} style={{ padding: '0 12px', borderRight: i < kpis.length - 1 ? `1px solid ${KC.hairline}` : 'none' }}>
            <div style={{ fontSize: 9, letterSpacing: '.08em', color: KC.sub, fontWeight: 800 }}>{k.label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: KC.ink, marginTop: 3 }}>{k.value}</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: k.v >= 0 ? KC.up : KC.down }}>
              {k.v >= 0 ? '▲' : '▼'} {Math.abs(k.v).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
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
