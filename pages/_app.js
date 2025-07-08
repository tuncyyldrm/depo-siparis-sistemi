import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/service-worker.js').then(async (reg) => {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Bildirim izni reddedildi.');
          return;
        }

        const existingSubscription = await reg.pushManager.getSubscription();
        if (!existingSubscription) {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

          const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });

          await fetch('/api/save-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          });

          console.log('Push aboneliği kaydedildi.');
        } else {
          console.log('Zaten abonelik mevcut.');
        }
      });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d47a1" />
        <link rel="apple-touch-icon" href="/placeholder-image.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Depo Sipariş" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
