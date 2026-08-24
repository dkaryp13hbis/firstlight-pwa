/** Data layer. Reads through the FirstLight API (Phase A endpoints) with the
 *  per-hotel Bearer token. In dev without an API configured it falls back to
 *  the bundled fixture so components always have real-shaped data. */
import type { Briefing } from './types';
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

/* formatting helpers — same conventions as the Python side */
export const euro = (v: number) => `€${Math.round(v).toLocaleString('de-DE')}`;
export const kilo = (v: number) => (v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${Math.round(v)}`);
export const pct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)}%`;
export const varPct = (ty: number, ly: number) => (ly ? ((ty - ly) / ly) * 100 : 0);
export const signedPct = (v: number, dec = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(dec)}%`;
