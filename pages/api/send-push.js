import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

webPush.setVapidDetails(
  'mailto:youremail@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Eksik parametreler.' });

  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subscriptions.map(({ subscription }) => {
      let sub;
      try {
        sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
      } catch {
        return Promise.resolve(); // parse hatası varsa atla
      }

      return webPush.sendNotification(sub, payload).catch(e => {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Abonelik artık geçerli değil, sil
          return supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      });
    })
  );

  res.status(200).json({ message: 'Bildirimler gönderildi.' });
}
