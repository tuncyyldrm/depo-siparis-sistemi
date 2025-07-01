// SQL Server'dan veri çekip Supabase'e yazan script

import mssql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sqlConfig = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASS,
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  database: process.env.SQL_SERVER_DB,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    // SQL Server'a bağlan
    await mssql.connect(sqlConfig);

    // En son 10 FISNO çek (örnek)
    const result = await mssql.query(`
      ;WITH SonFisler AS (
        SELECT DISTINCT TOP 10 FISNO FROM TBLSIPATRA ORDER BY FISNO DESC
      )
      SELECT 
        p.STOK_KODU,
        p.FISNO,
        CAST(p.STHAR_GCMIK AS INT) AS STHAR_GCMIK,
        CAST(p.STHAR_BF AS INT) AS STHAR_BF,
        p.STHAR_SATISK,
        p.STHAR_CARIKOD,
        s.KOD_5,
        CAST(ISNULL(d.DEPO_MIKTAR, 0) AS INT) AS DEPO_MIKTAR
      FROM TBLSIPATRA p
      INNER JOIN SonFisler sf ON p.FISNO = sf.FISNO
      LEFT JOIN TBLSTSABIT s ON p.STOK_KODU = s.STOK_KODU
      LEFT JOIN (
        SELECT STOK_KODU, SUM(ISNULL(TOP_GIRIS_MIK, 0)) - SUM(ISNULL(TOP_CIKIS_MIK, 0)) AS DEPO_MIKTAR
        FROM TBLSTOKPH GROUP BY STOK_KODU
      ) d ON p.STOK_KODU = d.STOK_KODU
      ORDER BY p.FISNO DESC, p.STOK_KODU;
    `);

    const rows = result.recordset;

    // Siparişleri gruplandır
    const ordersMap = new Map();
    for (const row of rows) {
      if (!ordersMap.has(row.FISNO)) {
        ordersMap.set(row.FISNO, {
          fisno: row.FISNO,
          carikod: row.STHAR_CARIKOD,
          items: []
        });
      }
      ordersMap.get(row.FISNO).items.push({
        stok_kodu: row.STOK_KODU,
        sthar_gcmik: row.STHAR_GCMIK,
        sthar_bf: row.STHAR_BF,
        sthar_satisk: row.STHAR_SATISK,
        sthar_carikod: row.STHAR_CARIKOD,
        kod_5: row.KOD_5,
        depo_miktar: row.DEPO_MIKTAR
      });
    }

    // Supabase'de önce var olanları temizle (örnek basit)
    await supabase.from('order_item_selections').delete().neq('id', 0);
    await supabase.from('order_items').delete().neq('id', 0);
    await supabase.from('orders').delete().neq('fisno', '');

    // Sonra yeni verileri ekle
    for (const [fisno, order] of ordersMap.entries()) {
      // orders tablosuna ekle
      const { error: orderErr } = await supabase.from('orders').upsert({
        fisno,
        carikod: order.carikod
      });
      if (orderErr) {
        console.error('Order insert error:', orderErr);
        continue;
      }
      // order_items tablosuna ekle
      const itemsToInsert = order.items.map(item => ({
        fisno,
        stok_kodu: item.stok_kodu,
        sthar_gcmik: item.sthar_gcmik,
        sthar_bf: item.sthar_bf,
        sthar_satisk: item.sthar_satisk,
        sthar_carikod: item.sthar_carikod,
        kod_5: item.kod_5,
        depo_miktar: item.depo_miktar
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsErr) {
        console.error('Order items insert error:', itemsErr);
      }
    }

    console.log('Veri senkronizasyonu tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

main();
