import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { btnCls, btnGhostCls, cardCls } from '../lib/ui.js';

export default function AdminPanel() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('status', 'pending')
      .order('created_at');
    if (error) setError(error.message);
    setPending(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(shop, approve) {
    let reason = null;
    if (!approve) {
      reason = window.prompt(`Reason for rejecting "${shop.name}"?`);
      if (reason === null) return;
    }
    const { error } = await supabase.rpc('approve_shop', {
      p_shop: shop.id,
      p_approve: approve,
      p_reason: reason,
    });
    if (error) return setError(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shop applications</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pending.length === 0 && <p className="text-stone-500">No pending applications.</p>}

      {pending.map((s) => (
        <div key={s.id} className={`${cardCls} flex flex-wrap items-start justify-between gap-4`}>
          <div className="space-y-1 text-sm">
            <p className="text-lg font-semibold">{s.name}</p>
            <p className="text-stone-600">{s.description}</p>
            <p className="text-stone-500">📍 {s.address || '—'} · 📞 {s.contact_phone || '—'}</p>
            <p className="text-stone-500">🕒 {s.business_hours || '—'}</p>
            <p className="text-stone-500">🚚 {s.delivery_info || '—'}</p>
          </div>
          <div className="flex gap-2">
            <button className={btnCls} onClick={() => review(s, true)}>Approve</button>
            <button className={btnGhostCls} onClick={() => review(s, false)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
