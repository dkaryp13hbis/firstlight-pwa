/** Data layer. Reads through the FirstLight API (Phase A endpoints) with the
 *  per-hotel Bearer token. In dev without an API configured it falls back to
 *  the bundled fixture so components always have real-shaped data. */
import type { Briefing } from './types';
import type { WatchItem, WatchKind } from './lib/watch';
import fixture from './fixtures/briefing.json';
import { sb } from './lib/sb';

const API = import.meta.env.VITE_API_URL as string | undefined;
const TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined;

/** Read chain: FastAPI (Phase A endpoints) -> Supabase (current-app path)
 *  -> bundled fixture (demo). */
export async function fetchLatestBriefing(hotelId?: string): Promise<Briefing> {
  if (API && TOKEN && hotelId) {
    const r = await fetch(`${API}/briefing/latest?hotel_id=${hotelId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return (await r.json()) as Briefing;
  }
  if (sb && hotelId && hotelId !== 'demo') {
    const { data, error } = await sb.from('briefings')
      .select('report_date, generated_at, data, ai_insights')
      .eq('hotel_id', hotelId)
      .order('report_date', { ascending: false })
      .limit(1).single();
    if (error) throw new Error(error.message);
    return data as unknown as Briefing;
  }
  return fixture as unknown as Briefing;
}

/** One specific day's briefing (history view). Supabase path only — the
 *  Phase A API has no by-date endpoint yet. */
export async function fetchBriefingByDate(hotelId: string, date: string): Promise<Briefing | null> {
  if (sb && hotelId && hotelId !== 'demo') {
    const { data, error } = await sb.from('briefings')
      .select('report_date, generated_at, data, ai_insights')
      .eq('hotel_id', hotelId).eq('report_date', date)
      .order('generated_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return (data?.[0] as unknown as Briefing) ?? null;
  }
  return null;
}

/** Last N report dates for the hotel, newest first. */
export async function fetchDates(hotelId: string, days = 7): Promise<string[]> {
  if (sb && hotelId && hotelId !== 'demo') {
    const { data } = await sb.from('briefings')
      .select('report_date')
      .eq('hotel_id', hotelId)
      .order('report_date', { ascending: false }).limit(days);
    return [...new Set((data ?? []).map(r => r.report_date as string))];
  }
  return [];
}

export async function fetchHistory(hotelId?: string, days = 7): Promise<unknown> {
  if (API && TOKEN && hotelId) {
    const r = await fetch(`${API}/briefing/history?hotel_id=${hotelId}&days=${days}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  }
  if (sb && hotelId && hotelId !== 'demo') {
    const { data } = await sb.from('briefings')
      .select('report_date, kpi_summary')
      .eq('hotel_id', hotelId)
      .order('report_date', { ascending: false }).limit(days);
    return { history: data ?? [] };
  }
  return { history: [] };
}

/** The report date immediately before `before` (for "since yesterday"). */
export async function fetchPrevBriefing(hotelId: string, before: string): Promise<Briefing | null> {
  const ds = await fetchDates(hotelId, 3);
  const d = ds.find(x => x < before);
  return d ? fetchBriefingByDate(hotelId, d) : null;
}

/** Stored briefings for the given report dates (watchlist trend). Missing
 *  days are skipped; fixture mode has no history. */
export async function fetchHistoryRows(hotelId: string, dates: string[]): Promise<Briefing[]> {
  const rows = await Promise.all(dates.map(d => fetchBriefingByDate(hotelId, d).catch(() => null)));
  return rows.filter((r): r is Briefing => !!r);
}

export interface RefreshRun {
  started_at: string; completed_at: string | null;
  run_type: string; status: string; error_type: string | null; attempt: number | null;
}

/** Last 3 days of refresh history (Data health). null = not readable yet
 *  (RLS policy not applied) — the sheet then shows a hint instead. */
export async function fetchRuns(hotelId: string): Promise<RefreshRun[] | null> {
  if (!sb || hotelId === 'demo') return null;
  try {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data, error } = await sb.from('refresh_runs')
      .select('started_at,completed_at,run_type,status,error_type,attempt')
      .eq('hotel_id', hotelId).gte('started_at', since)
      .order('started_at', { ascending: false }).limit(25);
    if (error) return null;
    return (data ?? []) as RefreshRun[];
  } catch { return null; }
}

/* ── My Watchlist (Supabase `watchlist`, own rows; demo → localStorage) ── */
const DEMO_WATCH = 'fl_watch_demo';
/* fixture mode only (no Supabase): two sample watches until the user edits the list */
const DEMO_SEED: WatchItem[] = [
  { id: 'seed-oct', hotel_id: 'demo', kind: 'month', key: '2026-10', label: null },
  { id: 'seed-wed', hotel_id: 'demo', kind: 'range', key: '2026-09-22..2026-09-28', label: 'Wedding' },
];
const demoList = (): WatchItem[] => {
  try { const v = localStorage.getItem(DEMO_WATCH); return v ? JSON.parse(v) : DEMO_SEED; } catch { return DEMO_SEED; }
};
const saveDemo = (l: WatchItem[]) => { try { localStorage.setItem(DEMO_WATCH, JSON.stringify(l)); } catch { /* ignore */ } };
const WL_COLS = 'id, hotel_id, kind, key, label, note, created_at';

/** null = the table isn't there yet (SQL not pasted) → section hidden. */
export async function fetchWatchlist(hotelId: string): Promise<WatchItem[] | null> {
  if (!sb || hotelId === 'demo') return demoList().filter(w => w.hotel_id === hotelId);
  const { data, error } = await sb.from('watchlist').select(WL_COLS)
    .eq('hotel_id', hotelId).order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? []) as WatchItem[];
}

export async function addWatch(hotelId: string, kind: WatchKind, key: string, label: string | null)
  : Promise<{ ok: true; item: WatchItem } | { ok: false; msg: string }> {
  if (!sb || hotelId === 'demo') {
    const list = demoList();
    if (list.some(w => w.hotel_id === hotelId && w.kind === kind && w.key === key)) return { ok: false, msg: 'Already watching this' };
    const item: WatchItem = { id: `${Date.now()}`, hotel_id: hotelId, kind, key, label, created_at: new Date().toISOString() };
    saveDemo([...list, item]);
    return { ok: true, item };
  }
  const { data, error } = await sb.from('watchlist')
    .insert({ hotel_id: hotelId, kind, key, label: label || null }).select(WL_COLS).single();
  if (error) {
    const msg = error.code === '23505' ? 'Already watching this'
      : /watchlist/i.test(error.message) && /relation|schema cache|does not exist/i.test(error.message) ? 'Watchlist not available yet'
      : 'Could not save the watch';
    return { ok: false, msg };
  }
  return { ok: true, item: data as WatchItem };
}

export async function removeWatch(hotelId: string, id: string): Promise<boolean> {
  if (!sb || hotelId === 'demo') { saveDemo(demoList().filter(w => w.id !== id)); return true; }
  const { error } = await sb.from('watchlist').delete().eq('id', id);
  return !error;
}

/* formatting helpers — same conventions as the Python side */
export const euro = (v: number) => `€${Math.round(v).toLocaleString('de-DE')}`;
export const kilo = (v: number) => (v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${Math.round(v)}`);
export const pct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)}%`;
export const varPct = (ty: number, ly: number) => (ly ? ((ty - ly) / ly) * 100 : 0);
export const signedPct = (v: number, dec = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(dec)}%`;
