// Combined service worker: imports Angular's ngsw + custom push handlers
// This file MUST be in the build output root (same location as ngsw-worker.js)

importScripts('./ngsw-worker.js');

// ============================================
// Custom Push Notification Handlers
// ============================================
// These override ngsw's push handling with our flat payload format

self.addEventListener('push', function(event) {
  // Skip if no data
  if (!event.data) return;

  var payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return;
  }

  // Only handle our flat format (has title at root level, no notification wrapper)
  // Let ngsw handle its own format if somehow used
  if (!payload.title || payload.notification) return;

  var title = payload.title;
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
