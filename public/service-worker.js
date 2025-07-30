self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Geçersiz push verisi:', e);
    return;
  }

  const title = data.title || '📦 Yeni Bildirim';
  const options = {
    body: data.body || 'Detayları görmek için tıklayın.',
    icon: 'https://depo-siparis-sistemi.vercel.app/icon.png',
    requireInteraction: true, // Bildirim kapatılana kadar açık kalsın
    data: {
      url: data.url || '/' // URL boşsa ana sayfaya yönlendir
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Eğer açık sekmede aynı URL varsa, ona odaklan
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni sekme aç
      return clients.openWindow(urlToOpen);
    })
  );
});
