import { useEffect, useState } from "react";

export default function Home() {
  const [orders, setOrders] = useState([]); // Tüm sipariş verisi
  const [selections, setSelections] = useState({}); // { fisno: { item_index: true } }
  const [selectedFisno, setSelectedFisno] = useState("");
  const [status, setStatus] = useState("");

  // Popup state'leri
  const [imgPopupSrc, setImgPopupSrc] = useState("");
  const [cariPopupVisible, setCariPopupVisible] = useState(false);
  const [cariIframeSrc, setCariIframeSrc] = useState("");

  useEffect(() => {
    fetchOrders();
    fetchSelections();
  }, []);

  async function fetchOrders() {
    setStatus("Siparişler yükleniyor...");
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Sipariş verisi alınamadı");
      const data = await res.json();
      setOrders(data);
      setStatus("");
    } catch (e) {
      setStatus("Sipariş yükleme hatası: " + e.message);
    }
  }

  async function fetchSelections() {
    try {
      const res = await fetch("/api/selections");
      if (!res.ok) throw new Error("Seçimler alınamadı");
      const data = await res.json();
      const obj = {};
      data.forEach(({ fisno, item_index, selected }) => {
        if (!obj[fisno]) obj[fisno] = {};
        obj[fisno][item_index] = selected;
      });
      setSelections(obj);
    } catch (e) {
      setStatus("Seçim yükleme hatası: " + e.message);
    }
  }

  async function toggleSelection(fisno, item_index, checked) {
    setSelections((prev) => {
      const newSel = { ...prev };
      if (!newSel[fisno]) newSel[fisno] = {};
      newSel[fisno][item_index] = checked;
      return newSel;
    });

    try {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fisno, item_index, selected: checked }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert("Sunucu hatası: " + text);
      }
    } catch (e) {
      alert("İşlem sırasında hata: " + e.message);
    }
  }

  // Stok kodundaki marka ve gereksiz kısımları temizleyen fonksiyon
  function temizleStokKodu(stok) {
    if (!stok) return "";
    return stok
      .replace(
        / BSCH| FEBI\/SWAG| ACD| ACHR| ACORN| AEM| AFK| AKS| ASP| AKSA| ALY| AML| ARC| ATE| AYF| BBT| BEHR| BERU| BEYAZ| BHR| BLS| BLUE| BOU| BRCH| BRD| BRM| BRS| BRSHG| BSG| BTAP| BTP| BTR| BUBI| CDC| CHMP| CHMPN| CMPN| CP| CRB| CRT| DDC| DDCO| DKR| DLHP| DLP| DLPH| DMN| DNS| DODO| DR.MUL| DR.MULL| DRK| DUO| DV| ECO| ELTA| ELTH| EMA| EMR| ENG| ERA| ET.1| EURO| EX| EXP| EYM| FAE| FCT| FDR| FEBI| SWAG| FISPA| FLM| FMC| FNTCH| FOMO| FRZ| FSP| FTCH| GE| GE-1| GM| GRT| GUA| GÜNIŞIĞI| HID| HLL| HLX| HÜCO| IMPO| INT| INW| ITH-GERMANY| ITH| -GERMANY| ITM| JPG| JUST| KALE| KGN| KLF| KRK| KRM| KRS| LCS| LDR| LDSN| LEAD| LEIC| LILY| LTN| MAİS| MAİS-OEM| MARS| MAVİ| MCR| MEAT| MGA| MGCVCE| MHL| MITA| MLL| MLS| MLST| MOBİL| MONO| MOR| MOTO| MOTO-2| MOTOR| MRL| MTA| MTCR| MTE| MTRO| MXL| MYL| NAITE| NAİS| NGK| NGR| NMDRN| NRL| NRS| NRSY| NRV| NTK| NWLGHT| NWR| OEM| OEM-MAİS| OES| OLYM| OMR| OPLC| OSCR| OSR| PG| PHLS| PHTN| PLK| PNH| PRBG| PRE| PRM| PRO| PWR| RAINY| RCK| RD| RING| RNG| RNR| RTHN| SAN| SCH| SDT| SEI| SEIM| NEIM| SGM| SGR| SIEM| SK| SKT| SM| SND| SNG| SNL| SNS| SNST| SNT| SPC| SPOT| SWAG| SWB| SWG| TAMA| TAP| TAS| TDS| THR| TKN| TMC| TMS| TPR| TRP| TRTN| TRUCKTEC| TRW| TRX| TSHB| VKN| TYCO| U.TECH| ULM| ULT| UNI| UNPRT| UNU| UNV| UST| VAE| VDO| VEKA| VEMO| VIKA| VLO| VLS| VRT| VSL| WAB| WBC| WBR| WGBRG| WIN| WİN| WNDRP| WRY| WW| YEC| DRTL| YSD| ZERO| ZG| ZNR| ADL| NOVA| MG/g,
        ""
      )
      .trim();
  }

  // Seçili fisno'ya göre filtrelenmiş order_items
  const selectedOrder = orders.find((o) => o.fisno === selectedFisno);
  const orderItems = selectedOrder?.order_items ?? [];

  // Popup fonksiyonları
  const openCariPopup = (cariKod) => {
    setCariIframeSrc(
      "https://katalog.yigitotomotiv.com/etiket/cari?arama=" +
        encodeURIComponent(cariKod)
    );
    setCariPopupVisible(true);
  };
  const closeCariPopup = () => setCariPopupVisible(false);

  const openImgPopup = (src) => setImgPopupSrc(src);
  const closeImgPopup = () => setImgPopupSrc("");

  return (
    <>
      <style jsx>{`
        /* Burada CSS kodlarını aynen koyabilirsin, önceden verdiğin kod uygun */
      `}</style>

      <main>
        <h1>📦 Malzeme Toplama Fişi</h1>
        <button onClick={fetchOrders}>🔄 Siparişleri Yenile</button>

        <select
          value={selectedFisno}
          onChange={(e) => setSelectedFisno(e.target.value)}
          aria-label="Fiş seçiniz"
        >
          <option value="">Fiş Seçiniz...</option>
          {[...new Set(orders.map((o) => o.fisno))]
            .sort()
            .reverse()
            .map((fis) => (
              <option key={fis} value={fis}>
                {fis}
              </option>
            ))}
        </select>

        <div id="status" role="status" aria-live="polite">
          {status}
        </div>

        {selectedFisno && (
          <>
            <div className="fis-baslik">📄 FİŞ NO: {selectedFisno}</div>
            <div>
              {orderItems.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999" }}>
                  Bu fiş için sipariş bulunamadı.
                </p>
              ) : (
                orderItems.map((row, index) => {
                  const stokKodu = (row.STOK_KODU || "").toUpperCase();
                  const temizKod = stokKodu ? temizleStokKodu(stokKodu) : "";
                  const imageUrl = temizKod
                    ? `https://katalog.yigitotomotiv.com/resim/${encodeURIComponent(
                        temizKod
                      )}.jpg`
                    : "";

                  let markaClass = "";
                  if (stokKodu.includes("OEM")) markaClass = "marka-oem";
                  else if (stokKodu.includes("RNR")) markaClass = "marka-rnr";
                  else if (stokKodu.includes("PNH")) markaClass = "marka-pnh";

                  const isSelected = selections[selectedFisno]?.[index] === true;

                  return (
                    <div
                      key={`${row.STOK_KODU ?? index}_${index}`}
                      className={`item ${isSelected ? "selected" : ""} ${markaClass}`}
                    >
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={row.STOK_KODU || "Ürün resmi"}
                          loading="lazy"
                          onClick={() => openImgPopup(imageUrl)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openImgPopup(imageUrl);
                          }}
                          aria-label={`${row.STOK_KODU || "Ürün"} görselini büyüt`}
                        />
                      )}
                      <div className="stok-text">
                        {row.STOK_KODU || "-"}
                        <br />
                        <small>RAF: {row.KOD_5 || "-"}</small>
                      </div>
                      <div className="miktar-text">
                        <div style={{ color: "#388e3c" }}>🛒 Sepet:</div>
                        <div style={{ color: "#388e3c" }}>
                          {parseFloat(row.STHAR_GCMIK) || 0}
                        </div>
                        <div style={{ color: "#d32f2f" }}>🏬 Depo:</div>
                        <div style={{ color: "#d32f2f" }}>
                          {parseFloat(row.DEPO_MIKTAR) || 0}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={(e) =>
                          toggleSelection(selectedFisno, index, e.target.checked)
                        }
                        aria-label={`Sipariş ${row.STOK_KODU || ""} seçildi`}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                color: "#2b6cb0",
                cursor: "pointer",
                fontWeight: "600",
                textDecoration: "underline",
              }}
              onClick={() => {
                const cariKod = orderItems[0]?.STHAR_CARIKOD || "";
                if (cariKod) openCariPopup(cariKod);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const cariKod = orderItems[0]?.STHAR_CARIKOD || "";
                  if (cariKod) openCariPopup(cariKod);
                }
              }}
              aria-label="Cari bilgilerini aç"
            >
              Cari Kodu Göster
            </div>
          </>
        )}

        {/* Resim Popup */}
        {imgPopupSrc && (
          <div
            id="imgPopup"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={closeImgPopup}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeImgPopup();
            }}
            style={{ cursor: "pointer" }}
          >
            <img src={imgPopupSrc} alt="Büyük resim" />
          </div>
        )}

        {/* Cari Popup */}
        {cariPopupVisible && (
          <div
            id="cariPopup"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeCariPopup();
            }}
          >
            <div>
              <button
                className="closeBtn"
                onClick={closeCariPopup}
                aria-label="Cari popup kapat"
              >
                Kapat
              </button>
              <iframe src={cariIframeSrc} title="Cari Bilgisi" />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
