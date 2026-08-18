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

/** True when this device has a live browser subscription AND the server has
 *  a row for THIS hotel (bell state is per hotel, not per device). */
export async function isSubscribed(hotelId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    if (!sb) return true;
    const { data } = await sb.from('push_subscriptions').select('id').eq('hotel_id', hotelId).limit(1);
    return !!(data && data.length);
  } catch { return false; }
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
  if (!sb) return { ok: true, msg: 'Notifications on (demo)' };
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { ok: false, msg: 'Not signed in — cannot save the subscription.' };
  const uid = session.user.id;
  /* delete-then-insert for THIS hotel: works with or without the
     (user_id,hotel_id) unique index. */
  await sb.from('push_subscriptions').delete().eq('user_id', uid).eq('hotel_id', hotelId);
  const { error } = await sb.from('push_subscriptions')
    .insert({ hotel_id: hotelId, user_id: uid, subscription: sub.toJSON() });
  if (error) {
    const dup = /duplicate key|23505/.test(error.message);
    return { ok: false, msg: dup
      ? 'The database still allows only one subscription per user — the (user_id, hotel_id) SQL fix has to be applied before a second hotel can be added.'
      : 'Could not save the subscription — notifications are NOT on. ' + error.message };
  }
  return { ok: true, msg: `Notifications on — morning briefing for ${hotelName}` };
}

export async function unsubscribe(hotelId: string, hotelName: string): Promise<string> {
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await sb.from('push_subscriptions').delete().eq('user_id', session.user.id).eq('hotel_id', hotelId);
      const { data: left } = await sb.from('push_subscriptions').select('id').limit(1);
      if (left && left.length) return `Notifications off for ${hotelName}`;
    }
  }
  /* no hotel left on this account → drop the browser subscription too */
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (e) { console.warn('[push] unsubscribe', e); }
  return `Notifications off for ${hotelName}`;
}
