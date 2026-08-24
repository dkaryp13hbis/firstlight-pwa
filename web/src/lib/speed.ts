/** Booking speed — ONE implementation shared by the Booking Speed chart and
 *  the Watchlist, so the two can never disagree. Mirrors briefing/charts.py
 *  `_velocity`: net rooms/day over the last 7 and 14 booking dates for a stay
 *  month, and the rooms/day still needed to reach last year's final. */
import type { PaceMonth, PickupDailyRow } from '../types';

export interface SpeedRow {
  s7: number;            // net rooms/day, last 7 booking dates
  s14: number;           // net rooms/day, last 14 booking dates
  trend: 'slowing down' | 'speeding up' | 'steady';
  hasRef: boolean;       // last year's final exists to compare against
  needed: number;        // rooms/day to reach LY final by month end (0 if passed / no ref)
  passed: boolean;       // booked >= LY final
  over: number;          // rooms above LY final when passed
  daysLeft: number;      // to month end, from the last booking date in the data
}

/** Latest booking date in the daily rows (the "yesterday" of the payload). */
export function lastRefDate(daily: PickupDailyRow[]): string | null {
  if (!daily.length) return null;
  return daily.reduce((m, r) => (r.ref_date > m ? r.ref_date : m), daily[0].ref_date);
}

export function monthSpeed(m: PaceMonth, daily: PickupDailyRow[]): SpeedRow | null {
  const end = lastRefDate(daily);
  if (!end) return null;
  const endD = new Date(end + 'T00:00:00Z');
  const cut = (days: number) => new Date(endD.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const c7 = cut(7), c14 = cut(14);
  const year = endD.getUTCFullYear();
  const rn = (lo: string) => daily
    .filter(r => r.stay_month === m.month_num && r.stay_year >= year && r.ref_date >= lo && r.ref_date <= end)
    .reduce((s, r) => s + r.net_rn, 0);
  const monthEnd = new Date(Date.UTC(year, m.month_num, 0));
  const daysLeft = Math.max(1, Math.round((monthEnd.getTime() - endD.getTime()) / 86400000));
  const remaining = m.rn_final_ly - m.rn;
  const s7 = rn(c7) / 7, s14 = rn(c14) / 14;
  return {
    s7, s14,
    trend: s7 < s14 * 0.85 ? 'slowing down' : s7 > s14 * 1.15 ? 'speeding up' : 'steady',
    hasRef: m.rn_final_ly > 0,
    needed: remaining > 0 ? remaining / daysLeft : 0,
    passed: m.rn_final_ly > 0 && remaining <= 0,
    over: -remaining,
    daysLeft,
  };
}
