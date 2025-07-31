self.addEventListener('push', event => {
  console.log('[SW] Push event verisi:', event.data && event.data.text());

  let data = { title: 'Yeni bildirim', body: 'İçerik yok', url: '/' };

  try {
    if (event.data) {
      const json = event.data.json();
      data.title = json.title || data.title;
      data.body = json.body || data.body;
      data.url = json.url || data.url;
    }
  } catch (e) {
    console.error('[SW] JSON parse hatası:', e);
  }

  const options = {
    body: data.body,
    icon: 'https://depo-siparis-sistemi.vercel.app/icon.png',
    requireInteraction: true,
    data: { url: data.url }
  };

  // push her durumda bir bildirimle sonlansın:
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .catch(err => {
        console.error('[SW] Bildirim gösterilemedi:', err);
      })
  );
});


self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
