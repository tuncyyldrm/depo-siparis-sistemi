import { useEffect, useState } from 'react';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [selections, setSelections] = useState({});
  const [selectedFisno, setSelectedFisno] = useState('');
  const [status, setStatus] = useState('');

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
        <button
          onClick={handleSync}
          className="bg-blue-600 text-white p-3 rounded"
          style={{ marginBottom: 10 }}
        >
          🔄 Siparişleri Yenile
        </button>
        <br />
        <label>Fiş Seçiniz: </label>
        <select
          value={selectedFisno}
          onChange={e => setSelectedFisno(e.target.value)}
          style={{ marginLeft: 10 }}
        >
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
            {orders
              .find(o => o.fisno === selectedFisno)
              ?.order_items?.map((item, i) => (
                <div key={i} style={{ 
                  border: '1px solid #ccc', 
                  marginBottom: 10, 
                  padding: 10, 
                  borderRadius: 5, 
                  backgroundColor: selections[selectedFisno]?.[i] ? '#d0f0d0' : '#fff' 
                }}>
                  <strong>{item.stok_kodu}</strong><br />
                  Miktar: {item.sthar_gcmik} | Depo: {item.depo_miktar ?? '-'}<br />
                  <label>
                    <input
                      type="checkbox"
                      checked={!!selections[selectedFisno]?.[i]}
                      onChange={e => toggleSelection(selectedFisno, i, e.target.checked)}
                    /> Seçildi
                  </label>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </main>
  );
}
