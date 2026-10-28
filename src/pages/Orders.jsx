import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { cardCls, ORDER_LABEL, ORDER_STEPS, peso } from '../lib/ui.js';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, shops(name), order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setOrders(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-stone-500">Loading orders…</p>;
  if (orders.length === 0) return <p className="text-stone-500">You haven't placed any orders yet.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My orders</h1>

      {orders.map((o) => {
        const stepIndex = ORDER_STEPS.indexOf(o.status);
        return (
          <div key={o.id} className={cardCls}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{o.shops?.name}</p>
                <p className="text-xs text-stone-500">{new Date(o.created_at).toLocaleString('en-PH')}</p>
              </div>
              <p className="font-bold">{peso(o.total)}</p>
            </div>

            <ul className="mt-3 text-sm text-stone-600">
              {o.order_items.map((i) => (
                <li key={i.id}>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</li>
              ))}
            </ul>

            {o.status === 'cancelled' ? (
              <p className="mt-4 inline-block rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                Cancelled
              </p>
            ) : (
              <div className="mt-5 flex items-center gap-1 overflow-x-auto">
                {ORDER_STEPS.map((step, idx) => (
                  <div key={step} className="flex min-w-fit items-center gap-1">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx <= stepIndex ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-500'
                    }`}>
                      {idx <= stepIndex ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs ${idx <= stepIndex ? 'text-stone-800' : 'text-stone-400'}`}>
                      {ORDER_LABEL[step]}
                    </span>
                    {idx < ORDER_STEPS.length - 1 && <span className="mx-2 text-stone-300">—</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
