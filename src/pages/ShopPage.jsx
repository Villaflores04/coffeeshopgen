import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCart } from '../lib/CartContext.jsx';
import { btnCls, cardCls, peso } from '../lib/ui.js';

export default function ShopPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [chosenSize, setChosenSize] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('shops').select('*').eq('id', id).eq('status', 'approved').maybeSingle(),
      supabase.from('products').select('*').eq('shop_id', id).eq('is_active', true).order('category'),
    ]).then(([s, p]) => {
      setShop(s.data);
      setProducts(p.data ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-stone-500">Loading…</p>;
  if (!shop) return <p className="text-stone-500">This shop was not found.</p>;

  const categories = [...new Set(products.map((p) => p.category || 'Menu'))];

  return (
    <div className="space-y-8">
      <section className={`${cardCls} overflow-hidden p-0`}>
        <div className="h-48 bg-amber-100">
          {shop.cover_url && <img src={shop.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex items-end gap-4 p-6">
          <div className="-mt-16 h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-stone-200">
            {shop.logo_url && <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <p className="text-stone-600">{shop.description}</p>
          </div>
        </div>
        <div className="grid gap-2 border-t border-stone-200 px-6 py-4 text-sm text-stone-600 sm:grid-cols-3">
          <span>📍 {shop.address || 'Address not set'}</span>
          <span>🕒 {shop.business_hours || 'Hours not set'}</span>
          <span>📞 {shop.contact_phone || 'Contact not set'}</span>
        </div>
      </section>

      {products.length === 0 && <p className="text-stone-500">No products listed yet.</p>}

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-4 text-xl font-semibold">{cat}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => (p.category || 'Menu') === cat)
              .map((p) => {
                const sizes = p.sizes ?? [];
                const size = chosenSize[p.id] ?? sizes[0] ?? null;
                const outOfStock = p.stock <= 0;
                return (
                  <div key={p.id} className={`${cardCls} flex flex-col`}>
                    <div className="mb-3 h-32 overflow-hidden rounded-xl bg-stone-100">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                    </div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-stone-600">{p.description}</p>
                    <p className="mt-2 font-bold text-amber-800">{peso(p.price)}</p>

                    {sizes.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {sizes.map((s) => (
                          <button
                            key={s}
                            onClick={() => setChosenSize({ ...chosenSize, [p.id]: s })}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              size === s
                                ? 'border-amber-700 bg-amber-700 text-white'
                                : 'border-stone-300 text-stone-700'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      className={`${btnCls} mt-4`}
                      disabled={outOfStock}
                      onClick={() => addItem(shop, p, size)}
                    >
                      {outOfStock ? 'Out of stock' : 'Add to cart'}
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
