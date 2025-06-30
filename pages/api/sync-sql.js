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

    const rows = result.recordset;

    // 1️⃣ Önce orders tablosuna fisno-carikod bilgilerini güncelle
    const uniqueOrders = Array.from(
      new Map(rows.map(row => [row.FISNO, row])).values()
    ).map(order => ({
      fisno: order.FISNO,
      carikod: order.STHAR_CARIKOD || null,
      created_at: new Date().toISOString(),
    }));

    const { error: orderError } = await supabase.from("orders").upsert(uniqueOrders, {
      onConflict: 'fisno'
    });
    if (orderError) {
      console.error("Orders upsert hatası:", orderError);
      return res.status(500).json({ message: "Supabase orders hatası: " + orderError.message });
    }

    // 2️⃣ Ardından order_items tablosuna kalemleri upsert et
    const orderItems = rows.map(row => ({
      fisno: row.FISNO,
      stok_kodu: row.STOK_KODU,
      sthar_gcmik: row.STHAR_GCMIK,
      sthar_bf: row.STHAR_BF ? parseFloat(row.STHAR_BF) : null,  // ondalık desteği
      sthar_satisk: row.STHAR_SATISK,
      sthar_carikod: row.STHAR_CARIKOD,
      kod_5: null,
      depo_miktar: null
    }));

    const { error: itemsError } = await supabase.from("order_items").upsert(orderItems);
    if (itemsError) {
      console.error("Order_items upsert hatası:", itemsError);
      return res.status(500).json({ message: "Supabase order_items hatası: " + itemsError.message });
    }

    return res.status(200).json({ message: "Siparişler ve kalemler başarıyla Supabase'e aktarıldı!" });
  } catch (err) {
    console.error("Hata:", err);
    return res.status(500).json({ message: "Sunucu hatası: " + err.message });
  } finally {
    sql.close();
  }
}
