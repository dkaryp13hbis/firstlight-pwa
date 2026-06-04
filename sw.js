self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'FirstLight', {
      body:             data.body ?? 'Your morning briefing is ready.',
      icon:             '/icon.svg',
      badge:            '/icon.svg',
      data:             { sectionId: data.sectionId ?? 'sec-ai' },
      tag:              'firstlight-briefing',
      renotify:         true,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const sectionId = event.notification.data?.sectionId ?? 'sec-ai';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', sectionId });
          return client.focus();
        }
      }
      return clients.openWindow(`/#${sectionId}`);
    })
  );
});
