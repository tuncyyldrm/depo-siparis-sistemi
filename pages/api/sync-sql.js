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

async function syncData() {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT TOP 10 FISNO, STOK_KODU, STHAR_GCMIK, STHAR_BF, STHAR_SATISK, STHAR_CARIKOD
      FROM TBLSIPATRA
      ORDER BY FISNO DESC
    `);

    const rows = result.recordset;
    const { error } = await supabase.from("orders").upsert(rows);

    if (error) {
      console.error("Supabase error:", error);
    } else {
      console.log("Siparişler başarıyla Supabase'e aktarıldı!");
    }
  } catch (err) {
    console.error("Hata:", err);
  } finally {
    sql.close();
  }
}

syncData();
