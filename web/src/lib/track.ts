/** First-party usage tracking → Supabase `usage_events` (RLS: insert-own-only).
 *  Batched (10s / page-hide flush), fails silently — tracking must never
 *  break the app. GATED: only the demo account is tracked for now; widen by
 *  editing TRACKED_EMAILS (or set it to null to track everyone). */
import { sb } from './sb';

const TRACKED_EMAILS: string[] | null = ['demo@hbis.io'];

const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
const t0 = Date.now();
let uid: string | null = null;
let enabled = false;
let hotelId: string | undefined;
let queue: { user_id: string; hotel_id?: string; session_id: string; event: string; props?: Record<string, unknown> }[] = [];

async function flush() {
  if (!sb || !queue.length) return;
  const batch = queue;
  queue = [];
  try { await sb.from('usage_events').insert(batch); } catch { /* never break the app */ }
}

export async function initTracking(currentHotelId: string | undefined) {
  hotelId = currentHotelId;
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    uid = session.user.id;
    const email = (session.user.email ?? '').toLowerCase();
    enabled = TRACKED_EMAILS === null || TRACKED_EMAILS.includes(email);
    if (!enabled) return;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    track('app_open', {
      standalone,
      platform: /iP(hone|ad|od)/.test(navigator.userAgent) ? 'ios'
        : /Android/.test(navigator.userAgent) ? 'android' : 'desktop',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    window.setInterval(flush, 10_000);
    /* session end: duration in seconds, flushed while the page can still send */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        track('session_end', { seconds: Math.round((Date.now() - t0) / 1000) });
        void flush();
      }
    });
  } catch { /* tracking is best-effort */ }
}

export function setTrackedHotel(id: string) { hotelId = id; }

export function track(event: string, props?: Record<string, unknown>) {
  if (!enabled || !uid) return;
  queue.push({ user_id: uid, hotel_id: hotelId, session_id: sessionId, event, props });
  if (queue.length >= 20) void flush();
}
