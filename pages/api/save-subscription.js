import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Geçersiz abonelik.' });
  }

  try {
    const { error, data } = await supabase
      .from('push_subscriptions')
      .upsert([{
        endpoint: subscription.endpoint,
        subscription: subscription
      }], {
        onConflict: ['endpoint'],
        returning: 'minimal', // Daha hızlı dönüş için
      });

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: error.message || error });
    }

    return res.status(201).json({ success: true });
  } catch (e) {
    console.error("Beklenmeyen hata:", e);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
}
