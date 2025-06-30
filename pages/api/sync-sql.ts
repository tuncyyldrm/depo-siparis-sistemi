import { NextApiRequest, NextApiResponse } from "next";
import sql from "mssql";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    // 1. SQL Server'dan veri çek
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT TOP 10 FISNO, STOK_KODU, STHAR_GCMIK, STHAR_BF, STHAR_SATISK, STHAR_CARIKOD
      FROM TBLSIPATRA
      ORDER BY FISNO DESC
    `);
    const rows = result.recordset;

    // 2. Supabase'e upsert et
    const { error } = await supabase.from("orders").upsert(rows);
    if (error) throw new Error("Supabase insert hatası: " + error.message);

    res.status(200).json({ message: "✅ Siparişler başarıyla Supabase'e aktarıldı!" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "❌ Hata: " + err.message });
  } finally {
    sql.close();
  }
}
