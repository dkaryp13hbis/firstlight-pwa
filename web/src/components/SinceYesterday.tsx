/** "Since Yesterday" — advisor proposal §2 (approved 2026-09-10, built same
 *  week). The first white card under the Morning Brief: what moved between
 *  yesterday's briefing and today's, max 3 lines. Every line attaches
 *  movement to a story (a month, a watched window, cancellations) — it never
 *  restates a bare pickup quantity. Pure deterministic diff of two stored
 *  briefings; no AI, no derived-euro estimates (deltas of real OTB figures).
 *  Hidden when viewing a past day or when there is no previous briefing. */
import type { Briefing, PaceMonth } from '../types';
import type { WatchItem } from '../lib/watch';
import { itemTitle } from '../lib/watch';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface Line { tone: 'up' | 'down' | 'ok'; html: React.ReactNode; rank: number }

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const kEuro = (v: number) => {
  const a = Math.abs(v);
  return a >= 10000 ? `€${(a / 1000).toFixed(1)}K` : `€${n(a)}`;
};
const B = (p: { children: React.ReactNode }) =>
  <b style={{ color: '#0f1b34', fontWeight: 700 }}>{p.children}</b>;
const Up = (p: { children: React.ReactNode }) =>
  <b style={{ color: '#1A7A50', fontWeight: 700 }}>{p.children}</b>;
const Dn = (p: { children: React.ReactNode }) =>
  <b style={{ color: '#B0433A', fontWeight: 700 }}>{p.children}</b>;

/** Days between two ISO dates. */
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);

export function SinceYesterday({ briefing, prev, watch, net }: {
  briefing: Briefing; prev: Briefing | null;
  watch: WatchItem[] | null;
  net: boolean;   // net revenue mode: lead with rooms, omit gross € figures
}) {
  if (!prev) return null;
  const gap = daysBetween(prev.report_date, briefing.report_date);
  if (gap < 1 || gap > 3) return null;   // stale comparison is worse than none
  const sameYear = prev.report_date.slice(0, 4) === briefing.report_date.slice(0, 4);
  if (!sameYear) return null;

  const lines: Line[] = [];
  const sinceLabel = gap === 1 ? 'since yesterday' : `since ${(() => {
    const d = new Date(prev.report_date + 'T00:00:00Z');
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()}`;
  })()}`;

  /* 1 ── biggest month move (rooms + real € delta of two real OTB figures) */
  const curM = Number(briefing.report_date.slice(5, 7));
  let best: { p: PaceMonth; pp: PaceMonth; drn: number; drev: number } | null = null;
  for (const p of briefing.data.pace ?? []) {
    if (p.month_num < curM) continue;                    // open months only
    const pp = prev.data.pace?.find(x => x.month_num === p.month_num);
    if (!pp) continue;
    const drn = p.rn - pp.rn, drev = p.rev - pp.rev;
    if (Math.abs(drn) < 3 && Math.abs(drev) < 1500) continue;   // materiality floor
    if (!best || Math.abs(drn) > Math.abs(best.drn)) best = { p, pp, drn, drev };
  }
  if (best) {
    const name = MONTHS[best.p.month_num - 1];
    const upB = best.drn >= 0;
    lines.push({
      tone: upB ? 'up' : 'down',
      rank: 2 + Math.min(Math.abs(best.drn) / 20, 1),
      html: <>
        <B>{name}</B> {upB ? 'improved' : 'gave back'}{' '}
        {!net && Math.abs(best.drev) >= 500
          ? <>{upB ? <Up>+{kEuro(best.drev)}</Up> : <Dn>−{kEuro(best.drev)}</Dn>} </>
          : null}
        ({upB ? <Up>+{n(best.drn)}</Up> : <Dn>−{n(Math.abs(best.drn))}</Dn>} room nights) {sinceLabel}.
      </>,
    });
  }

  /* 2 ── watched windows that moved (the follow-up hook: watch items only) */
  const rooms = briefing.data.total_rooms || 0;
  for (const item of watch ?? []) {
    if (item.kind !== 'range') continue;
    const [from, to] = item.key.split('..');
    if (to <= briefing.report_date) continue;
    const cur = (briefing.data.otb_by_date ?? []).filter(r => r.stay_date >= from && r.stay_date <= to);
    if (!cur.length) continue;
    const dates = new Set(cur.map(r => r.stay_date));
    const prv = (prev.data.otb_by_date ?? []).filter(r => dates.has(r.stay_date));
    if (prv.length !== cur.length) continue;
    const d = cur.reduce((s, r) => s + r.rn_ty, 0) - prv.reduce((s, r) => s + r.rn_ty, 0);
    const tol = Math.max(2, Math.round(rooms * cur.length * 0.005));
    if (Math.abs(d) < tol) continue;
    const title = itemTitle(item, briefing.report_date);
    lines.push({
      tone: d >= 0 ? 'up' : 'down',
      rank: d < 0 ? 3.5 : 1.5,          // a weakening watched window outranks everything
      html: d >= 0
        ? <><B>{title}</B> strengthened — <Up>+{n(d)}</Up> rooms {sinceLabel}.</>
        : <><B>{title}</B> weakened — <Dn>−{n(Math.abs(d))}</Dn> rooms {sinceLabel}.</>,
    });
  }

  /* 3 ── cancellations vs the hotel's own recent norm */
  const cd = briefing.data.cancel_daily ?? [];
  if (cd.length) {
    const end = cd.reduce((m, r) => (r.ref_date > m ? r.ref_date : m), cd[0].ref_date);
    const last = cd.filter(r => r.ref_date === end).reduce((s, r) => s + (r.cancel_rn || 0), 0);
    const trail = cd.filter(r => r.ref_date < end);
    const days = new Set(trail.map(r => r.ref_date)).size;
    const avg = days ? trail.reduce((s, r) => s + (r.cancel_rn || 0), 0) / days : 0;
    if (last >= Math.max(4, 2 * avg) && avg >= 0) {
      lines.push({
        tone: 'down', rank: 3,
        html: <><B>Cancellations</B> jumped — <Dn>{n(last)}</Dn> rooms out yesterday vs a typical {n(avg)}.</>,
      });
    } else if (avg >= 2 && last <= avg * 0.75) {
      lines.push({
        tone: 'ok', rank: 1,
        html: <><B>Cancellations</B> back to normal — {n(last)} yesterday, in line with a typical day.</>,
      });
    }
  }

  const top = lines.sort((a, b) => b.rank - a.rank).slice(0, 3);

  return (
    <div style={{ margin: '0 0 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700,
        color: '#0F2860', margin: '0 0 10px', letterSpacing: '-.01em',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7CF7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity=".85">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /><path d="M12 3v0" />
        </svg>
        Since yesterday
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {top.length ? top.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
            borderBottom: i < top.length - 1 ? '1px solid #E2E7F0' : 'none',
          }}>
            <span style={{
              fontSize: 15, fontWeight: 800, lineHeight: '20px', flexShrink: 0,
              color: l.tone === 'up' ? '#1A7A50' : l.tone === 'down' ? '#B0433A' : '#1A7A50',
            }}>{l.tone === 'up' ? '▲' : l.tone === 'down' ? '▼' : '✓'}</span>
            <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, color: '#3D4A66', fontWeight: 600 }}>
              {l.html}
            </span>
          </div>
        )) : (
          <div style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>
            Quiet overnight — nothing meaningful moved.
          </div>
        )}
      </div>
    </div>
  );
}
