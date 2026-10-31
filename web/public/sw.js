/* FirstLight service worker — Web Push only (no asset caching; the app
   caches its own data in localStorage). Same contract as the legacy PWA:
   payload {title, body, sectionId, url, hotelId}. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FirstLight', {
      body: data.body || 'Your morning briefing is ready.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { sectionId: data.sectionId || 'sec-ai', hotelId: data.hotelId || null },
      /* tag per hotel AND type (backend sends it since 2026-10-31): one tag
         per hotel let an afternoon alert replace the unread morning briefing.
         Older payloads without a tag keep the per-hotel tag. */
      tag: data.tag || ('firstlight-' + (data.hotelId || 'briefing')),
      renotify: true,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = event.notification.data || {};
  const sectionId = d.sectionId || 'sec-ai';
  const hotelId = d.hotelId || null;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.postMessage({ type: 'NAVIGATE', sectionId, hotelId }); return c.focus(); }
      }
      return clients.openWindow('/#' + sectionId + (hotelId ? '&h=' + hotelId : ''));
    })
  );
});
