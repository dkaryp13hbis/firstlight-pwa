/** Superadmin → Users: the own-login user base (C3, 2026-09-30).
 *  Thin wrappers over /admin/users*; every call is authorized server-side. */
import { jwtGet, jwtSend } from '../api';

export interface AdminMembership {
  id: string; scope_type: 'group' | 'org' | 'hotel'; scope_id: string;
  role: 'owner' | 'viewer'; scope_name: string | null;
}
export interface AdminUser {
  id: string; email: string; display_name: string | null; language: string;
  is_platform_admin: boolean; must_change_password: boolean; active: boolean;
  failed_logins: number; locked_until: string | null; created_at: string | null;
  last_login_at: string | null; sessions_live: number; memberships: AdminMembership[];
}

type Res<T> = { ok: true; data: T } | { ok: false; error: string };

async function send<T>(method: string, path: string, body?: unknown): Promise<Res<T>> {
  const r = await jwtSend(method, path, body);
  if (!r) return { ok: false, error: 'no session or network error' };
  if (r.status < 300) return { ok: true, data: r.data as T };
  const detail = (r.data as { detail?: string } | null)?.detail;
  return { ok: false, error: detail ?? `failed (${r.status})` };
}

export const fetchAdminUsers = () => jwtGet<{ users: AdminUser[] }>('/admin/users');

export interface NewUser {
  email: string; display_name: string; language: 'en' | 'el';
  password?: string; keep_password?: boolean; is_platform_admin?: boolean;
  membership?: { scope_type: 'group' | 'org' | 'hotel'; scope_id: string; role: 'owner' | 'viewer' };
}
export const createAdminUser = (u: NewUser) =>
  send<{ id: string; email: string; initial_password: string; membership?: AdminMembership }>('POST', '/admin/users', u);

export const resetUserPassword = (id: string, password?: string, keep?: boolean) =>
  send<{ id: string; password: string }>('POST', `/admin/users/${id}/password`,
    { password: password || undefined, keep_password: !!keep });

export const setUserActive = (id: string, active: boolean, reason?: string) =>
  send<{ id: string; active: boolean }>('POST', `/admin/users/${id}/active`, { active, reason });

export const grantUserAccess = (id: string, scope_type: string, scope_id: string, role: string) =>
  send<AdminMembership>('POST', `/admin/users/${id}/memberships`, { scope_type, scope_id, role });

export const revokeUserAccess = (id: string, membershipId: string) =>
  send<{ removed: string }>('DELETE', `/admin/users/${id}/memberships/${membershipId}`);
