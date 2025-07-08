// Push bildirimi geldiğinde çalışır
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'Yeni Sipariş';

  const options = {
    body: data.body || 'Yeni bir sipariş geldi.',
    icon: '/icon.png',           // Bildirim simgesi
    badge: '/badge.png',         // Küçük simge
    data: {
      url: data.data?.url || '/', // 🔁 Bildirim tıklanınca yönlendirilecek URL
      fisno: data.data?.fisno || null // Ek veri gerekirse
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Bildirime tıklanınca çalışır
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Açık bir pencere zaten varsa oraya odaklan
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
