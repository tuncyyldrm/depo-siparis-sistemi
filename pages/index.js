import { useEffect, useState } from 'react';
import cleanTerms from '../data/cleanTerms';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [selections, setSelections] = useState({});
  const [selectedFisno, setSelectedFisno] = useState('');
  const [status, setStatus] = useState('');
  const [imgPopup, setImgPopup] = useState({ visible: false, src: '', alt: '' });
  const [cariPopup, setCariPopup] = useState({ visible: false, url: '' });

  const regex = new RegExp(
    `\\b(${cleanTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );

  function temizleStokKodu(stok) {
    return stok.replace(regex, '').trim();
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
    <main className="container">
      <h1>Depo Sipariş Sistemi</h1>

      <div className="actions">
        <button onClick={handleSync}>🔄 Siparişleri Yenile</button>
        <select value={selectedFisno} onChange={e => setSelectedFisno(e.target.value)}>
          <option value="">-- Fiş Seçiniz --</option>
          {orders.map(order => (
            <option key={order.fisno} value={order.fisno}>{order.fisno}</option>
          ))}
        </select>
      </div>

      <p className="status">{status}</p>

      <div>
        {selectedFisno && (() => {
          const selectedOrder = orders.find(o => o.fisno === selectedFisno);
          if (!selectedOrder) return <p>Seçili fiş bulunamadı.</p>;

          return (
            <div>
              <h2>FİŞ NO: {selectedFisno}</h2>
              <div className="cari-box">
                <strong>Cari Kod:</strong>{' '}
                <span
                  className="cari-link"
                  onClick={() => setCariPopup({
                    visible: true,
                    url: `https://katalog.yigitotomotiv.com/etiket/cari?arama=${encodeURIComponent(selectedOrder?.order_items?.[0]?.sthar_carikod ?? '')}`
                  })}
                >
                  {selectedOrder?.order_items?.[0]?.sthar_carikod ?? '—'}
                </span>
              </div>

              {selectedOrder.order_items?.map((item, i) => {
                const temizKod = temizleStokKodu(item.stok_kodu);
                const imageUrl = `https://katalog.yigitotomotiv.com/resim/${encodeURIComponent(temizKod)}.jpg`;

                const stokKodu = item.stok_kodu.toUpperCase();
                let markaClass = '';
                if (stokKodu.includes("OEM")) markaClass = 'marka-oem';
                else if (stokKodu.includes("RNR")) markaClass = 'marka-rnr';
                else if (stokKodu.includes("PNH")) markaClass = 'marka-pnh';

                return (
                  <div
                    key={i}
                    className={`item-card ${selections[selectedFisno]?.[i] ? 'selected' : ''} ${markaClass}`}
                  >
                    <img
                      src={imageUrl}
                      alt={item.stok_kodu}
                      onClick={() => setImgPopup({ visible: true, src: imageUrl, alt: item.stok_kodu })}
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder-image.png';
                      }}
                    />
                    <div className="info">
                      <div className="stok-info">{item.stok_kodu}</div>
                      <div className="stok-details">
                        Miktar: {item.sthar_gcmik} | Depo: {item.depo_miktar ?? '-'} <br />
                        Raf: {item.KOD_5 ?? '-'}
                      </div>
                      {item.depo_miktar !== undefined && item.depo_miktar < 5 && (
                        <span className="status-badge">Stok Az</span>
                      )}
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={!!selections[selectedFisno]?.[i]}
                          onChange={e => toggleSelection(selectedFisno, i, e.target.checked)}
                        /> Seçildi
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Cari popup */}
      {cariPopup.visible && (
        <div
          className="popup-overlay"
          onClick={() => setCariPopup({ visible: false, url: '' })}
          role="dialog"
          aria-modal="true"
          aria-label="Cari Bilgi Popup"
        >
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button
              className="popup-close"
              onClick={() => setCariPopup({ visible: false, url: '' })}
              aria-label="Popup kapat"
            >
              ✖
            </button>
            <iframe src={cariPopup.url} title="Cari Bilgi" />
          </div>
        </div>
      )}

      {/* Resim büyütme popup */}
      {imgPopup.visible && (
        <div
          className="popup-overlay"
          onClick={() => setImgPopup({ visible: false, src: '', alt: '' })}
          role="dialog"
          aria-modal="true"
          aria-label="Büyük resim görüntüleme"
        >
          <img src={imgPopup.src} alt={imgPopup.alt} className="popup-image" onClick={e => e.stopPropagation()} />
          <button
            className="popup-close"
            onClick={() => setImgPopup({ visible: false, src: '', alt: '' })}
            aria-label="Resim popup kapat"
          >
            ✖
          </button>
        </div>
      )}
    </main>
  );
}
