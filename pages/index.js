import { useEffect, useState } from 'react';
import cleanTerms from '../data/cleanTerms';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [selections, setSelections] = useState({});
  const [selectedFisno, setSelectedFisno] = useState('');
  const [status, setStatus] = useState('');
  const [imgPopup, setImgPopup] = useState({ visible: false, src: '', alt: '' });
  const [cariPopup, setCariPopup] = useState({ visible: false, url: '' });
  const [cariMap, setCariMap] = useState({}); // cari kod → cari isim haritası

  const regex = new RegExp(
    `\\b(${cleanTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );

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





const handlePrint = () => {
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

  const htmlContent = `
    <html>
      <head>
        <title>Fiş No: ${selectedFisno} - Yazdır</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #444;
            padding: 8px 10px;
          }
          thead th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          /* Sütun genişlikleri */
          th.col-stok, td.col-stok {
            width: 25%;
            text-align: left;
          }
          th.col-note, td.col-note {
            width: 15%;
            text-align: right;
          }
          th.col-miktar, td.col-miktar,
          th.col-depomiktar, td.col-depomiktar,
          th.col-birimfiyat, td.col-birimfiyat,
          th.col-toplam, td.col-toplam {
            width: 10%-15%; /* toplam %100 tamamlayacak şekilde */
            text-align: right;
          }
          th.col-miktar, td.col-miktar { width: 10%; }
          th.col-depomiktar, td.col-depomiktar { width: 10%; }
          th.col-raf, td.col-raf {
            width: 10%;
            text-align: left;
          }
          th.col-birimfiyat, td.col-birimfiyat {
            width: 15%;
            text-align: right;
          }
          th.col-toplam, td.col-toplam {
            width: 15%;
            text-align: right;
          }
          /* note-cell boş hücre için genişlik ve sağa hizalama */
          td.note-cell {
            width: 10%;
            text-align: right;
          }
          tfoot tr td {
            border: none;
            font-weight: bold;
            font-size: 16px;
          }
          tfoot tr td.total-cell {
            text-align: right;
            padding-right: 15px;
          }
          @media print {
            @page {
              margin: 2cm;
            }
            body {
              margin: 0;
              padding-top: 4cm;
              font-size: 12pt;
            }
            header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 3.5cm;
              padding: 0
              background: #fff;
              border-bottom: 1px solid #000;
              align-items: center;
              font-size: 12pt;
              font-weight: bold;
            }
            header > div {
              white-space: nowrap;
            }
          }
          @media screen {
            header {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <div>Cari Kod: ${rawCariKod}</div>
          <div>Cari İsim: ${cariIsim}</div>
          <div>Fiş No: ${selectedFisno}</div>
          <div>Tarih Saat: ${tarihSaat}</div>
          <div>Not: ${siparis_notu}</div>
        </header>
        <table>
          <thead>
            <tr>
              <th class="col-stok">Stok Kodu</th>
              <th class="col-note">Not</th>
              <th class="col-miktar">Miktar</th>
              <th class="col-depomiktar">Depo Miktar</th>
              <th class="col-raf">Raf</th>
              <th class="col-birimfiyat">Birim Fiyat</th>
              <th class="col-toplam">Toplam Fiyat</th>
            </tr>
          </thead>
          <tbody>
            ${selectedItems
              .map(item => {
                const birimFiyat = parseFloat(item.sthar_bf) || 0;
                const miktar = parseFloat(item.sthar_gcmik) || 0;
                const toplam = (birimFiyat * miktar).toFixed(2);
                return `
              <tr>
                <td class="col-stok">${item.stok_kodu}</td>
                <td class="note-cell col-note"></td>
                <td class="col-miktar">${miktar}</td>
                <td class="col-depomiktar">${item.depo_miktar ?? '-'}</td>
                <td class="col-raf">${item.KOD_5 ?? '-'}</td>
                <td class="col-birimfiyat">${birimFiyat.toFixed(2)}</td>
                <td class="col-toplam">${toplam}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" class="total-cell">Toplam Fiyat:</td>
              <td class="col-toplam">${toplamFiyat} ₺</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=900,height=700');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
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
                    <strong>Sipariş Notu:</strong>
                    <br />
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
                              <strong>Raf:</strong> {item.KOD_5 ?? '-'}
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
