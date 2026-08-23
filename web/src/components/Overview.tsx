/** Overview modules — parity spec 2026-08-15: section headers with icon +
 *  info + Share pill, Yesterday 2x2 KPI grid with gradient top borders,
 *  MTD as 4 discrete cards, OTB months stacked full-width. */
import type { Briefing } from '../types';
import { euro, signedPct, varPct } from '../api';
import { InfoButton } from './Info';

export const ICONS: Record<string, React.ReactNode> = {
  sun: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  cal: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  trend: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  pace: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  star: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>,
  month: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M7 15h6" strokeWidth="2.4" /></svg>,
  euro: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M17.5 7a6.5 6.5 0 1 0 0 10" /><path d="M4 10.5h9M4 13.5h9" /></svg>,
  occ: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.7c2 .3 3.6 1.6 4.3 4.3" /></svg>,
  adr: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" fill="#2E7CF7" /></svg>,
  fly: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M8 7H2l3-3M2 7l3 3" /><path d="M16 17h6l-3-3M22 17l-3 3" /><path d="M11 5h9M4 19h9" /></svg>,
  speed: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M21 13A9 9 0 1 0 3 13" /><path d="M12 13l4.5-4.5" /><path d="M3 13h2M19 13h2M5.6 6.6 7 8M18.4 6.6 17 8" /></svg>,
  heat: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" fill="#2E7CF7" fillOpacity=".35" /></svg>,
  bridge: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><path d="M4 20V10M12 20V4M20 20v-8" /><path d="M2 20h20" /></svg>,
  sources: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" /></svg>,
};

/* grey secondary text inside a SectionLabel title */
export const LabelSub = ({ children }: { children: React.ReactNode }) =>
  <span style={{ fontSize: 11, color: '#6E7A96', fontWeight: 600 }}>{children}</span>;

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

export function KpiRow({ briefing }: { briefing: Briefing }) {
  const y = briefing.data.yesterday;
  const dt = new Date(briefing.report_date + 'T00:00:00Z');
  const subtitle = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getUTCDay()]}, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]} ${dt.getUTCDate()} vs same day LY`;
  const kpis = [
    { icon: KIcons.rev, label: 'REVENUE', value: euro(y.revenue), ly: euro(y.revenueLY), v: varPct(y.revenue, y.revenueLY) },
    { icon: KIcons.occ, label: 'OCCUPANCY', value: `${Math.round(y.occupancy * 100)}%`, ly: `${Math.round(y.occupancyLY * 100)}%`, v: varPct(y.occupancy, y.occupancyLY) },
    { icon: KIcons.adr, label: 'ADR', value: `€${Math.round(y.adr)}`, ly: `€${Math.round(y.adrLY)}`, v: varPct(y.adr, y.adrLY) },
    { icon: KIcons.rooms, label: 'ROOM NIGHTS', value: String(y.roomNights), ly: String(y.roomNightsLY), v: varPct(y.roomNights, y.roomNightsLY) },
  ];
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel icon="sun" info="yday" title="Yesterday">
        Yesterday <LabelSub>· {subtitle}</LabelSub>
      </SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(15,40,96,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {k.icon}
              <span style={{ fontSize: 11, letterSpacing: '.08em', color: KC.sub, fontWeight: 800 }}>{k.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 29, fontWeight: 800, color: KC.ink }}>{k.value}</span>
              <span style={{ fontSize: 13, color: KC.muted, fontWeight: 600 }}>vs</span>
              <span style={{ fontSize: 13, color: KC.muted, fontWeight: 600 }}>{k.ly}</span>
            </div>
            <div style={{
              fontSize: 12.5, fontWeight: 800, borderRadius: 99, padding: '2px 10px',
              display: 'inline-block', marginTop: 5,
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
  const dt = new Date(briefing.report_date + 'T00:00:00Z');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()];
  const kpis = [
    { label: 'REVENUE', value: euro(m.revenue), v: varPct(m.revenue, m.revenueLY) },
    { label: 'OCC', value: `${(m.occupancy * 100).toFixed(1)}%`, v: varPct(m.occupancy, m.occupancyLY) },
    { label: 'ADR', value: `€${Math.round(m.adr)}`, v: varPct(m.adr, m.adrLY) },
    { label: 'ROOM NIGHTS', value: String(m.roomNights), v: varPct(m.roomNights, m.roomNightsLY) },
  ];
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel icon="month" title="Month to Date">
        Month to Date <LabelSub>· {mon} 1–{dt.getUTCDate()} vs LY</LabelSub>
      </SectionLabel>
      <div style={{ background: '#fff', border: `1px solid ${KC.border}`, borderRadius: 18, padding: '14px 0 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 0.92fr 0.78fr 1.18fr' }}>
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
    </div>
  );
}

export function OtbCards({ briefing, year, nextPace }: { briefing: Briefing; year: 'this' | 'next'; nextPace: import('../types').PaceMonth[] }) {
  const nextWithData = nextPace.filter(m => m.rn > 0 || m.rn_stly > 0);
  const months = year === 'this'
    ? (briefing.data.pace_current ?? [])
    : (nextWithData.length ? nextWithData : nextPace).slice(0, 3);
  if (!months.length) return null;
  const MC = { up: '#1a7a50', upBg: 'rgba(26,122,80,.12)', down: '#c7411b', downBg: 'rgba(199,65,27,.12)', zebra: '#f6f8fc' };
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: `1.1fr repeat(${months.length}, 1fr)`, gap: 0 };
  const Cell = ({ value, v }: { value: string; v: number }) => (
    <span style={{ textAlign: 'center', borderLeft: '2px solid #fff', padding: '0 4px' }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: KC.ink, whiteSpace: 'nowrap' }}>{value}</span>
      <br />
      <span style={{
        fontSize: 9.5, fontWeight: 800, borderRadius: 99, padding: '1px 6px', whiteSpace: 'nowrap',
        color: v >= 0 ? MC.up : MC.down, background: v >= 0 ? MC.upBg : MC.downBg,
      }}>{v >= 0 ? '▲' : '▼'}{Math.abs(v).toFixed(1)}%</span>
    </span>
  );
  const rows = [
    { icon: KIcons.rev, label: 'Revenue', cells: months.map(p => ({ value: euro(p.rev), v: varPct(p.rev, p.rev_stly) })) },
    { icon: KIcons.occ, label: 'Occupancy', cells: months.map(p => ({ value: `${Math.round(p.occ * 100)}%`, v: varPct(p.occ, p.stly) })) },
    { icon: KIcons.adr, label: 'ADR', cells: months.map(p => ({ value: `€${Math.round(p.adr)}`, v: varPct(p.adr, p.adr_stly) })) },
  ];
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel icon="cal" info="otb3" title="On The Books">
        On The Books — {year === 'this' ? 'Next 3 Months' : String(new Date().getFullYear() + 1)} <LabelSub>· vs STLY</LabelSub>
      </SectionLabel>
      <div style={{ background: '#fff', border: `1px solid ${KC.border}`, borderRadius: 20, padding: 16 }}>
      <div style={{ ...grid, padding: '0 0 6px' }}>
        <span />
        {months.map(p => (
          <span key={p.month} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#2e7cf7', letterSpacing: '.06em', padding: '0 4px' }}>
            {p.month.toUpperCase()}
          </span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          ...grid, padding: '10px 0', alignItems: 'center',
          background: MC.zebra, borderRadius: i === 0 ? '12px 12px 0 0' : i === 2 ? '0 0 12px 12px' : 0,
          borderTop: i > 0 ? '2px solid #fff' : 'none',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
            {row.icon}
            <span style={{ fontSize: 11, fontWeight: 800, color: KC.ink }}>{row.label}</span>
          </span>
          {row.cells.map((c, j) => <Cell key={j} {...c} />)}
        </div>
      ))}
    </div>
    </div>
  );
}
