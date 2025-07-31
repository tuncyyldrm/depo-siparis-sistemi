self.addEventListener('push', event => {
  let data = { title: 'Bildirim', body: '', url: '/' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      // JSON parse hatası olursa fallback kalır
    }
  }

  const options = {
    body: data.body || '',
    icon: 'https://depo-siparis-sistemi.vercel.app/icon.png',
    requireInteraction: true,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bildirim', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
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
