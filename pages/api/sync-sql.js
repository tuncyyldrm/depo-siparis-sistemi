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

// fisno değerlerini temizleyen fonksiyon
function temizleFisno(fisno) {
  if (!fisno) return "";
  return fisno
    .toString()
    .trim()
    .replace(/\s+/g, "")       // tüm boşlukları kaldır
    .replace(/[^\w\-]/g, "");  // sadece harf, rakam, _ ve - bırak
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const pool = await sql.connect(sqlConfig);

    // Son 10 fişi ve depo miktarları çek
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

    // Unique orders, fisno temizleniyor ve geçerlilik kontrolü yapılıyor
    const uniqueOrders = Array.from(
      new Map(rows.map(row => [temizleFisno(row.FISNO), row])).values()
    ).map(order => {
      const cleanedFisno = temizleFisno(order.FISNO);
      return {
        fisno: cleanedFisno,
        carikod: order.STHAR_CARIKOD || null,
        created_at: new Date().toISOString(),
      };
    }).filter(o => o.fisno.length > 0);

    // Upsert orders
    const { error: orderError } = await supabase.from("orders").upsert(uniqueOrders, {
      onConflict: ['fisno']
    });
    if (orderError) {
      console.error("Orders upsert hatası:", orderError);
      return res.status(500).json({ message: "Supabase orders hatası: " + orderError.message });
    }

    // Upsert order_items
    const orderItems = rows.map(row => {
      const cleanedFisno = temizleFisno(row.FISNO);
      return {
        fisno: cleanedFisno,
        stok_kodu: row.STOK_KODU,
        sthar_gcmik: row.STHAR_GCMIK,
        sthar_bf: row.STHAR_BF,
        sthar_satisk: row.STHAR_SATISK,
        sthar_carikod: row.STHAR_CARIKOD,
        kod_5: row.KOD_5,
        depo_miktar: row.DEPO_MIKTAR,
      };
    }).filter(item => item.fisno.length > 0);

    const { error: itemsError } = await supabase.from("order_items").upsert(orderItems, {
      onConflict: ['fisno', 'stok_kodu']
    });
    if (itemsError) {
      console.error("Order_items upsert hatası:", itemsError);
      return res.status(500).json({ message: "Supabase order_items hatası: " + itemsError.message });
    }

    // Silme için fisnoları hazırla
    const latestFisnos = uniqueOrders.map(o => o.fisno);

    console.log("Supabase'te tutulacak son 10 fiş:", latestFisnos);

    // Eski kayıtları sil, ancak latestFisnos boşsa silme işlemi yapma
    if (latestFisnos.length > 0) {
      const { error: deleteOldOrdersError } = await supabase
        .from('orders')
        .delete()
        .not('fisno', 'in', latestFisnos);

      if (deleteOldOrdersError) {
        console.error("Eski orders silme hatası:", deleteOldOrdersError);
        return res.status(500).json({ message: "Supabase orders silme hatası: " + deleteOldOrdersError.message });
      }

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
