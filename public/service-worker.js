self.addEventListener('push', event => {
  const data = event.data?.json() || {};

  const title = data.title || 'Depo Sipariş Sistemi';
  const options = {
    body: data.body || 'Yeni bir bildirim var.',
    icon: data.icon || 'https://depo-siparis-sistemi.vercel.app/icon.png'',        // İsteğe göre özelleştir
    badge: data.badge || 'https://depo-siparis-sistemi.vercel.app/badge.png',     // Küçük simge (bildirim alanında)
    data: {
      url: data.url || '/'                 // Tıklanınca yönlendirilecek adres
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
