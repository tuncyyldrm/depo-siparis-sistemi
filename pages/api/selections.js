import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('order_item_selections').select('*');
    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(data);
  } 
  else if (req.method === 'POST') {
    const { fisno, item_index, selected } = req.body;
    if (typeof fisno !== 'string' || typeof item_index !== 'number' || typeof selected !== 'boolean') {
      return res.status(400).json({ error: 'Parametre türleri hatalı veya eksik' });
    }

    const { data, error } = await supabase
      .from('order_item_selections')
      .upsert({ fisno, item_index, selected }, { onConflict: ['fisno', 'item_index'] });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true });
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
