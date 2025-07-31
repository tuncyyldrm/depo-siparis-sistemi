self.addEventListener('push', event => {
  let data = { title: 'Bildirim', body: '', url: '/' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    console.error('Push verisi çözümlenemedi:', err);
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://depo-siparis-sistemi.vercel.app/icon.png',
    requireInteraction: true,
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
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
