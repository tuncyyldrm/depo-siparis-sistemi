self.addEventListener('push', event => {
  const data = event.data.json();

  const options = {
    body: data.body,  // Burada body var mı kontrol et
	icon: 'https://depo-siparis-sistemi.vercel.app/icon.png',
	requireInteraction: true, // kullanıcı kapatana kadar göster
    data: {
      url: data.url   // Link tıklamada kullanılıyor mu?
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
