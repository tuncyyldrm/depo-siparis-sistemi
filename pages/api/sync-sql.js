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

    // SQL sorgusu: son 10 fişi çek ve depo miktar hesapla
    const result = await pool.request().query(`
      ;WITH SonFisler AS (
        SELECT DISTINCT TOP 10 FISNO
        FROM TBLSIPATRA
        ORDER BY FISNO DESC
      ),
      DepoMiktar AS (
        SELECT 
          STOK_KODU,
          SUM(ISNULL(TOP_GIRIS_MIK, 0)) - SUM(ISNULL(TOP_CIKIS_MIK, 0)) AS DEPO_MIKTAR
        FROM TBLSTOKPH
        GROUP BY STOK_KODU
      )
      SELECT 
        p.STOK_KODU,
        p.FISNO,
        CAST(p.STHAR_GCMIK AS DECIMAL(18,0)) AS STHAR_GCMIK,
        CAST(p.STHAR_BF AS DECIMAL(18,0)) AS STHAR_BF,
        p.STHAR_SATISK,
        p.STHAR_CARIKOD,
        s.KOD_5,
        CAST(ISNULL(d.DEPO_MIKTAR, 0) AS DECIMAL(18,0)) AS DEPO_MIKTAR
      FROM TBLSIPATRA p
      INNER JOIN SonFisler sf ON p.FISNO = sf.FISNO
      LEFT JOIN TBLSTSABIT s ON p.STOK_KODU = s.STOK_KODU
      LEFT JOIN DepoMiktar d ON p.STOK_KODU = d.STOK_KODU
      ORDER BY p.FISNO DESC, p.STOK_KODU;
    `);

    const rows = result.recordset;

    // Unique siparişleri oluştur
    const uniqueOrders = Array.from(
      new Map(rows.map(row => [row.FISNO, row])).values()
    ).map(order => ({
      fisno: order.FISNO.trim(), // trim ekledim
      carikod: order.STHAR_CARIKOD || null,
      created_at: new Date().toISOString(),
    }));

    // orders tablosuna upsert
    const { error: orderError } = await supabase.from("orders").upsert(uniqueOrders, {
      onConflict: ['fisno']
    });
    if (orderError) {
      console.error("Orders upsert hatası:", orderError);
      return res.status(500).json({ message: "Supabase orders hatası: " + orderError.message });
    }

    // order_items tablosuna upsert
    const orderItems = rows.map(row => ({
      fisno: row.FISNO.trim(),
      stok_kodu: row.STOK_KODU,
      sthar_gcmik: row.STHAR_GCMIK,
      sthar_bf: row.STHAR_BF,
      sthar_satisk: row.STHAR_SATISK,
      sthar_carikod: row.STHAR_CARIKOD,
      kod_5: row.KOD_5,
      depo_miktar: row.DEPO_MIKTAR,
    }));

    const { error: itemsError } = await supabase.from("order_items").upsert(orderItems, {
      onConflict: ['fisno', 'stok_kodu']
    });
    if (itemsError) {
      console.error("Order_items upsert hatası:", itemsError);
      return res.status(500).json({ message: "Supabase order_items hatası: " + itemsError.message });
    }

    // latestFisnos dizisini boş elemanlardan arındır
    const latestFisnos = uniqueOrders
      .map(o => o.fisno)
      .filter(fis => typeof fis === 'string' && fis.length > 0);

    console.log("Supabase'te tutulacak son 10 fiş:", latestFisnos);

    // Eğer dizide hiç fiş yoksa silme işlemini atla
    if (latestFisnos.length > 0) {
      // orders tablosundan eski fişleri sil
      const { error: deleteOldOrdersError } = await supabase
        .from('orders')
        .delete()
        .not('fisno', 'in', latestFisnos);

      if (deleteOldOrdersError) {
        console.error("Eski orders silme hatası:", deleteOldOrdersError);
        return res.status(500).json({ message: "Supabase orders silme hatası: " + deleteOldOrdersError.message });
      }

      // order_items tablosundan eski fişlere ait kalemleri sil
      const { error: deleteOldItemsError } = await supabase
        .from('order_items')
        .delete()
        .not('fisno', 'in', latestFisnos);

      if (deleteOldItemsError) {
        console.error("Eski order_items silme hatası:", deleteOldItemsError);
        return res.status(500).json({ message: "Supabase order_items silme hatası: " + deleteOldItemsError.message });
      }
    } else {
      console.warn("latestFisnos dizisi boş, silme işlemi atlandı.");
    }

    return res.status(200).json({ message: "Siparişler başarıyla güncellendi ve eski fişler temizlendi!" });

  } catch (err) {
    console.error("Hata:", err);
    return res.status(500).json({ message: "Sunucu hatası: " + err.message });
  } finally {
    sql.close();
  }
}
