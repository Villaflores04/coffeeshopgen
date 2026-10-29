import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useConfirm } from '../../lib/ConfirmContext.jsx';
import { useToast } from '../../lib/ToastContext.jsx';
import { dateTime, errMsg, peso } from '../../lib/format.js';
import { Badge, Button, EmptyState, PageHeading, Panel, Skeleton, Tabs, Thumb } from '../../components/ui.jsx';

function Stat({ label, value }) {
  return (
    <Panel className="p-5">
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
    </Panel>
  );
}

export default function AdminPanel() {
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [shops, setShops] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    const [s, st] = await Promise.all([
      supabase.from('shops').select('*, owner:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.rpc('admin_stats'),
    ]);
    setShops(s.data ?? []);
    setStats(st.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(shop, approve) {
    let reason = null;
    if (approve) {
      const ok = await confirm({ title: `Approve ${shop.name}?`, message: 'Its page goes live and the owner gets a dashboard.', confirmText: 'Approve' });
      if (!ok) return;
    } else {
      const res = await confirm({
        title: shop.status === 'approved' ? `Suspend ${shop.name}?` : `Reject ${shop.name}?`,
        message: 'The owner sees your reason and can fix things and apply again.',
        confirmText: shop.status === 'approved' ? 'Suspend shop' : 'Reject application',
        danger: true,
        input: { label: 'Reason for the owner', required: true },
      });
      if (!res) return;
      reason = res.value;
    }
    const { error } = await supabase.rpc('review_shop', { p_shop: shop.id, p_approve: approve, p_reason: reason });
    if (error) return toast.error(errMsg(error));
    toast.success(approve ? `${shop.name} is live.` : `${shop.name} was ${shop.status === 'approved' ? 'suspended' : 'rejected'}.`);
    load();
  }

  const byStatus = (s) => (shops ?? []).filter((x) => x.status === s);
  const shown = byStatus(tab);

  return (
    <div className="pt-8 sm:pt-12">
      <PageHeading title="Admin">Review shop applications and keep an eye on the marketplace.</PageHeading>

      {stats ? (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Live shops" value={stats.approved_shops} />
          <Stat label="Waiting for review" value={stats.pending_shops} />
          <Stat label="Customers" value={stats.customers} />
          <Stat label="Platform fees earned" value={peso(stats.platform_fees)} />
        </div>
      ) : (
        <Skeleton className="mb-10 h-28 w-full" />
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'pending', label: 'To review', count: byStatus('pending').length },
          { id: 'approved', label: 'Live' },
          { id: 'rejected', label: 'Rejected' },
        ]}
      />

      {shops === null && <Skeleton className="mt-6 h-40 w-full" />}
      {shops && shown.length === 0 && (
        <EmptyState title={tab === 'pending' ? 'Nothing to review' : 'No shops here'}>
          {tab === 'pending' ? 'New applications show up here.' : 'Shops with this status appear in this list.'}
        </EmptyState>
      )}

      <div className="mt-6 space-y-4">
        {shown.map((s) => (
          <Panel key={s.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <Thumb src={s.logo_url} className="size-14 rounded-lg" />
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold tracking-tight">{s.name}</h2>
                  {s.tagline && <p className="text-ink-700">{s.tagline}</p>}
                  <p className="mt-1 text-sm text-ink-600">
                    {s.owner?.full_name || 'Unnamed owner'}, applied {dateTime(s.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {s.status !== 'approved' && <Button variant="primary" size="sm" onClick={() => review(s, true)}>Approve</Button>}
                {s.status !== 'rejected' && <Button variant="danger" size="sm" onClick={() => review(s, false)}>{s.status === 'approved' ? 'Suspend' : 'Reject'}</Button>}
              </div>
            </div>

            <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ['Address', s.address],
                ['Phone', s.contact_phone],
                ['Email', s.contact_email],
                ['Hours', s.business_hours],
                ['Delivery', [s.delivery_fee > 0 ? peso(s.delivery_fee) : 'Free', s.min_order > 0 && `min. ${peso(s.min_order)}`, s.delivery_info].filter(Boolean).join(', ')],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-600">{k}</dt>
                  <dd className="font-medium">{v || 'Not provided'}</dd>
                </div>
              ))}
              {s.description && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-600">Description</dt>
                  <dd>{s.description}</dd>
                </div>
              )}
            </dl>

            {s.status === 'rejected' && s.rejection_reason && <p className="mt-4"><Badge tone="danger">Reason</Badge> <span className="text-sm">{s.rejection_reason}</span></p>}
          </Panel>
        ))}
      </div>
    </div>
  );
}
