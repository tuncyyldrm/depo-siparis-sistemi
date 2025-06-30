// pages/api/sync-sql.js

import sql from "mssql";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sqlConfig = {
  user: 'ygt',
  password: 'Yildirim32',
  server: '88.247.52.50',
  port: 15443,
  database: 'YIGIT2025',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT TOP 10
        FISNO,
        STOK_KODU,
        STHAR_GCMIK,
        STHAR_BF,
        STHAR_SATISK,
        STHAR_CARIKOD
      FROM TBLSIPATRA
      ORDER BY FISNO DESC
    `);

    const rows = result.recordset.map(row => ({
      fisno: row.FISNO,
      stok_kodu: row.STOK_KODU,
      sthar_gcmik: row.STHAR_GCMIK,
      sthar_bf: row.STHAR_BF,
      sthar_satisk: row.STHAR_SATISK,
      sthar_carikod: row.STHAR_CARIKOD,
      kod_5: null,          // SQL sorgunda yok ama Supabase tablosunda var; istersen burayı doldurabilirsin
      depo_miktar: null     // SQL sorgunda yok ama Supabase tablosunda var; istersen ekleyebilirsin
    }));

    const { error } = await supabase.from("order_items").upsert(rows);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ message: "Supabase hatası: " + error.message });
    }

    return res.status(200).json({ message: "Sipariş kalemleri order_items tablosuna başarıyla aktarıldı!" });
  } catch (err) {
    console.error("Hata:", err);
    return res.status(500).json({ message: "Sunucu hatası: " + err.message });
  } finally {
    sql.close();
  }
}
