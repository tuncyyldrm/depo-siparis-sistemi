import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VAPID bilgilerini ayarla
webPush.setVapidDetails(
  'mailto:bildirim@ornekmail.com', // Değiştir
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, url } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title ve body alanları zorunludur.' });
  }

  // Supabase'den tüm geçerli abonelikleri al
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error("Abonelikler alınamadı:", error);
    return res.status(500).json({ error: error.message });
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/', // URL yoksa ana sayfaya yönlendir
  });

  const results = await Promise.allSettled(
    subscriptions.map(async ({ subscription }) => {
      let sub;
      try {
        sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
      } catch (err) {
        console.warn("Abonelik JSON parse edilemedi, atlanıyor.");
        return;
      }

      try {
        await webPush.sendNotification(sub, payload);
      } catch (e) {
        const status = e.statusCode || e.status || 0;
        if (status === 410 || status === 404) {
          // Abonelik geçersiz veya süresi dolmuş, sil
          console.log(`Geçersiz abonelik siliniyor: ${sub.endpoint}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        } else {
          console.error('Bildirim gönderme hatası:', e);
        }
      }
    })
  );

  res.status(200).json({
    success: true,
    message: 'Bildirimler gönderildi.',
    sentCount: results.filter(r => r.status === 'fulfilled').length,
    failedCount: results.filter(r => r.status === 'rejected').length,
  });
}
