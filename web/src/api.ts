/** Data layer. Reads through the FirstLight API (Phase A endpoints) with the
 *  per-hotel Bearer token. In dev without an API configured it falls back to
 *  the bundled fixture so components always have real-shaped data. */
import type { Briefing } from './types';
import type { WatchItem, WatchKind } from './lib/watch';
import fixture from './fixtures/briefing.json';
import { sb } from './lib/sb';

/* Production API base is a public URL — hardcoded fallback so the portal
   works without a Pages env var (override with VITE_API_URL for dev). */
const API = (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'https://web-cloudflare.up.railway.app';
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

/* ── Admin (superadmin only; served by the Railway API with service role) ── */
export interface AdminUserUsage {
  user_id: string; email: string; events_30d: number; opens_30d: number;
  days_active: number; last_seen: string | null; top: [string, number][];
}
export interface AdminUsage {
  since: string;
  hotels: { hotel_id: string; name: string; events_30d: number; users: AdminUserUsage[] }[];
}

export async function sessionEmail(): Promise<string | null> {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.email?.toLowerCase() ?? null;
}

export interface AdminClient {
  hotel_id: string; name: string; events_30d: number; users: AdminUserUsage[];
  subscription: { plan: string; status: string; price_eur: number | null;
    started_on: string | null; renews_on: string | null; notes: string | null } | null;
}
export interface AdminClients extends AdminUsage { hotels: AdminClient[]; subs_ready: boolean }

async function adminGet<T>(path: string): Promise<T | null> {
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return null;
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return null;
    return await r.json() as T;
  } catch { return null; }
}

export const fetchAdminClients = () => adminGet<AdminClients>('/admin/clients');

async function adminPost<T>(path: string, body?: unknown): Promise<T | null> {
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return null;
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return await r.json() as T;
  } catch { return null; }
}

/* portal sections (ADMIN_PLAN §2/§6/§7/§10) */
export interface AdminHotel {
  id: string; name: string; active: boolean; total_rooms: number | null;
  pms_type: string; fetch_mode: string | null; tunnel_hostname: string | null;
  credentials_present: boolean; token_present: boolean; last_briefing: string | null;
  runs_30d: number; ok_30d: number; degraded_30d: number; failed_30d: number;
  cost_30d_usd: number; last_run_at: string | null; last_status: string | null;
}
export interface AdminRun {
  started_at: string; completed_at: string | null; run_type: string; status: string;
  error_type: string | null; attempt: number | null;
  rows_fetched: number | Record<string, number> | null;   // per-query breakdown on newer runs
  estimated_cost_usd: number | null; fetch_path: string | null; fallbacks: number;
}
export interface AdminHealth {
  verdict: string[] | { error: string };
  matrix: { day: string; run_type: string; status: string; n: number }[];
  ai: { card_id: string; n: number; fallbacks: number }[];
  infra: { db_size_mb: number | null; storage_mode: string; build: string };
}
export interface AdminFeedbackRow {
  hotel: string; hotel_id: string; report_date: string; card_id: string;
  verdict: number; note: string | null; created_at: string;
}
export interface AdminAuditRow {
  id: number; at: string; admin_email: string; action: string;
  target_type: string | null; target_id: string | null; reason: string | null;
}

export const fetchAdminHotels = () => adminGet<{ hotels: AdminHotel[] }>('/admin/hotels');
export const fetchAdminHotelRuns = (id: string) => adminGet<{ runs: AdminRun[] }>(`/admin/hotels/${id}/runs`);
export const adminHotelRefresh = (id: string) => adminPost<{ queued: boolean }>(`/admin/hotels/${id}/refresh`);
export const adminHotelToken = (id: string) => adminPost<{ api_token: string }>(`/admin/hotels/${id}/token/rotate`);
export const adminHotelActive = (id: string, active: boolean, reason: string) =>
  adminPost<{ active: boolean }>(`/admin/hotels/${id}/active`, { active, reason });
export const fetchAdminHealth = () => adminGet<AdminHealth>('/admin/health');
export const fetchAdminFeedback = () => adminGet<{ rows: AdminFeedbackRow[] }>('/admin/feedback');
export const fetchAdminAudit = () => adminGet<{ rows: AdminAuditRow[] }>('/admin/audit');

export interface AdminFinance {
  daily: { day: string; cost_usd: number; input_tokens: number; output_tokens: number; rows: number }[];
  cost: { this_month_usd: number; last_30d_usd: number };
  revenue: {
    mrr_eur: number; arr_eur: number; active_clients: number;
    by_plan: Record<string, { clients: number; mrr: number }>;
    lines: { hotel_id: string; name: string; plan: string | null; status: string | null;
      price_eur: number | null; started_on: string | null; renews_on: string | null }[];
  };
}
export const fetchAdminFinance = () => adminGet<AdminFinance>('/admin/finance');

export interface AdminGroup { id: string; name: string; companies: number }
export const fetchAdminGroups = () => adminGet<{ groups: AdminGroup[] }>('/admin/groups');
export async function saveGroup(name: string): Promise<{ id: string } | null> {
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return null;
    const r = await fetch(`${API}/admin/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) return null;
    return await r.json() as { id: string };
  } catch { return null; }
}

export interface AdminCompany {
  id: string; name: string; legal_name: string | null; vat_number: string | null;
  country: string; contact_name: string | null; contact_phone: string | null;
  group_id: string | null; group_name: string | null;
  contract: { status: string | null; start_date: string | null;
    monthly_eur: number | null; annual_eur: number | null;
    billing_anchor: string | null; notes: string | null } | null;
  hotels: AdminClient[];
  users_n: number; events_30d: number; last_seen: string | null;
}
export const fetchAdminCompanies = () =>
  adminGet<{ companies: AdminCompany[]; since: string }>('/admin/companies');

export async function saveCompany(body: Record<string, unknown>): Promise<{ ok: boolean; error: string }> {
  if (!sb) return { ok: false, error: 'no session' };
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return { ok: false, error: 'no session' };
    const r = await fetch(`${API}/admin/companies`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) return { ok: true, error: '' };
    const detail = (await r.json().catch(() => null)) as { detail?: string } | null;
    return { ok: false, error: detail?.detail ?? `save failed (${r.status})` };
  } catch { return { ok: false, error: 'network error' }; }
}

export async function saveSubscription(hotelId: string, sub: Record<string, unknown>): Promise<boolean> {
  if (!sb) return false;
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return false;
    const r = await fetch(`${API}/admin/subscription/${hotelId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    return r.ok;
  } catch { return false; }
}

export async function fetchAdminUsage(): Promise<AdminUsage | null> {
  if (!sb || !API) return null;
  try {
    const { data } = await sb.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) return null;
    const r = await fetch(`${API}/admin/usage`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return null;
    return await r.json() as AdminUsage;
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
/* follow-up engine columns (2026-09-10) — fetch falls back to WL_COLS until
   the SQL is pasted, so the watchlist never disappears on a missing column */
const WL_COLS_FL = WL_COLS + ', source, flagged_date, first_gap, last_gap';

/** null = the table isn't there yet (SQL not pasted) → section hidden. */
export async function fetchWatchlist(hotelId: string): Promise<WatchItem[] | null> {
  if (!sb || hotelId === 'demo') return demoList().filter(w => w.hotel_id === hotelId);
  let res: { data: unknown; error: unknown } = await sb.from('watchlist').select(WL_COLS_FL)
    .eq('hotel_id', hotelId).order('created_at', { ascending: true });
  if (res.error) {
    res = await sb.from('watchlist').select(WL_COLS)
      .eq('hotel_id', hotelId).order('created_at', { ascending: true });
  }
  if (res.error) return null;
  return ((res.data ?? []) as WatchItem[]);
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
