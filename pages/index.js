import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [selections, setSelections] = useState({});
  const [selectedFisno, setSelectedFisno] = useState('');
  const [status, setStatus] = useState('');
  const [popupImage, setPopupImage] = useState(null);
  const [cariPopup, setCariPopup] = useState({ visible: false, url: '' });
  const imgPopupRef = useRef(null);

  function temizleStokKodu(stok) {
    return stok.replace(
      / BSCH| FEBI\/SWAG| ACD| ACHR| ACORN| AEM| AFK| AKS| ASP| AKSA| ALY| AML| ARC| ATE| AYF| BBT| BEHR| BERU| BEYAZ| BHR| BLS| BLUE| BOU| BRCH| BRD| BRM| BRS| BRSHG| BSG| BTAP| BTP| BTR| BUBI| CDC| CHMP| CHMPN| CMPN| CP| CRB| CRT| DDC| DDCO| DKR| DLHP| DLP| DLPH| DMN| DNS| DODO| DR.MUL| DR.MULL| DRK| DUO| DV| ECO| ELTA| ELTH| EMA| EMR| ENG| ERA| ET.1| EURO| EX| EXP| EYM| FAE| FCT| FDR| FEBI| SWAG| FISPA| FLM| FMC| FNTCH| FOMO| FRZ| FSP| FTCH| GE| GE-1| GM| GRT| GUA| GÜNIŞIĞI| HID| HLL| HLX| HÜCO| IMPO| INT| INW| ITH-GERMANY| ITH| -GERMANY| ITM| JPG| JUST| KALE| KGN| KLF| KRK| KRM| KRS| LCS| LDR| LDSN| LEAD| LEIC| LILY| LTN| MAİS| MAİS-OEM| MARS| MAVİ| MCR| MEAT| MGA| MGCVCE| MHL| MITA| MLL| MLS| MLST| MOBİL| MONO| MOR| MOTO| MOTO-2| MOTOR| MRL| MTA| MTCR| MTE| MTRO| MXL| MYL| NAITE| NAİS| NGK| NGR| NMDRN| NRL| NRS| NRSY| NRV| NTK| NWLGHT| NWR| OEM| OEM-MAİS| OES| OLYM| OMR| OPLC| OSCR| OSR| PG| PHLS| PHTN| PLK| PNH| PRBG| PRE| PRM| PRO| PWR| RAINY| RCK| RD| RING| RNG| RNR| RTHN| SAN| SCH| SDT| SEI| SEIM| NEIM| SGM| SGR| SIEM| SK| SKT| SM| SND| SNG| SNL| SNS| SNST| SNT| SPC| SPOT| SWAG| SWB| SWG| TAMA| TAP| TAS| TDS| THR| TKN| TMC| TMS| TPR| TRP| TRTN| TRUCKTEC| TRW| TRX| TSHB| VKN| TYCO| U.TECH| ULM| ULT| UNI| UNPRT| UNU| UNV| UST| VAE| VDO| VEKA| VEMO| VIKA| VLO| VLS| VRT| VSL| WAB| WBC| WBR| WGBRG| WIN| WİN| WNDRP| WRY| WW| YEC| DRTL| YSD| ZERO| ZG| ZNR| ADL| NOVA| MG/g, 
      ""
    ).trim();
  }

  useEffect(() => {
    fetchOrders();
    fetchSelections();
  }, []);

  const fetchOrders = async () => {
    try {
      setStatus('Siparişler yükleniyor...');
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error("Sipariş verisi alınamadı");
      const data = await res.json();
      setOrders(data);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus("Sipariş yükleme hatası: " + err.message);
    }
  };

  const fetchSelections = async () => {
    try {
      const res = await fetch('/api/selections');
      if (!res.ok) throw new Error("Seçimler verisi alınamadı");
      const data = await res.json();
      const obj = {};
      data.forEach(sel => {
        if (!obj[sel.fisno]) obj[sel.fisno] = {};
        obj[sel.fisno][sel.item_index] = sel.selected;
      });
      setSelections(obj);
    } catch (err) {
      console.error(err);
      setStatus("Seçim yükleme hatası: " + err.message);
    }
  };

  const toggleSelection = async (fisno, index, checked) => {
    setSelections(prev => {
      const newSel = { ...prev };
      if (!newSel[fisno]) newSel[fisno] = {};
      newSel[fisno][index] = checked;
      return newSel;
    });

    try {
      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fisno, item_index: index, selected: checked })
      });
      if (!response.ok) {
        const text = await response.text();
        alert("Sunucu hatası: " + text);
      }
    } catch (e) {
      alert("İşlem sırasında hata: " + e.message);
    }
  };

  const handleSync = async () => {
    try {
      setStatus("SQL'den Supabase'e senkronizasyon yapılıyor...");
      const response = await fetch('/api/sync-sql', { method: 'POST' });
      if (!response.ok) {
        const text = await response.text();
        alert("Sunucu hatası: " + text);
        return;
      }
      const data = await response.json();
      alert(data.message);
      await fetchOrders();
    } catch (e) {
      alert("İşlem sırasında hata: " + e.message);
    } finally {
      setStatus('');
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Depo Sipariş Sistemi</h1>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSync} className="bg-blue-600 text-white p-3 rounded" style={{ marginBottom: 10 }}>🔄 Siparişleri Yenile</button>
        <br />
        <label>Fiş Seçiniz: </label>
        <select value={selectedFisno} onChange={e => setSelectedFisno(e.target.value)} style={{ marginLeft: 10 }}>
          <option value="">-- Seçiniz --</option>
          {orders.map(order => (
            <option key={order.fisno} value={order.fisno}>{order.fisno}</option>
          ))}
        </select>
      </div>

      <p>{status}</p>

      <div>
        {selectedFisno && (
          <div>
            <h2>FİŞ NO: {selectedFisno}</h2>
            {orders.find(o => o.fisno === selectedFisno)?.order_items?.map((item, i) => {
              const temizKod = temizleStokKodu(item.stok_kodu);
              const imageUrl = `https://katalog.yigitotomotiv.com/resim/${encodeURIComponent(temizKod)}.jpg`;
              const stokKoduUpper = item.stok_kodu.toUpperCase();
              let markaClass = "";
              if (stokKoduUpper.includes("OEM")) markaClass = "marka-oem";
              else if (stokKoduUpper.includes("RNR")) markaClass = "marka-rnr";
              else if (stokKoduUpper.includes("PNH")) markaClass = "marka-pnh";

              return (
                <div key={i} className={`item ${markaClass}`} style={{
                  border: '1px solid #ccc', marginBottom: 10, padding: 10, borderRadius: 5,
                  backgroundColor: selections[selectedFisno]?.[i] ? '#d0f0d0' : '#fff',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <img src={imageUrl} alt={item.stok_kodu} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 5, cursor: 'zoom-in' }}
                    onClick={() => setPopupImage(imageUrl)} onError={e => { e.currentTarget.src = '/placeholder-image.png'; }} />
                  <div>
                    <strong>{item.stok_kodu}</strong><br />
                    Miktar: {item.sthar_gcmik} | Depo: {item.depo_miktar ?? '-'}<br />
                    Raf: {item.kod_5 ?? '-'}<br />
                    <span style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => setCariPopup({ visible: true, url: `https://katalog.yigitotomotiv.com/etiket/cari?arama=${encodeURIComponent(item.sthar_carikod)}` })}>
                      {item.sthar_carikod}
                    </span>
                    <br />
                    <label>
                      <input type="checkbox" checked={!!selections[selectedFisno]?.[i]} onChange={e => toggleSelection(selectedFisno, i, e.target.checked)} /> Seçildi
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {popupImage && (
        <div ref={imgPopupRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
          onClick={() => setPopupImage(null)}>
          <img src={popupImage} alt="Büyük görsel" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 10 }} />
        </div>
      )}

      {cariPopup.visible && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}>
          <div style={{ width: '90vw', height: '85vh', background: 'white', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
            <button onClick={() => setCariPopup({ visible: false, url: '' })} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: 'red', color: 'white', border: 'none', borderRadius: 5, padding: '6px 10px', cursor: 'pointer' }}>Kapat</button>
            <iframe src={cariPopup.url} style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
          </div>
        </div>
      )}
    </main>
  );
}
