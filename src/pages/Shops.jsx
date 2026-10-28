import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { cardCls, inputCls } from '../lib/ui.js';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('shops')
      .select('id, name, description, cover_url, logo_url, address')
      .eq('status', 'approved')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) console.error(error);
        setShops(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-gradient-to-br from-amber-800 to-stone-900 p-10 text-white">
        <h1 className="text-4xl font-bold">Find your next cup</h1>
        <p className="mt-2 max-w-xl text-amber-100">
          Browse independent coffee shops, order for delivery, and earn points on every purchase.
        </p>
        <input
          className={`${inputCls} mt-6 max-w-md`}
          placeholder="Search coffee shops…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      {loading && <p className="text-stone-500">Loading shops…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-stone-500">No shops found yet.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((shop) => (
          <Link key={shop.id} to={`/shops/${shop.id}`}
                className={`${cardCls} overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="h-36 bg-amber-100">
              {shop.cover_url && (
                <img src={shop.cover_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-5">
              <h2 className="text-lg font-semibold">{shop.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-stone-600">{shop.description}</p>
              {shop.address && <p className="mt-3 text-xs text-stone-500">📍 {shop.address}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
