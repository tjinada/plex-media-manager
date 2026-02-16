// Push notification handlers for TJ Plex Media Manager
// This runs alongside Angular's ngsw-worker.js

self.addEventListener('push', function(event) {
  console.log('[SW-Push] Push event received');

  if (!event.data) {
    console.log('[SW-Push] No push data');
    return;
  }

  var payload;
  try {
    payload = event.data.json();
    console.log('[SW-Push] Payload:', JSON.stringify(payload));
  } catch (error) {
    console.error('[SW-Push] Failed to parse push data:', error);
    return;
  }

  var title = payload.title || 'TJ Plex Manager';
  var options = {
    body: payload.body || '',
    icon: payload.icon || '/assets/icons/icon-192x192.png',
    badge: payload.badge || '/assets/icons/icon-192x192.png',
    tag: payload.tag || 'plex-notification',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW-Push] Notification clicked');
  event.notification.close();

  var data = event.notification.data || {};
  var url = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

console.log('[SW-Push] Push handlers registered');
