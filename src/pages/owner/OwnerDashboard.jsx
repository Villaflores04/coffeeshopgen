import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useToast } from '../../lib/ToastContext.jsx';
import { useRealtime } from '../../lib/useRealtime.js';
import { errMsg, isToday, peso } from '../../lib/format.js';
import { Badge, Button, PageHeading, Panel, Skeleton, Tabs, Toggle } from '../../components/ui.jsx';
import ShopForm from './ShopForm.jsx';
import OrdersTab from './OrdersTab.jsx';
import ProductsTab from './ProductsTab.jsx';

function Stat({ label, value, note }) {
  return (
    <Panel className="p-5">
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-600">{note}</p>}
    </Panel>
  );
}

export default function OwnerDashboard() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [shop, setShop] = useState(undefined); // undefined = loading, null = no shop
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('orders');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadShop = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('shops').select('*').eq('owner_id', user.id).maybeSingle();
    if (loadError) { setError(errMsg(loadError)); return; }
    setShop(data);
    refreshProfile();
  }, [user.id, refreshProfile]);

  const loadOrders = useCallback(async () => {
    if (!shop?.id) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
  }, [shop?.id]);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  const approved = shop?.status === 'approved';
  useEffect(() => {
    if (approved) loadOrders();
  }, [approved, loadOrders]);
  useRealtime('shop-orders', 'orders', approved ? `shop_id=eq.${shop.id}` : null, loadOrders);

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled');
    const today = live.filter((o) => isToday(o.created_at));
    const delivered = orders.filter((o) => o.status === 'delivered');
    return {
      todayOrders: today.length,
      todaySales: today.reduce((s, o) => s + Number(o.subtotal), 0),
      waiting: orders.filter((o) => o.status === 'placed').length,
      net: delivered.reduce((s, o) => s + Number(o.subtotal) - Number(o.platform_fee), 0),
    };
  }, [orders]);

  async function apply(values) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('shops').insert({ ...values, owner_id: user.id });
    setBusy(false);
    if (err) return setError(errMsg(err));
    toast.success('Application sent.');
    loadShop();
  }

  async function saveSettings(values) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('shops').update(values).eq('id', shop.id);
    setBusy(false);
    if (err) return setError(errMsg(err));
    toast.success('Shop updated.');
    loadShop();
  }

  async function setOpen(value) {
    const { error: err } = await supabase.from('shops').update({ is_open: value }).eq('id', shop.id);
    if (err) return toast.error(errMsg(err));
    setShop({ ...shop, is_open: value });
  }

  async function resubmit(values) {
    setBusy(true);
    setError('');
    const saved = await supabase.from('shops').update(values).eq('id', shop.id);
    if (saved.error) {
      setBusy(false);
      return setError(errMsg(saved.error));
    }
    const { error: err } = await supabase.rpc('resubmit_shop', { p_shop: shop.id });
    setBusy(false);
    if (err) return setError(errMsg(err));
    toast.success('Application sent again.');
    loadShop();
  }

  if (error && shop === undefined) return <Panel className="mt-10 p-5 text-sm">{error}<Button onClick={loadShop}>Retry</Button></Panel>;
  if (shop === undefined) return <Skeleton className="mt-10 h-72 w-full" />;

  if (shop === null) {
    return (
      <div className="mx-auto max-w-2xl pt-8 sm:pt-12">
        <PageHeading title="Open your coffee shop">
          Tell us about your shop. We’ll check the details, and once it’s approved your page goes live. We take 5% of each order.
        </PageHeading>
        <ShopForm submitLabel="Send application" onSubmit={apply} busy={busy} error={error} />
      </div>
    );
  }

  if (shop.status === 'pending') {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <Badge tone="warn">In review</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">We’re checking {shop.name}</h1>
        <p className="mt-3 text-ink-700">
          An admin is going through your details. When it’s approved, your shop page and dashboard open up here automatically.
        </p>
      </div>
    );
  }

  if (shop.status === 'rejected') {
    return (
      <div className="mx-auto max-w-2xl pt-8 sm:pt-12">
        <Badge tone="danger">Not approved</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">{shop.name} needs a few changes</h1>
        {shop.rejection_reason && (
          <p className="mt-4 rounded-lg bg-cherry-100 px-4 py-3 text-[15px] text-ink-900">
            <strong>Reason:</strong> {shop.rejection_reason}
          </p>
        )}
        <p className="mt-4 mb-10 text-ink-700">Update your details below and send the application again.</p>
        <ShopForm shop={shop} submitLabel="Save and resubmit" onSubmit={resubmit} busy={busy} error={error} />
      </div>
    );
  }

  if (shop.status === 'suspended') {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <Badge tone="danger">Shop suspended</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">{shop.name} is temporarily unavailable</h1>
        {shop.rejection_reason && <p className="mt-4 rounded-lg bg-cherry-100 px-4 py-3 text-left text-sm"><strong>Admin reason:</strong> {shop.rejection_reason}</p>}
        <p className="mt-4 text-ink-700">Your shop page and seller actions are paused. Existing order history is preserved. Contact the marketplace administrator if you need clarification.</p>
      </div>
    );
  }

  return (
    <div className="pt-8 sm:pt-12">
      <PageHeading
        title={shop.name}
        actions={
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2.5 text-sm font-semibold">
              <Toggle checked={shop.is_open} onChange={setOpen} label="Accepting orders" />
              {shop.is_open ? 'Accepting orders' : 'Paused'}
            </label>
            <Link to={`/shops/${shop.id}`} className="text-sm font-semibold underline underline-offset-2">View public page</Link>
          </div>
        }
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders today" value={stats.todayOrders} />
        <Stat label="Sales today" value={peso(stats.todaySales)} />
        <Stat label="Waiting for you" value={stats.waiting} note={stats.waiting ? 'Confirm these first' : 'All caught up'} />
        <Stat label="Net earnings" value={peso(stats.net)} note="Delivered orders, after the 5% fee" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'orders', label: 'Orders', count: stats.waiting },
          { id: 'products', label: 'Menu' },
          { id: 'settings', label: 'Shop settings' },
        ]}
      />

      <div className="mt-8">
        {tab === 'orders' && <OrdersTab orders={orders} reload={loadOrders} />}
        {tab === 'products' && <ProductsTab shopId={shop.id} />}
        {tab === 'settings' && (
          <div className="max-w-2xl">
            <ShopForm shop={shop} submitLabel="Save changes" onSubmit={saveSettings} busy={busy} error={error} />
          </div>
        )}
      </div>
    </div>
  );
}
