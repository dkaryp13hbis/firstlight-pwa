/** Web Push subscribe / unsubscribe — one server row per hotel PER DEVICE
 *  (2026-10-31, backend docs/sql/pg/2026-10-31_push_devices.sql): every phone
 *  or tablet where the bell is on gets the notification. Per-type choices are
 *  per person per hotel on the server (push_prefs), so they survive the bell
 *  going off and on. VAPID key shared with the backend sender
 *  (briefing/cloud_push.py). Everything goes through our own API — the old
 *  direct Supabase reads are gone (our login has no Supabase session, so they
 *  always read "nothing left" and turning one hotel off silenced them all). */
import { demoMode } from './sb';
import { getUserId } from './session';
import { jwtGet, jwtSend } from '../api';

export const VAPID_PUBLIC_KEY =
  'BNhurScgTQdq7pGz55B3_0TVKYvNEstr2XVhZ9Q84Nake5-r-Ujas9QBlrlTPRR1sIWFLO_naItavzS_-0ZmgTM';

function b64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function registerSW(onNavigate: (sectionId: string, hotelId?: string | null) => void) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[sw]', e));
  navigator.serviceWorker.addEventListener('message', ev => {
    if (ev.data?.type === 'NAVIGATE') onNavigate(String(ev.data.sectionId), ev.data.hotelId ?? null);
  });
}

export function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

export function pushSupported(): { ok: boolean; why?: string } {
  if (!('serviceWorker' in navigator)) return { ok: false, why: 'Notifications are not supported in this browser.' };
  if (!('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, why: isIOS()
      ? 'On iPhone, add FirstLight to your Home Screen first (Share → Add to Home Screen), then open it from there and tap the bell.'
      : 'Push notifications are not supported in this browser.' };
  }
  return { ok: true };
}

/** This device's browser push subscription, or null. */
async function deviceSub(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

const statusUrl = (hotelId: string, endpoint?: string) =>
  `/push/status?hotel_id=${encodeURIComponent(hotelId)}` + (endpoint ? `&endpoint=${encodeURIComponent(endpoint)}` : '');

/** True when THIS device is subscribed for THIS hotel (bell state per device
 *  and per hotel — another phone of the same person does not light it). */
export async function isSubscribed(hotelId: string): Promise<boolean> {
  const sub = await deviceSub();
  if (!sub) return false;
  if (demoMode) return true;
  const j = await jwtGet<{ subscribed: boolean }>(statusUrl(hotelId, sub.endpoint));
  return !!j?.subscribed;
}

export async function subscribe(hotelId: string, hotelName: string): Promise<{ ok: boolean; msg: string }> {
  const sup = pushSupported();
  if (!sup.ok) return { ok: false, msg: sup.why! };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, msg: 'Notification permission was not granted.' };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY) as BufferSource });
  }
  if (demoMode) return { ok: true, msg: 'Notifications on (demo)' };
  if (!(await getUserId())) return { ok: false, msg: 'Not signed in — cannot save the subscription.' };
  const jr = await jwtSend('POST', '/push/subscribe', { hotel_id: hotelId, subscription: sub.toJSON() });
  if (jr && jr.status < 300) return { ok: true, msg: `Notifications on for ${hotelName} on this device` };
  const detail = (jr?.data as { detail?: string } | null)?.detail;
  return { ok: false, msg: 'Could not save the subscription — notifications are NOT on.' + (detail ? ` ${detail}` : '') };
}

/** Bell off for this hotel on THIS device. The browser subscription is
 *  dropped only when the server says this device has no other hotel left. */
export async function unsubscribe(hotelId: string, hotelName: string): Promise<{ ok: boolean; msg: string }> {
  const sub = await deviceSub();
  let left = false;
  if (!demoMode && sub) {
    const jr = await jwtSend('POST', '/push/unsubscribe', { hotel_id: hotelId, endpoint: sub.endpoint });
    if (!jr || jr.status >= 300) return { ok: false, msg: `Could not turn notifications off for ${hotelName} — try again.` };
    left = !!(jr.data as { device_left?: boolean } | null)?.device_left;
  }
  if (sub && !left) {
    try { await sub.unsubscribe(); } catch (e) { console.warn('[push] unsubscribe', e); }
  }
  return { ok: true, msg: `Notifications off for ${hotelName} on this device` };
}

export type PushPrefs = { morning: boolean; alerts: boolean; momentum: boolean };
export const DEFAULT_PREFS: PushPrefs = { morning: true, alerts: true, momentum: true };

/** This person's per-type choices for this hotel (they apply to every device
 *  of theirs). null = could not read. */
export async function getPrefs(hotelId: string): Promise<PushPrefs | null> {
  if (demoMode) return DEFAULT_PREFS;
  const j = await jwtGet<{ subscribed: boolean; notification_prefs: Partial<PushPrefs> | null }>(statusUrl(hotelId));
  return j ? { ...DEFAULT_PREFS, ...(j.notification_prefs ?? {}) } : null;
}

export async function setPrefs(hotelId: string, prefs: PushPrefs): Promise<boolean> {
  if (demoMode) return true;
  const jr = await jwtSend('PUT', '/push/prefs', { hotel_id: hotelId, notification_prefs: prefs });
  return !!jr && jr.status < 300;
}
