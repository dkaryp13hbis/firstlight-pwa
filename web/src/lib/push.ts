/** Web Push subscribe / unsubscribe — same server contract as the legacy PWA:
 *  one row per (user, hotel) in `push_subscriptions`, VAPID key shared with
 *  the backend sender (briefing/cloud_push.py). Bell state is derived from
 *  the browser subscription + server rows, never from a local flag. */
import { sb } from './sb';

export const VAPID_PUBLIC_KEY =
  'BNhurScgTQdq7pGz55B3_0TVKYvNEstr2XVhZ9Q84Nake5-r-Ujas9QBlrlTPRR1sIWFLO_naItavzS_-0ZmgTM';

function b64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function registerSW(onNavigate: (sectionId: string) => void) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[sw]', e));
  navigator.serviceWorker.addEventListener('message', ev => {
    if (ev.data?.type === 'NAVIGATE') onNavigate(String(ev.data.sectionId));
  });
}

export function pushSupported(): { ok: boolean; why?: string } {
  if (!('serviceWorker' in navigator)) return { ok: false, why: 'Notifications are not supported in this browser.' };
  if (!('Notification' in window) || !('PushManager' in window)) {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    return { ok: false, why: ios
      ? 'On iPhone, add FirstLight to your Home Screen first (Share → Add to Home Screen), then open it from there and tap the bell.'
      : 'Push notifications are not supported in this browser.' };
  }
  return { ok: true };
}

/** True when this device has a live browser subscription AND the server knows it. */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    if (!sb) return true;
    const { data } = await sb.from('push_subscriptions').select('id').limit(1);
    return !!(data && data.length);
  } catch { return false; }
}

export async function subscribe(hotelIds: string[]): Promise<{ ok: boolean; saved: number; msg: string }> {
  const sup = pushSupported();
  if (!sup.ok) return { ok: false, saved: 0, msg: sup.why! };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, saved: 0, msg: 'Notification permission was not granted.' };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY) as BufferSource });
  }
  if (!sb) return { ok: true, saved: hotelIds.length, msg: 'Notifications on (demo)' };
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { ok: false, saved: 0, msg: 'Not signed in — cannot save the subscription.' };
  const uid = session.user.id;
  let saved = 0, lastErr = '';
  for (const hid of hotelIds) {
    /* delete-then-insert: works with or without the (user_id,hotel_id)
       unique index (the upsert path 42P10s when the index is missing). */
    await sb.from('push_subscriptions').delete().eq('user_id', uid).eq('hotel_id', hid);
    const { error } = await sb.from('push_subscriptions')
      .insert({ hotel_id: hid, user_id: uid, subscription: sub.toJSON() });
    if (error) lastErr = error.message; else saved++;
  }
  if (!saved) return { ok: false, saved: 0, msg: 'Could not save the subscription — notifications are NOT on. ' + lastErr };
  return { ok: true, saved, msg: `Notifications on — morning briefing for ${saved} hotel${saved > 1 ? 's' : ''}` };
}

export async function unsubscribe(): Promise<string> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (e) { console.warn('[push] unsubscribe', e); }
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) await sb.from('push_subscriptions').delete().eq('user_id', session.user.id);
  }
  return 'Notifications off';
}
