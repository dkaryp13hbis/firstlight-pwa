/** FirstLight's own login (Phase C3, 2026-09-30).
 *
 *  The session is an opaque token from POST /auth/login, kept in localStorage
 *  (`fl_session`) next to the public user record (`fl_user`). Every API call
 *  takes the token through getToken(); accounts that have not been moved off
 *  Supabase Auth yet still sign in there, and getToken() falls back to that
 *  JWT — the parallel-run. Nothing here ever sends email. */
import { sb } from './sb';

export const API = (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'https://web-cloudflare.up.railway.app';

const TKEY = 'fl_session';
const UKEY = 'fl_user';
const EVT = 'fl-session';

export interface OwnUser {
  id: string;
  email: string;
  display_name: string | null;
  language: 'en' | 'el';
  is_platform_admin: boolean;
  must_change_password: boolean;
}

function read(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}

export function ownToken(): string | null { return read(TKEY); }

export function ownUser(): OwnUser | null {
  const v = read(UKEY);
  if (!v) return null;
  try { return JSON.parse(v) as OwnUser; } catch { return null; }
}

export const hasOwnSession = (): boolean => !!ownToken();

function setOwn(token: string | null, user: OwnUser | null) {
  try {
    if (token) localStorage.setItem(TKEY, token); else localStorage.removeItem(TKEY);
    if (user) localStorage.setItem(UKEY, JSON.stringify(user)); else localStorage.removeItem(UKEY);
  } catch { /* private mode — the session lives for this page only */ }
  window.dispatchEvent(new Event(EVT));
}

/** Subscribe to own-session changes (login, logout, password changed). */
export function onSessionChange(cb: () => void): () => void {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}

/** Bearer for API calls: own session first, Supabase JWT as the fallback. */
export async function getToken(): Promise<string | null> {
  const t = ownToken();
  if (t) return t;
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  } catch { return null; }
}

export async function getUserId(): Promise<string | null> {
  const u = ownUser();
  if (u) return u.id;
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  } catch { return null; }
}

export async function getEmail(): Promise<string | null> {
  const u = ownUser();
  if (u) return u.email.toLowerCase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user.email?.toLowerCase() ?? null;
  } catch { return null; }
}

type LoginResult = { ok: true } | { ok: false; status: number; msg: string };

export async function ownLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const j = (await r.json().catch(() => null)) as { token?: string; user?: OwnUser; detail?: string } | null;
    if (r.ok && j?.token && j.user) { setOwn(j.token, j.user); return { ok: true }; }
    return {
      ok: false, status: r.status,
      msg: j?.detail ?? (r.status === 401 ? 'Wrong email or password.' : `Sign-in failed (${r.status}).`),
    };
  } catch {
    return { ok: false, status: 0, msg: 'Cannot reach FirstLight — check your connection.' };
  }
}

export async function ownLogout(): Promise<void> {
  const t = ownToken();
  setOwn(null, null);
  if (!t) return;
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
  } catch { /* the token is gone locally either way */ }
}

export async function ownChangePassword(current: string, next: string): Promise<{ ok: boolean; msg: string }> {
  const t = ownToken();
  if (!t) return { ok: false, msg: 'Not signed in.' };
  try {
    const r = await fetch(`${API}/auth/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: next }),
    });
    const j = (await r.json().catch(() => null)) as { user?: OwnUser; detail?: string } | null;
    if (r.ok && j?.user) { setOwn(t, j.user); return { ok: true, msg: 'Password changed.' }; }
    if (r.status === 401 && /session/i.test(j?.detail ?? '')) setOwn(null, null);
    return { ok: false, msg: j?.detail ?? `Could not change the password (${r.status}).` };
  } catch {
    return { ok: false, msg: 'Cannot reach FirstLight — check your connection.' };
  }
}

/** A 401 on an own session = revoked or expired server-side → back to login. */
export function ownSessionExpired(): void {
  if (ownToken()) setOwn(null, null);
}
