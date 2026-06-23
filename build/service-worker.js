/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  event.waitUntil(
    (async function() {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch (err) {
        data = { body: event.data ? event.data.text() : 'New notification' };
      }

      await self.registration.showNotification(
        data.title || 'Prediction Addiction',
        {
          body: data.body || 'New notification',
          icon: '/logo192.png',
          badge: '/logo192.png',
          data: data.url || '/',
          tag: data.tag || undefined,
        }
      );
    })()
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
