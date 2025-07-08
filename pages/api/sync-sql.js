import sql from "mssql";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sqlConfig = {
  user: "ygt",
  password: "Yildirim32",
  server: "88.247.52.50",
  port: 15443,
  database: "YIGIT2025",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

function temizleFisno(fisno) {
  return fisno
    ? fisno.toString().trim().replace(/\s+/g, "").replace(/[^\w\-]/g, "")
    : "";
}

// VAPID ayarları (env'den)
webpush.setVapidDetails(
  "mailto:youremail@example.com", // mail adresini kendine göre değiştir
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error("Bildirim gönderme hatası:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let pool;
  try {
    pool = await sql.connect(sqlConfig);

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
        CAST(ISNULL(d.DEPO_MIKTAR, 0) AS DECIMAL(18,0)) AS DEPO_MIKTAR,
        dbo.trk(f.ACIK1) AS SIPARIS_NOTU
      FROM TBLSIPATRA p
      INNER JOIN SonFisler sf ON p.FISNO = sf.FISNO
      LEFT JOIN TBLSTSABIT s ON p.STOK_KODU = s.STOK_KODU
      LEFT JOIN DepoMiktar d ON p.STOK_KODU = d.STOK_KODU
      LEFT JOIN TBLFATUEK f ON p.FISNO = f.FATIRSNO
      ORDER BY p.FISNO DESC, p.STOK_KODU;
    `);

    const rows = result.recordset;

    // Benzersiz siparişler (orders tablosu için)
    const uniqueOrders = Array.from(
      new Map(rows.map((row) => [temizleFisno(row.FISNO), row])).values()
    )
      .map((order) => ({
        fisno: temizleFisno(order.FISNO),
        carikod: order.STHAR_CARIKOD || null,
        siparis_notu: order.SIPARIS_NOTU || null,
        created_at: new Date().toISOString(),
      }))
      .filter((o) => o.fisno);

    // Sipariş kalemleri (order_items tablosu için)
    const orderItems = rows
      .map((row) => ({
        fisno: temizleFisno(row.FISNO),
        stok_kodu: row.STOK_KODU,
        sthar_gcmik: row.STHAR_GCMIK,
        sthar_bf: row.STHAR_BF,
        sthar_satisk: row.STHAR_SATISK,
        sthar_carikod: row.STHAR_CARIKOD,
        kod_5: row.KOD_5,
        depo_miktar: row.DEPO_MIKTAR,
      }))
      .filter((item) => item.fisno);

    // Supabase'e orders upsert
    const { error: orderError } = await supabase.from("orders").upsert(uniqueOrders, {
      onConflict: ["fisno"],
    });
    if (orderError) {
      console.error("Orders upsert hatası:", orderError);
      return res.status(500).json({ message: "Supabase orders hatası: " + orderError.message });
    }

    // Supabase'e order_items upsert
    const { error: itemsError } = await supabase.from("order_items").upsert(orderItems, {
      onConflict: ["fisno", "stok_kodu"],
    });
    if (itemsError) {
      console.error("Order_items upsert hatası:", itemsError);
      return res.status(500).json({ message: "Supabase order_items hatası: " + itemsError.message });
    }

    // Son 10 sipariş numarasını al
    const latestFisnos = uniqueOrders.map((o) => o.fisno).filter(Boolean);
    console.log("Supabase'te tutulacak son 10 fiş:", latestFisnos);

    // Silme işlemleri (eski siparişler temizleniyor)
    if (latestFisnos.length > 0) {
      const latestFisnoSet = new Set(latestFisnos);

      const { data: allOrders, error: fetchError } = await supabase.from("orders").select("fisno");

      if (fetchError) {
        console.error("Orders listeleme hatası:", fetchError);
        return res.status(500).json({ message: "Orders listeleme hatası: " + fetchError.message });
      }

      const fisnosToDelete = allOrders
        .map((o) => o.fisno)
        .filter((fis) => !latestFisnoSet.has(fis));

      if (fisnosToDelete.length > 0) {
        const { error: deleteOrdersError } = await supabase.from("orders").delete().in("fisno", fisnosToDelete);
        if (deleteOrdersError) {
          console.error("Orders silme hatası:", deleteOrdersError);
          return res.status(500).json({ message: "Orders silme hatası: " + deleteOrdersError.message });
        }

        const { error: deleteItemsError } = await supabase.from("order_items").delete().in("fisno", fisnosToDelete);
        if (deleteItemsError) {
          console.error("Order_items silme hatası:", deleteItemsError);
          return res.status(500).json({ message: "Order_items silme hatası: " + deleteItemsError.message });
        }

        const { error: deleteSelectionsError } = await supabase.from("order_item_selections").delete().in("fisno", fisnosToDelete);
        if (deleteSelectionsError) {
          console.error("Order_item_selections silme hatası:", deleteSelectionsError);
          return res.status(500).json({ message: "Order_item_selections silme hatası: " + deleteSelectionsError.message });
        }
      }
    } else {
      console.warn("latestFisnos dizisi boş, silme işlemi atlandı.");
    }

// --- Bildirim gönderme bölümü ---
const { data: subscriptions, error: subError } = await supabase
  .from('push_subscriptions')
  .select('*');

if (subError) {
  console.error("Abonelikler çekilemedi:", subError);
} else if (subscriptions.length > 0 && uniqueOrders.length > 0) {
  const latestOrder = uniqueOrders[0];

  const payload = JSON.stringify({
    title: "Yeni Sipariş Geldi!",
    body: `Sipariş No: ${latestOrder.fisno}`,
    data: {
      url: `/fisno=${latestOrder.fisno}`
    }
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      if (!sub.subscription) return;

      let subscriptionObj = sub.subscription;
      if (typeof subscriptionObj === 'string') {
        try {
          subscriptionObj = JSON.parse(subscriptionObj);
        } catch {
          return; // Parse hatası varsa atla
        }
      }

      try {
        await sendPushNotification(subscriptionObj, payload);
      } catch (e) {
        const statusCode = e.statusCode || e.status || 0;
        if (statusCode === 410 || statusCode === 404) {
          console.log(`Abonelik geçersiz, siliniyor: ${subscriptionObj.endpoint}`);
          const { error: delError } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscriptionObj.endpoint);
          if (delError) console.error('Abonelik silme hatası:', delError);
        } else {
          console.error('Bildirim gönderme hatası:', e);
        }
      }
    })
  );
}




    return res.status(200).json({ message: "Siparişler başarıyla güncellendi, eski fişler temizlendi ve bildirimler gönderildi!" });
  } catch (err) {
    console.error("Hata:", err);
    return res.status(500).json({ message: "Sunucu hatası: " + err.message });
  } finally {
    if (pool) await pool.close();
  }
}
