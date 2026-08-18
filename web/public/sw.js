/* FirstLight service worker — Web Push only (no asset caching; the app
   caches its own data in localStorage). Same contract as the legacy PWA:
   payload {title, body, sectionId, url}. */
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
      data: { sectionId: data.sectionId || 'sec-ai' },
      tag: 'firstlight-briefing',
      renotify: true,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const sectionId = (event.notification.data && event.notification.data.sectionId) || 'sec-ai';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.postMessage({ type: 'NAVIGATE', sectionId }); return c.focus(); }
      }
      return clients.openWindow('/#' + sectionId);
    })
  );
});
