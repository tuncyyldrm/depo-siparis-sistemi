import type { NextApiRequest, NextApiResponse } from "next";
import sql from "mssql";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Only POST is supported." });
  }

  try {
    await sql.connect(sqlConfig);
    const result = await sql.query(`
      SELECT TOP 10 FISNO, STOK_KODU, STHAR_GCMIK, STHAR_BF, STHAR_SATISK, STHAR_CARIKOD
      FROM TBLSIPATRA
      ORDER BY FISNO DESC
    `);
    
    const rows = result.recordset;
    const { error } = await supabase.from("orders").upsert(rows);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ message: "Supabase hatası: " + error.message });
    }

    return res.status(200).json({ message: "Siparişler başarıyla Supabase'e aktarıldı!" });
  } catch (error: any) {
    console.error("Hata:", error);
    return res.status(500).json({ message: "Sunucu hatası: " + error.message });
  } finally {
    await sql.close();
  }
}
