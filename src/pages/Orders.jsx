import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useConfirm } from '../lib/ConfirmContext.jsx';
import { useToast } from '../lib/ToastContext.jsx';
import { useRealtime } from '../lib/useRealtime.js';
import { ORDER_LABEL } from '../lib/config.js';
import { dateTime, errMsg, orderNo, peso, pesoShort } from '../lib/format.js';
import OrderTracker from '../components/OrderTracker.jsx';
import { Badge, Button, EmptyState, LinkButton, Modal, PageHeading, Panel, Skeleton, StarInput, Textarea } from '../components/ui.jsx';

function ReviewModal({ order, onClose, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('submit_review', { p_order: order.id, p_rating: rating, p_comment: comment });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success('Thanks for the review.');
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`Rate ${order.shops?.name ?? 'this order'}`}>
      <form onSubmit={submit} className="space-y-5">
        <StarInput value={rating} onChange={setRating} />
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was your order? (optional)" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="dark" loading={busy}>Post review</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const placed = useLocation().state?.placed;

  const [orders, setOrders] = useState([]);
  const [reviewed, setReviewed] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([
      supabase.from('orders').select('*, shops(id,name), order_items(*)').order('created_at', { ascending: false }),
      supabase.from('reviews').select('order_id').eq('customer_id', user.id),
    ]);
    setOrders(o.data ?? []);
    setReviewed(new Set((r.data ?? []).map((x) => x.order_id)));
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  // The shop moves your order along; you see it change without refreshing.
  useRealtime('my-orders', 'orders', `customer_id=eq.${user.id}`, load);

  async function cancel(order) {
    const ok = await confirm({
      title: 'Cancel this order?',
      message: 'The shop will be told, and any points you used are returned.',
      confirmText: 'Cancel order',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc('set_order_status', { p_order: order.id, p_status: 'cancelled' });
    if (error) return toast.error(errMsg(error));
    toast.success('Order cancelled.');
    load();
  }

  return (
    <div className="pt-8 sm:pt-12">
      <PageHeading title="Your orders">Track what’s on its way and look back at what you’ve had.</PageHeading>

      {placed && (
        <p role="status" className="mb-6 flex items-center gap-2.5 rounded-lg bg-moss-100 px-4 py-3 text-sm font-medium text-moss-600">
          <Check className="size-4" aria-hidden /> Order placed. The tracker below updates as the shop works on it.
        </p>
      )}

      {loading && <Skeleton className="h-56 w-full" />}
      {!loading && orders.length === 0 && (
        <EmptyState icon={Receipt} title="No orders yet" action={<LinkButton to="/" variant="dark">Find a shop</LinkButton>}>
          When you order, you’ll be able to follow it here.
        </EmptyState>
      )}

      <div className="space-y-6">
        {orders.map((o) => {
          const active = !['delivered', 'cancelled'].includes(o.status);
          return (
            <Panel key={o.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/shops/${o.shops?.id}`} className="font-display text-2xl font-bold tracking-tight hover:underline">
                    {o.shops?.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-600">
                    <span className="font-mono">{orderNo(o.order_no)}</span> on {dateTime(o.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-medium">{peso(o.total)}</p>
                  {o.status === 'cancelled' ? <Badge tone="danger">Cancelled</Badge> : o.status === 'delivered' ? <Badge tone="success">Delivered</Badge> : <Badge tone="warn">{ORDER_LABEL[o.status]}</Badge>}
                </div>
              </div>

              <ul className="mt-4 space-y-1 text-[15px]">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4">
                    <span>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</span>
                    <span className="font-mono text-ink-700">{pesoShort(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
                {o.discount > 0 && (
                  <li className="flex justify-between gap-4 text-ink-600">
                    <span>{o.points_redeemed} points used</span>
                    <span className="font-mono">−{pesoShort(o.discount)}</span>
                  </li>
                )}
              </ul>

              {o.status !== 'cancelled' && (
                <div className="mt-6 border-t border-dashed border-ink-900/25 pt-5">
                  <OrderTracker status={o.status} />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-600">Delivering to {o.delivery_address}</p>
                <div className="flex gap-2">
                  {o.status === 'placed' && <Button variant="danger" size="sm" onClick={() => cancel(o)}>Cancel order</Button>}
                  {o.status === 'delivered' && !reviewed.has(o.id) && (
                    <Button variant="dark" size="sm" onClick={() => setReviewing(o)}>Rate this order</Button>
                  )}
                  {o.status === 'delivered' && reviewed.has(o.id) && <Badge>Reviewed</Badge>}
                </div>
              </div>
              {active && o.status !== 'placed' && <p className="mt-3 text-xs text-ink-600">The shop can cancel up to delivery. Contact them if something’s wrong.</p>}
            </Panel>
          );
        })}
      </div>

      {reviewing && (
        <ReviewModal
          order={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
