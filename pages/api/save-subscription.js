import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let subscription = req.body;

  // JSON string olarak geldiyse dönüştür
  if (typeof subscription === 'string') {
    try {
      subscription = JSON.parse(subscription);
    } catch (err) {
      console.warn("Abonelik JSON parse edilemedi.");
      return res.status(400).json({ error: 'Geçersiz JSON formatı.' });
    }
  }

  // Endpoint kontrolü
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Abonelik nesnesi veya endpoint eksik.' });
  }

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        [{
          endpoint: subscription.endpoint,
          subscription,
          updated_at: new Date().toISOString(),
        }],
        {
          onConflict: ['endpoint'],
          returning: 'minimal',
        }
      );

    if (error) {
      console.error("Supabase upsert hatası:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, message: "Abonelik başarıyla kaydedildi." });
  } catch (e) {
    console.error("Sunucu hatası:", e);
    return res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
}
