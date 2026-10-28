import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { btnCls, btnGhostCls, cardCls, inputCls, ORDER_LABEL, ORDER_STEPS, peso } from '../lib/ui.js';

export default function OwnerDashboard() {
  const { session } = useAuth();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');

  const loadShop = useCallback(async () => {
    const { data } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setShop(data);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  if (loading) return <p className="text-stone-500">Loading…</p>;
  if (!shop) return <ShopApplication ownerId={session.user.id} onSubmitted={loadShop} />;

  if (shop.status === 'pending') {
    return (
      <div className={cardCls}>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="mt-2 text-stone-600">Your application is under review. We'll let you know once an admin approves it.</p>
      </div>
    );
  }

  if (shop.status === 'rejected') {
    return (
      <div className={cardCls}>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="mt-2 text-red-600">Your application was rejected.</p>
        {shop.rejection_reason && <p className="mt-1 text-stone-600">Reason: {shop.rejection_reason}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{shop.name} — Dashboard</h1>
        <div className="mt-4 flex gap-2">
          {['products', 'orders'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
                    className={tab === t ? btnCls : btnGhostCls}>
              {t === 'products' ? 'Products' : 'Orders'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'products' ? <ProductsTab shopId={shop.id} /> : <OrdersTab shopId={shop.id} />}
    </div>
  );
}

// ---------- Shop application ----------------------------------------

function ShopApplication({ ownerId, onSubmitted }) {
  const [form, setForm] = useState({
    name: '', description: '', address: '', contact_phone: '',
    contact_email: '', business_hours: '', delivery_info: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.from('shops').insert({ ...form, owner_id: ownerId });
    setBusy(false);
    if (error) return setError(error.message);
    onSubmitted();
  }

  return (
    <div className={`mx-auto max-w-2xl ${cardCls}`}>
      <h1 className="text-2xl font-bold">Apply to open your coffee shop</h1>
      <p className="mt-1 text-sm text-stone-600">An admin will review your application before your shop goes live.</p>

      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input className={inputCls} placeholder="Shop name *" value={form.name} onChange={update('name')} required />
        <input className={inputCls} placeholder="Phone" value={form.contact_phone} onChange={update('contact_phone')} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Address" value={form.address} onChange={update('address')} />
        <textarea className={`${inputCls} sm:col-span-2`} rows={3} placeholder="Description" value={form.description} onChange={update('description')} />
        <input className={inputCls} type="email" placeholder="Contact email" value={form.contact_email} onChange={update('contact_email')} />
        <input className={inputCls} placeholder="Business hours (e.g. 7AM–9PM)" value={form.business_hours} onChange={update('business_hours')} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Delivery info (areas, fees)" value={form.delivery_info} onChange={update('delivery_info')} />
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <button className={`${btnCls} sm:col-span-2`} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}

// ---------- Products ------------------------------------------------

function ProductsTab({ shopId }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '', category: '', price: '', description: '', image_url: '', sizes: '', stock: '',
  });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('products').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
    setProducts(data ?? []);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function addProduct(e) {
    e.preventDefault();
    setError('');
    const sizes = form.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from('products').insert({
      shop_id: shopId,
      name: form.name,
      category: form.category || null,
      price: Number(form.price),
      description: form.description || null,
      image_url: form.image_url || null,
      sizes,
      stock: Number(form.stock) || 0,
    });
    if (error) return setError(error.message);
    setForm({ name: '', category: '', price: '', description: '', image_url: '', sizes: '', stock: '' });
    load();
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    load();
  }

  async function updateStock(p, value) {
    await supabase.from('products').update({ stock: Math.max(0, Number(value)) }).eq('id', p.id);
    load();
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={addProduct} className={`${cardCls} h-fit space-y-3`}>
        <h2 className="font-semibold">Add product</h2>
        <input className={inputCls} placeholder="Name *" value={form.name} onChange={update('name')} required />
        <input className={inputCls} placeholder="Category (e.g. Hot Coffee)" value={form.category} onChange={update('category')} />
        <input className={inputCls} type="number" step="0.01" min="0" placeholder="Price *" value={form.price} onChange={update('price')} required />
        <input className={inputCls} placeholder="Sizes, comma-separated (e.g. S, M, L)" value={form.sizes} onChange={update('sizes')} />
        <input className={inputCls} type="number" min="0" placeholder="Stock" value={form.stock} onChange={update('stock')} />
        <input className={inputCls} placeholder="Image URL" value={form.image_url} onChange={update('image_url')} />
        <textarea className={inputCls} rows={2} placeholder="Description" value={form.description} onChange={update('description')} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${btnCls} w-full`}>Add product</button>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {products.length === 0 && <p className="text-stone-500">No products yet.</p>}
        {products.map((p) => (
          <div key={p.id} className={`${cardCls} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="font-semibold">
                {p.name} {!p.is_active && <span className="text-xs text-stone-500">(hidden)</span>}
              </p>
              <p className="text-sm text-stone-600">
                {peso(p.price)} · {p.category || 'Uncategorized'} · {p.sizes?.join(', ') || 'No sizes'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-600">
                Stock
                <input
                  type="number"
                  defaultValue={p.stock}
                  onBlur={(e) => e.target.value !== String(p.stock) && updateStock(p, e.target.value)}
                  className="ml-2 w-20 rounded border border-stone-300 px-2 py-1 text-sm"
                />
              </label>
              <button className={btnGhostCls} onClick={() => toggleActive(p)}>
                {p.is_active ? 'Hide' : 'Show'}
              </button>
              <button className="text-sm text-red-600 hover:underline" onClick={() => remove(p)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Orders --------------------------------------------------

function OrdersTab({ shopId }) {
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    load();
  }

  if (orders.length === 0) return <p className="text-stone-500">No orders yet.</p>;

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className={cardCls}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{peso(o.total)} · {o.payment_method.toUpperCase()}</p>
              <p className="text-xs text-stone-500">{new Date(o.created_at).toLocaleString('en-PH')}</p>
              <p className="mt-1 text-sm text-stone-600">📍 {o.delivery_address}</p>
              <ul className="mt-2 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id}>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</li>
                ))}
              </ul>
            </div>
            <select
              className={`${inputCls} w-auto`}
              value={o.status}
              onChange={(e) => setStatus(o.id, e.target.value)}
            >
              {[...ORDER_STEPS, 'cancelled'].map((s) => (
                <option key={s} value={s}>{ORDER_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
