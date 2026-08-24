/** My Watchlist — deterministic one-line updates for items the GM pins
 *  (a stay month or a date range). Pure functions over the briefing payload
 *  plus the PREVIOUS report date's row for "since yesterday". Slots only:
 *  no Claude, no derived euro figures, plain words (rooms booked, same time
 *  last year). Spec: hotel-morning-briefing/docs/WATCHLIST_SPEC.md */
import type { Briefing, PaceMonth } from '../types';
import { monthSpeed, lastRefDate } from './speed';

/* Gate (same pattern as usage tracking): null = everyone (opened 2026-08-24 for
   Pome + Potidea); set to ['demo@hbis.io'] to restrict again. */
export const WATCHLIST_EMAILS: string[] | null = null;
export const WATCH_CAP = 5;
export const RANGE_HORIZON_DAYS = 90;

export type WatchKind = 'month' | 'range';
export interface WatchItem {
  id: string; hotel_id: string; kind: WatchKind; key: string;
  label?: string | null; note?: string | null; created_at?: string;
}

export type WatchStatus = 'new' | 'improving' | 'worsening' | 'steady' | 'passed' | 'closed' | 'pending';
/** A text segment: plain, {b} bold, {m} muted. */
export type Seg = string | { b: string } | { m: string };
export interface WatchLine {
  item: WatchItem;
  title: string;            // "OCTOBER" · "SEP 22 – 28"
  status: WatchStatus;
  lines: Seg[][];
  monthNum?: number;        // for tap → scroll to the month
}

export const STATUS_LABEL: Record<WatchStatus, string> = {
  new: 'First day watching', improving: 'Improving ▲', worsening: 'Getting worse ▼',
  steady: 'Steady —', passed: '✓ Passed last year', closed: 'Closed', pending: 'Not in view yet',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
export const rangeKey = (from: string, to: string) => `${from}..${to}`;
export const isoAdd = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const utc = (iso: string) => new Date(iso + 'T00:00:00Z');
const n = (v: number) => Math.round(v).toLocaleString('en-US');
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${n(Math.abs(v))}`;
const pctGap = (rn: number, ref: number) => (ref > 0 ? ((rn - ref) / ref) * 100 : null);
const dayLabel = (iso: string) => { const d = utc(iso); return `${WD[d.getUTCDay()]} ${d.getUTCDate()}`; };

export function rangeTitle(from: string, to: string): string {
  const a = utc(from), b = utc(to);
  if (from === to) return `${MON[a.getUTCMonth()]} ${a.getUTCDate()}`.toUpperCase();
  return (a.getUTCMonth() === b.getUTCMonth()
    ? `${MON[a.getUTCMonth()]} ${a.getUTCDate()} – ${b.getUTCDate()}`
    : `${MON[a.getUTCMonth()]} ${a.getUTCDate()} – ${MON[b.getUTCMonth()]} ${b.getUTCDate()}`).toUpperCase();
}

export function itemTitle(item: WatchItem, reportDate: string): string {
  if (item.kind === 'month') {
    const [y, m] = item.key.split('-').map(Number);
    return MONTHS[m - 1].toUpperCase() + (y !== Number(reportDate.slice(0, 4)) ? ` ${y}` : '');
  }
  const [from, to] = item.key.split('..');
  return rangeTitle(from, to);
}

/* ── month ─────────────────────────────────────────────────────────────── */

function monthLine(item: WatchItem, b: Briefing, prev: Briefing | null): WatchLine {
  const [y, m] = item.key.split('-').map(Number);
  const rd = b.report_date;
  const ry = Number(rd.slice(0, 4)), rm = Number(rd.slice(5, 7));
  const title = itemTitle(item, rd);
  const find = (br: Briefing | null): PaceMonth | undefined =>
    br && y === Number(br.report_date.slice(0, 4)) ? br.data.pace.find(p => p.month_num === m) : undefined;
  const p = find(b);

  if (y * 100 + m < ry * 100 + rm) {                       // month closed
    if (!p) return { item, title, status: 'closed', monthNum: m, lines: [[{ m: 'Month closed — shown once, then removed' }]] };
    const gap = pctGap(p.rn, p.rn_final_ly);
    const l1: Seg[] = ['Finished at ', { b: n(p.rn) }, ' rooms'];
    if (gap != null) l1.push(' · ', { b: `${Math.abs(Math.round(gap))}%` }, gap >= 0 ? ' above' : ' below', " last year's ", { b: n(p.rn_final_ly) });
    return { item, title, status: 'closed', monthNum: m, lines: [l1, [{ m: 'Shown once, then removed' }]] };
  }
  if (!p) return { item, title, status: 'pending', monthNum: m, lines: [[{ m: "This month isn't in the briefing yet" }]] };

  const gap = pctGap(p.rn, p.rn_stly);
  const pp = find(prev);
  const gapPrev = pp ? pctGap(pp.rn, pp.rn_stly) : null;
  const daily = b.data.pickup_daily ?? [];
  const end = lastRefDate(daily);
  const inMonth = (r: { stay_month: number; stay_year: number }) => r.stay_month === m && r.stay_year === y;
  const c7 = end ? isoAdd(end, -6) : null;
  const net1 = end ? daily.filter(r => inMonth(r) && r.ref_date === end).reduce((s, r) => s + r.net_rn, 0) : null;
  const net7 = c7 ? daily.filter(r => inMonth(r) && r.ref_date >= c7).reduce((s, r) => s + r.net_rn, 0) : null;
  const cancel7 = c7 ? (b.data.cancel_daily ?? []).filter(r => inMonth(r) && r.ref_date >= c7).reduce((s, r) => s + r.cancel_rn, 0) : null;
  const sp = monthSpeed(p, daily);

  let status: WatchStatus = 'new';
  if (sp?.passed) status = 'passed';
  else if (gap != null && gapPrev != null) {
    const d = gap - gapPrev;
    status = d >= 1 ? 'improving' : d <= -1 ? 'worsening' : 'steady';
  }

  const l1: Seg[] = [{ b: n(p.rn) }, ' rooms booked'];
  if (gap != null) {
    l1.push(' · ', { b: `${Math.abs(Math.round(gap))}%` }, gap >= 0 ? ' ahead of' : ' behind', ' same time last year');
    if (gapPrev != null && status !== 'new')
      l1.push({ m: ` (was ${Math.abs(Math.round(gapPrev))}% ${gapPrev >= 0 ? 'ahead' : 'behind'} yesterday)` });
  } else l1.push({ m: ' · nothing booked at this point last year' });

  const lines: Seg[][] = [l1];
  if (net1 != null && net7 != null)
    lines.push([{ b: signed(net1) }, ' rooms since yesterday · ', { b: signed(net7) }, ' last 7 days · ', { b: n(cancel7 ?? 0) }, ' cancelled']);
  if (sp) {
    const l3: Seg[] = ['Speed ', { b: sp.s7.toFixed(1) }, '/day'];
    if (sp.passed) l3.push(' · ', { b: `✓ passed last year's final (+${n(sp.over)} rooms)` });
    else if (sp.hasRef) {
      const need = sp.needed.toFixed(1);
      if (sp.s7 >= sp.needed) l3.push(' · ', { b: `✓ above the ${need}/day needed` }, " to reach last year's final");
      else l3.push(' · need ', { b: need }, "/day to reach last year's final");
      l3.push({ m: ` (${sp.daysLeft} days left)` });
    } else l3.push({ m: ' · no last-year final to compare' });
    lines.push(l3);
  }
  return { item, title, status, monthNum: m, lines };
}

/* ── date range ────────────────────────────────────────────────────────── */

function rangeLine(item: WatchItem, b: Briefing, prev: Briefing | null): WatchLine {
  const [from, to] = item.key.split('..');
  const rd = b.report_date;
  const title = itemTitle(item, rd) + (item.label ? '' : '');
  const rooms = b.data.total_rooms || 0;
  const monthNum = utc(from).getUTCMonth() + 1;
  if (to < rd) return { item, title, status: 'closed', monthNum, lines: [[{ m: 'Dates have passed — shown once, then removed' }]] };

  const inRange = (d: string) => d >= from && d <= to;
  const rows = (b.data.otb_by_date ?? []).filter(r => inRange(r.stay_date));
  if (!rows.length || !rooms)
    return { item, title, status: 'pending', monthNum, lines: [[{ m: `Beyond the ${RANGE_HORIZON_DAYS}-day window — updates start as the dates come into view` }]] };

  const totalDays = Math.round((utc(to).getTime() - utc(from).getTime()) / 86400000) + 1;
  const days = rows.length;
  const rn = rows.reduce((s, r) => s + r.rn_ty, 0);
  const rnLy = rows.reduce((s, r) => s + r.rn_stly, 0);
  const occ = (rn / (rooms * days)) * 100;
  const occLy = (rnLy / (rooms * days)) * 100;

  const dates = new Set(rows.map(r => r.stay_date));
  const prevRows = (prev?.data.otb_by_date ?? []).filter(r => dates.has(r.stay_date));
  const havePrev = prevRows.length === days;
  const rnPrev = havePrev ? prevRows.reduce((s, r) => s + r.rn_ty, 0) : null;
  const occPrev = rnPrev != null ? (rnPrev / (rooms * days)) * 100 : null;

  let status: WatchStatus = 'new';
  if (occPrev != null) {
    const d = occ - occPrev;
    status = d >= 2 ? 'improving' : d <= -2 ? 'worsening' : 'steady';
  }

  const l1: Seg[] = [{ b: `${Math.round(occ)}%` }, ' booked vs ', { b: `${Math.round(occLy)}%` }, ' same time last year · ', { b: n(rn) }, ' rooms'];
  if (occPrev != null && status !== 'new') l1.push({ m: ` (was ${Math.round(occPrev)}% yesterday)` });
  if (days < totalDays) l1.push({ m: ` · ${days} of ${totalDays} dates in view` });

  const l2: Seg[] = [];
  if (rnPrev != null) l2.push({ b: signed(rn - rnPrev) }, ' rooms since yesterday');
  if (days > 1) {
    const low = rows.reduce((a, r) => (r.rn_ty < a.rn_ty ? r : a));
    if (l2.length) l2.push(' · ');
    l2.push('lowest date ', { b: dayLabel(low.stay_date) }, ` (${Math.round((low.rn_ty / rooms) * 100)}%)`);
  }
  const lines = l2.length ? [l1, l2] : [l1];
  return { item, title, status, monthNum, lines };
}

export function computeWatchLine(item: WatchItem, b: Briefing, prev: Briefing | null): WatchLine {
  return item.kind === 'month' ? monthLine(item, b, prev) : rangeLine(item, b, prev);
}

/* ── helpers for the add sheet ─────────────────────────────────────────── */

/** Open months of the reporting year, with their current gap vs same time LY. */
export function watchableMonths(b: Briefing): { key: string; label: string; monthNum: number; gap: number | null }[] {
  const ry = Number(b.report_date.slice(0, 4)), rm = Number(b.report_date.slice(5, 7));
  return b.data.pace
    .filter(p => p.month_num >= rm && (p.rn > 0 || p.rn_stly > 0))
    .map(p => ({ key: monthKey(ry, p.month_num), label: p.month, monthNum: p.month_num, gap: pctGap(p.rn, p.rn_stly) }));
}

/** Next Fri–Sun on or after the report date. */
export function weekendPreset(reportDate: string): { from: string; to: string } {
  const d = utc(reportDate);
  const toFri = (5 - d.getUTCDay() + 7) % 7;
  const from = isoAdd(reportDate, toFri);
  return { from, to: isoAdd(from, 2) };
}

/** Contiguous runs of soft dates (heatmap rule: occ < 50% of LY when LY ≥ 30%). */
export function softRuns(b: Briefing, max = 2): { from: string; to: string }[] {
  const rooms = b.data.total_rooms || 0;
  if (!rooms) return [];
  const soft = (b.data.otb_by_date ?? []).slice(0, 60)
    .filter(r => r.rn_stly / rooms >= 0.3 && r.rn_ty < 0.5 * r.rn_stly)
    .map(r => r.stay_date);
  const runs: { from: string; to: string }[] = [];
  for (const d of soft) {
    const last = runs[runs.length - 1];
    if (last && isoAdd(last.to, 1) === d) last.to = d;
    else runs.push({ from: d, to: d });
  }
  return runs.slice(0, max);
}

/** Month key from an AI card id such as "pace_oct_2026" / "pickup_sep_2026". */
export function monthKeyFromCardId(id: string | undefined): string | null {
  const m = /_(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)_(\d{4})$/i.exec(id ?? '');
  if (!m) return null;
  return monthKey(Number(m[2]), MON.findIndex(x => x.toLowerCase() === m[1].toLowerCase()) + 1);
}
