self.addEventListener('push', event => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon.png', // dikkat çekici bir ikon ekle
    badge: '/badge.png', // küçük simge
    vibrate: [200, 100, 200], // titreşim (mobilde)
    data: {
      url: data.url,
      sound: true // özel işaretleme
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
