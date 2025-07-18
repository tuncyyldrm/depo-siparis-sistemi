import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import cleanTerms from '../data/cleanTerms';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [selections, setSelections] = useState({});
  const [selectedFisno, setSelectedFisno] = useState('');
  const [status, setStatus] = useState('');
  const [imgPopup, setImgPopup] = useState({ visible: false, src: '', alt: '' });
  const [cariPopup, setCariPopup] = useState({ visible: false, url: '' });
  const [cariMap, setCariMap] = useState({}); // cari kod → cari isim haritası

const regex = useMemo(() => {
  const escapedTerms = cleanTerms
    .filter(Boolean) // boş terimleri filtrele
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = `(${escapedTerms.join('|')})`;
  return new RegExp(pattern, 'gi'); // \b kaldırıldı çünkü bazı terimler / veya - içerebilir
}, [cleanTerms]);

  function temizleStokKodu(stok) {
    return stok.replace(regex, '').trim();
  }

  function normalizeCariKod(kod) {
    if (!kod) return '';
    return kod.replace(/\s+/g, '').toUpperCase();
  }

  useEffect(() => {
    fetchOrders();
    fetchSelections();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fisnoFromUrl = urlParams.get('fisno');
    if (fisnoFromUrl) setSelectedFisno(fisnoFromUrl);
  }, []);
  
  // 5. index.js (Client tarafı abone olma)
useEffect(() => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.register('/service-worker.js').then(async reg => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const existing = await reg.pushManager.getSubscription();
      if (!existing) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.error('VAPID_PUBLIC_KEY environment variable is missing!');
          return;
        }
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        await fetch('/api/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        });
      }
    });
  }
}, []);


// 6. Yardımcı fonksiyon
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
  // Google Sheets'ten cari verisi çek
  useEffect(() => {
    async function fetchCariData() {
      try {
        const sheetId = '1yzee6VpQWzoznwce2T7eFmPMniULr1Hy6LDQuaOozps';
        const apiKey = 'AIzaSyCQ_SmNuv0JxBBtaiSi7LGxPmeqOPygjYc';
        const sheetName = 'NETSİS';
        const range = 'A3:I';

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName + '!' + range)}?key=${apiKey}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Cari verisi alınamadı');

        const data = await res.json();
        const rows = data.values;

        if (!rows || rows.length < 2) {
          console.error('Yeterli veri yok veya başlık satırı eksik.');
          return;
        }

        const headers = rows[0];
        // Cari kod ve cari ad başlıklarını bul
        const cariKodHeader = headers.find(h => /cari.?kod/i.test(h)) || headers[0];
        const cariAdHeader = headers.find(h => /cari.?ad/i.test(h)) || headers[1];

        const parsedData = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] || '';
          });
          return obj;
        });

        const map = {};
        parsedData.forEach(item => {
          const kod = normalizeCariKod(item[cariKodHeader]);
          if (kod) {
            map[kod] = item[cariAdHeader] || '';
          }
        });

        setCariMap(map);
      } catch (error) {
        console.error('Cari veri çekme hatası:', error);
      }
    }

    fetchCariData();
  }, []);

  const fetchOrders = async () => {
    try {
      setStatus('Siparişler yükleniyor...');
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Sipariş verisi alınamadı');
      const data = await res.json();
      setOrders(data);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Sipariş yükleme hatası: ' + err.message);
    }
  };

  const fetchSelections = async () => {
    try {
      const res = await fetch('/api/selections');
      if (!res.ok) throw new Error('Seçimler verisi alınamadı');
      const data = await res.json();
      const obj = {};
      data.forEach(sel => {
        if (!obj[sel.fisno]) obj[sel.fisno] = {};
        obj[sel.fisno][sel.item_index] = sel.selected;
      });
      setSelections(obj);
    } catch (err) {
      console.error(err);
      setStatus('Seçim yükleme hatası: ' + err.message);
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
        body: JSON.stringify({ fisno, item_index: index, selected: checked }),
      });
      if (!response.ok) {
        const text = await response.text();
        alert('Sunucu hatası: ' + text);
      }
    } catch (e) {
      alert('İşlem sırasında hata: ' + e.message);
    }
  };

  const handleSync = async () => {
    try {
      setStatus("SQL'den Supabase'e senkronizasyon yapılıyor...");
      const response = await fetch('/api/sync-sql', { method: 'POST' });
      if (!response.ok) {
        const text = await response.text();
        alert('Sunucu hatası: ' + text);
        return;
      }
      const data = await response.json();
      alert(data.message);
      await fetchOrders();
    } catch (e) {
      alert('İşlem sırasında hata: ' + e.message);
    } finally {
      setStatus('');
    }
  };
  
const handlePrint = async () => {
  if (!selectedFisno) {
    alert('Lütfen önce bir fiş seçin!');
    return;
  }

  const selectedOrder = orders.find(o => o.fisno === selectedFisno);
  if (!selectedOrder || !selectedOrder.order_items) {
    alert('Seçili fişin ürün bilgisi bulunamadı!');
    return;
  }

  const selectedItems = selectedOrder.order_items;
  const rawCariKod = selectedOrder.carikod || '';
  const cariKod = normalizeCariKod(rawCariKod);
  const cariIsim = cariMap[cariKod] || 'Cari bilgi bulunamadı';
  const tarihSaat = new Date().toLocaleString('tr-TR');
  const siparis_notu = selectedOrder.siparis_notu || '';

  const toplamFiyat = selectedItems.reduce((sum, item) => {
    const fiyat = parseFloat(item.sthar_bf) || 0;
    const miktar = parseFloat(item.sthar_gcmik) || 0;
    return sum + fiyat * miktar;
  }, 0).toFixed(2);

  const toplamUrunAdedi = selectedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.sthar_gcmik) || 0);
  }, 0);

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Sipariş Hazırlama Fişi - ${selectedFisno}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; color: #000; }
      header { border-bottom: 2px solid #000; margin-bottom: 15px; padding-bottom: 10px; }
      .header-top { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; }
      .header-info div { margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #444; padding: 6px 8px; }
      th { background: #f0f0f0; }
      tbody tr { page-break-inside: avoid; break-inside: avoid; }
      tfoot td { font-weight: bold; text-align: right; border: none; font-size: 14px; }
      @media print {
        @page { margin: 1.5cm; }
        body { font-size: 12pt; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="header-top">
        <div>Fiş No: ${selectedFisno}</div>
        <div>Tarih: ${tarihSaat}</div>
      </div>
      <div class="header-info">
        <div><strong>Cari Kod:</strong> ${rawCariKod}</div>
        <div><strong>Cari İsim:</strong> ${cariIsim}</div>
        <div><strong>Not:</strong> ${siparis_notu}</div>
      </div>
    </header>
    <table>
      <thead>
        <tr>
          <th>Stok Kodu</th>
          <th>Not</th>
          <th>Miktar</th>
          <th>Depo Miktar</th>
          <th>Raf</th>
          <th>Birim Fiyat</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${selectedItems.map(item => {
          const birimFiyat = parseFloat(item.sthar_bf) || 0;
          const miktar = parseFloat(item.sthar_gcmik) || 0;
          const toplam = (birimFiyat * miktar).toFixed(2);
          return `
            <tr>
              <td>${item.stok_kodu}</td>
              <td></td>
              <td style="text-align:right">${miktar}</td>
              <td style="text-align:right">${item.depo_miktar ?? '-'}</td>
              <td>${item.KOD_5 ?? '-'}</td>
              <td style="text-align:right">${birimFiyat.toFixed(2)}</td>
              <td style="text-align:right">${toplam}</td>
            </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Toplam Ürün Adedi:</td>
          <td>${toplamUrunAdedi}</td>
          <td colspan="3">Toplam Fiyat:</td>
          <td>${toplamFiyat} ₺</td>
        </tr>
      </tfoot>
    </table>
  </body>
  </html>`;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  try {
    if (isMobile) {
      // Mobilde yeni sekmede PDF önizlemesi
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newTab = window.open(url, '_blank');
      if (!newTab) {
        alert("Yeni sekme açılamadı. Lütfen pop-up engelleyiciyi devre dışı bırakın.");
        return;
      }

    } else {
      // Masaüstü: doğrudan yazdır
      const printWindow = window.open('', '', 'width=900,height=700');
      if (!printWindow) {
        alert("Yazdırma penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.");
        return;
      }
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 800);
    }
  } catch (e) {
    alert("Yazdırma desteklenmiyor. Alternatif olarak ekran görüntüsü alabilirsiniz.");
    console.error(e);
  }
};

  const handleShare = () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: `Fiş No: ${selectedFisno}`,
          text: `Depo hazırlık için fiş: ${selectedFisno}`,
          url: shareUrl,
        })
        .catch(error => {
          console.error('Paylaşım hatası:', error);
          alert('Paylaşım iptal edildi veya desteklenmiyor.');
        });
    } else {
      // Web Share API yoksa kopyala
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert('Link kopyalandı!'))
        .catch(err => alert('Link kopyalanamadı: ' + err));
    }
  };

  const handleFisnoChange = value => {
    setSelectedFisno(value);

    const newUrl = new URL(window.location);
    if (value) {
      newUrl.searchParams.set('fisno', value);
    } else {
      newUrl.searchParams.delete('fisno');
    }
    window.history.pushState({}, '', newUrl);
  };

  return (
    <main className="container">
      <h1>Depo Sipariş Sistemi</h1>

      <div className="actions">
        <button onClick={handleSync}>Yenile</button>
        <select value={selectedFisno} onChange={e => handleFisnoChange(e.target.value)}>
          <option value="">-- Fiş Seçiniz --</option>
          {orders.map(order => (
            <option key={order.fisno} value={order.fisno}>
              {order.fisno}
            </option>
          ))}
        </select>
        {selectedFisno && <button onClick={handleShare}>Paylaş</button>}
        {selectedFisno && <button onClick={handlePrint}>Yazdır</button>}
      </div>

      <p className="status">{status}</p>

      <div>
        {selectedFisno &&
          (() => {
            const selectedOrder = orders.find(o => o.fisno === selectedFisno);
            if (!selectedOrder) return <p>Seçili fiş bulunamadı.</p>;

            const cariKod = normalizeCariKod(selectedOrder.carikod || '');
            const cariIsim = cariMap[cariKod] || 'Cari bilgi bulunamadı';

            return (
              <div>
                <h2>FİŞ NO: {selectedFisno}</h2>
                {selectedOrder.siparis_notu && (
                  <p
                    style={{
                      whiteSpace: 'pre-wrap',
                      marginTop: '8px',
                      fontStyle: 'italic',
                      color: '#444',
                    }}
                  >
                    <strong>Sipariş Notu: </strong>
                    {selectedOrder.siparis_notu}
                  </p>
                )}

                <div className="cari-box">
                  <strong>Cari Kod:</strong>{' '}
                  <span
                    className="cari-link"
                    onClick={() =>
                      setCariPopup({
                        visible: true,
                        url: `https://katalog.yigitotomotiv.com/etiket/cari?arama=${encodeURIComponent(
                          selectedOrder?.order_items?.[0]?.sthar_carikod ?? ''
                        )}`,
                      })
                    }
                  >
                    {selectedOrder?.order_items?.[0]?.sthar_carikod ?? '—'}
                  </span>
                  <br />
                  <small>
                    <strong>Cari İsim:</strong> {cariIsim}
                  </small>
                </div>

                {selectedOrder.order_items?.map((item, i) => {
                  const temizKod = temizleStokKodu(item.stok_kodu);
                  const imageUrl = `https://katalog.yigitotomotiv.com/resim/${encodeURIComponent(
                    temizKod
                  )}.jpg`;

                  const stokKodu = item.stok_kodu.toUpperCase();
                  let markaClass = '';
                  if (stokKodu.includes('OEM')) markaClass = 'marka-oem';
                  else if (stokKodu.includes('RNR')) markaClass = 'marka-rnr';
                  else if (stokKodu.includes('PNH')) markaClass = 'marka-pnh';

                  return (
                    <div
                      key={i}
                      className={`item-card ${
                        selections[selectedFisno]?.[i] ? 'selected' : ''
                      } ${markaClass}`}
                    >
                      <img
                        src={imageUrl}
                        alt={item.stok_kodu}
                        onClick={() =>
                          setImgPopup({ visible: true, src: imageUrl, alt: item.stok_kodu })
                        }
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                      />
                      <div className="info">
                        <div className="stok-info">{item.stok_kodu}</div>
                        <div className="stok-details p-2 border rounded-md bg-gray-50">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-sm text-gray-800">
                            <div>
                              <strong>Miktar:</strong> {item.sthar_gcmik}
                            </div>
                            <div>
                              <strong>Depo:</strong> {item.depo_miktar ?? '-'}
                            </div>
                          </div>
                          <label className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-sm text-gray-800">
                            <div>
                              <strong>Raf:</strong> {item.kod_5 ?? '-'}
                            </div>
                            <input
                              type="checkbox"
                              checked={!!selections[selectedFisno]?.[i]}
                              onChange={e => toggleSelection(selectedFisno, i, e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>Seçim</span>
                          </label>
                        </div>
                        {item.depo_miktar !== undefined && item.depo_miktar < 5 && (
                          <span className="status-badge">Stok Az</span>
                        )}
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
          <img
            src={imgPopup.src}
            alt={imgPopup.alt}
            className="popup-image"
            onClick={e => e.stopPropagation()}
          />
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
