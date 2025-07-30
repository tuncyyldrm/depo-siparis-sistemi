self.addEventListener('install', event => {
  console.log('Service Worker: Kurulum tamamlandı.');
  event.waitUntil(
    caches.open('siparis-cache').then(cache => {
      return cache.addAll([
        '/',
        '/icon.png',
        '/badge.png',
        '/manifest.json',
        '/styles-v1.1.css',
        '/scripts-v1.2.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    console.error('Push verisi JSON parse edilemedi:', e);
  }

  if (!data.title && !data.body) {
    console.log('Bildirim verisi yok, gösterilmiyor.');
    return;
  }

  const options = {
    body: data.body || 'Yeni bir güncelleme var.',
    icon: '/icon.png',
    badge: '/badge.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
