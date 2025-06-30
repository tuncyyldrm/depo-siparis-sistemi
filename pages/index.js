import { useEffect, useState } from "react";

export default function Home() {
  const [orders, setOrders] = useState([]); // tüm sipariş verisi
  const [selections, setSelections] = useState({}); // { fisno: { index: true } }
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

  async function toggleSelection(fisno, index, checked) {
    setSelections((prev) => {
      const newSel = { ...prev };
      if (!newSel[fisno]) newSel[fisno] = {};
      newSel[fisno][index] = checked;
      return newSel;
    });
    try {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fisno, item_index: index, selected: checked }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert("Sunucu hatası: " + text);
      }
    } catch (e) {
      alert("İşlem sırasında hata: " + e.message);
    }
  }

  function temizleStokKodu(stok) {
    return stok
      .replace(
        / BSCH| FEBI\/SWAG| ACD| ACHR| ACORN| AEM| AFK| AKS| ASP| AKSA| ALY| AML| ARC| ATE| AYF| BBT| BEHR| BERU| BEYAZ| BHR| BLS| BLUE| BOU| BRCH| BRD| BRM| BRS| BRSHG| BSG| BTAP| BTP| BTR| BUBI| CDC| CHMP| CHMPN| CMPN| CP| CRB| CRT| DDC| DDCO| DKR| DLHP| DLP| DLPH| DMN| DNS| DODO| DR.MUL| DR.MUL| DR.MULL| DR.MULL| DRK| DUO| DV| ECO| ELTA| ELTH| EMA| EMR| ENG| ERA| ET.1| EURO| EX| EXP| EYM| FAE| FCT| FDR| FEBI| SWAG| FISPA| FLM| FMC| FNTCH| FOMO| FRZ| FSP| FTCH| GE| GE-1| GM| GRT| GUA| GÜNIŞIĞI| HID| HLL| HLX| HÜCO| IMPO| INT| INW| ITH-GERMANY| ITH| -GERMANY| ITM| JPG| JUST| KALE| KGN| KLF| KRK| KRM| KRS| LCS| LDR| LDSN| LEAD| LEIC| LILY| LTN| MAİS| MAİS-OEM| MARS| MAVİ| MCR| MEAT| MGA| MGCVCE| MHL| MITA| MLL| MLS| MLST| MOBİL| MONO| MOR| MOTO| MOTO-2| MOTOR| MRL| MTA| MTCR| MTE| MTRO| MXL| MYL| NAITE| NAİS| NGK| NGR| NMDRN| NRL| NRS| NRSY| NRV| NTK| NWLGHT| NWR| OEM| OEM-MAİS| OES| OLYM| OMR| OPLC| OSCR| OSR| PG| PHLS| PHTN| PLK| PNH| PRBG| PRE| PRM| PRO| PWR| RAINY| RCK| RD| RING| RNG| RNR| RTHN| SAN| SCH| SDT| SEI| SEIM| NEIM| SGM| SGR| SIEM| SK| SKT| SM| SND| SNG| SNL| SNS| SNST| SNT| SPC| SPOT| SWAG| SWB| SWG| TAMA| TAP| TAS| TDS| THR| TKN| TMC| TMS| TPR| TRP| TRTN| TRUCKTEC| TRW| TRX| TSHB| VKN| TYCO| U.TECH| ULM| ULT| UNI| UNPRT| UNU| UNV| UST| VAE| VDO| VEKA| VEMO| VIKA| VLO| VLS| VRT| VSL| WAB| WBC| WBR| WGBRG| WIN| WİN| WNDRP| WRY| WW| YEC| DRTL| YSD| ZERO| ZG| ZNR| ADL| NOVA| MG/g,
        ""
      )
      .trim();
  }

  // seçili fişe göre filtreli siparişler
  const filteredOrders = selectedFisno
    ? orders.filter((o) => o.FISNO === selectedFisno)
    : [];

  // Popupları aç/kapat fonksiyonları
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
        main {
          max-width: 1000px;
          margin: auto;
          padding: 3vw 2vw;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          background: #f9f9f9;
          color: #222;
          font-size: 4vw;
        }
        h1,
        h2 {
          text-align: center;
          margin: 10px 0 20px;
        }
        select {
          display: block;
          margin: 0 auto 20px;
          padding: 14px 12px;
          font-size: 4vw;
          width: 100%;
          max-width: 320px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        button {
          display: block;
          margin: 0 auto 20px;
          padding: 8px 20px;
          font-size: 100%;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: background-color 0.3s ease;
        }
        button:hover,
        button:focus {
          background-color: #1565c0;
          outline: none;
        }
        #status {
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
          color: #444;
          min-height: 24px;
        }
        .fis-baslik {
          font-weight: bold;
          font-size: 1.2em;
          background: #e3e3e3;
          padding: 10px 12px;
          margin-top: 24px;
          margin-bottom: 10px;
          border-radius: 6px;
          text-align: center;
        }
        .item {
          display: grid;
          grid-template-columns: 16% 46% 24% 10%;
          background: white;
          padding: 10px;
          margin-bottom: 12px;
          border: 1px solid #ccc;
          border-radius: 10px;
          gap: 2%;
          align-items: center;
          transition: background-color 0.3s ease;
        }
        .item img {
          width: 100%;
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          cursor: zoom-in;
          user-select: none;
        }
        .stok-text {
          font-weight: 500;
          word-break: break-word;
        }
        .miktar-text {
          text-align: right;
          font-weight: bold;
          color: #333;
          display: grid;
          grid-template-columns: 65% 35%;
          font-size: 3vw;
        }
        input[type="checkbox"] {
          transform: scale(3.2);
          margin-left: 30%;
          margin-right: 40%;
          cursor: pointer;
        }
        .selected {
          background-color: #d0f0d0;
        }
        /* Popup styles */
        #imgPopup,
        #cariPopup {
          display: flex;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          justify-content: center;
          align-items: center;
        }
        #imgPopup img {
          max-width: 90vw;
          max-height: 90vh;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
        }
        #cariPopup > div {
          width: 90vw;
          height: 85vh;
          background: white;
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        #cariPopup button.closeBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          background: red;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: background-color 0.3s ease;
        }
        #cariPopup button.closeBtn:hover,
        #cariPopup button.closeBtn:focus {
          background-color: darkred;
          outline: none;
        }
        #cariPopup iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        @media (min-width: 1024px) {
          main {
            max-width: 1024px;
            padding: 0 20%;
            font-size: 1.5vw;
          }
          .miktar-text {
            font-size: 1.5vw;
          }
          select {
            font-size: 2vw;
          }
        }
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
          {[...new Set(orders.map((o) => o.FISNO))]
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
              {filteredOrders.length === 0 && (
                <p style={{ textAlign: "center", color: "#999" }}>
                  Bu fiş için sipariş bulunamadı.
                </p>
              )}
              {filteredOrders.map((row, index) => {
                const stokKodu = row.STOK_KODU.toUpperCase();
                const temizKod = temizleStokKodu(row.STOK_KODU);
                const imageUrl = `https://katalog.yigitotomotiv.com/resim/${encodeURIComponent(
                  temizKod
                )}.jpg`;

                // Markalar için sınıf isimleri (isteğe göre CSS ile stillendirilebilir)
                let markaClass = "";
                if (stokKodu.includes("OEM")) markaClass = "marka-oem";
                else if (stokKodu.includes("RNR")) markaClass = "marka-rnr";
                else if (stokKodu.includes("PNH")) markaClass = "marka-pnh";

                const isSelected = selections[selectedFisno]?.[index] === true;

                return (
                  <div
                    key={`${row.STOK_KODU}_${index}`}
                    className={`item ${isSelected ? "selected" : ""} ${markaClass}`}
                  >
                    <img
                      src={imageUrl}
                      alt={row.STOK_KODU}
                      loading="lazy"
                      onClick={() => openImgPopup(imageUrl)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openImgPopup(imageUrl);
                      }}
                      aria-label={`${row.STOK_KODU} görselini büyüt`}
                    />
                    <div className="stok-text">
                      {row.STOK_KODU}
                      <br />
                      <small>RAF: {row.KOD_5 || "-"}</small>
                    </div>
                    <div className="miktar-text">
                      <div style={{ color: "#388e3c" }}>🛒 Sepet:</div>
                      <div style={{ color: "#388e3c" }}>
                        {parseFloat(row.STHAR_GCMIK)}
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
                      aria-label={`Sipariş ${row.STOK_KODU} seçildi`}
                    />
                  </div>
                );
              })}
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
                const cariKod = filteredOrders[0]?.STHAR_CARIKOD || "";
                if (cariKod) openCariPopup(cariKod);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const cariKod = filteredOrders[0]?.STHAR_CARIKOD || "";
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
              <button className="closeBtn" onClick={closeCariPopup} aria-label="Cari popup kapat">
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
