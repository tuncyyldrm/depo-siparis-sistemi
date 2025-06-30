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
    setStatus('Siparişler yükleniyor...');
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
    setStatus('');
  };

  const fetchSelections = async () => {
    const res = await fetch('/api/selections');
    const data = await res.json();
    // selections objesi: { [fisno]: { [item_index]: true/false } }
    const obj = {};
    data.forEach(sel => {
      if (!obj[sel.fisno]) obj[sel.fisno] = {};
      obj[sel.fisno][sel.item_index] = sel.selected;
    });
    setSelections(obj);
  };

  const toggleSelection = async (fisno, index, checked) => {
    setSelections(prev => {
      const newSel = { ...prev };
      if (!newSel[fisno]) newSel[fisno] = {};
      newSel[fisno][index] = checked;
      return newSel;
    });

    await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fisno, item_index: index, selected: checked })
    });
  };

  return (
    <main style={{ maxWidth: 800, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Depo Sipariş Sistemi</h1>
      <div>
<button
  onClick={async () => {
    try {
      const response = await fetch('/api/sync-sql.js', { method: 'POST' });
      if (!response.ok) {
        const text = await response.text();
        alert("Sunucu hatası: " + text);
        return;
      }
      const data = await response.json();
      alert(data.message);
    } catch (e) {
      alert("İşlem sırasında hata: " + e.message);
    }
  }}
  className="bg-blue-600 text-white p-3 rounded"
>
  🔄 Siparişleri Yenile
</button>


        <label>Fiş Seçiniz: </label>
        <select value={selectedFisno} onChange={e => setSelectedFisno(e.target.value)}>
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
            {orders.find(o => o.fisno === selectedFisno)?.order_items.map((item, i) => (
              <div key={i} style={{ 
                border: '1px solid #ccc', 
                marginBottom: 10, 
                padding: 10, 
                borderRadius: 5, 
                backgroundColor: selections[selectedFisno]?.[i] ? '#d0f0d0' : '#fff' 
              }}>
                <strong>{item.stok_kodu}</strong><br />
                Miktar: {item.sthar_gcmik} | Depo: {item.depo_miktar}<br />
                <label>
                  <input
                    type="checkbox"
                    checked={!!selections[selectedFisno]?.[i]}
                    onChange={e => toggleSelection(selectedFisno, i, e.target.checked)}
                  /> Seçildi
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
