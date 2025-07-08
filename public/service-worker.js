@@ -0,0 +1,28 @@
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'Yeni Sipariş';
  const options = {
    body: data.body || 'Yeni bir sipariş geldi.',
    icon: '/icon.png',       // Uygun yol ve dosyalar olmalı
    badge: '/badge.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
