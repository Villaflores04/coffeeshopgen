import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useConfirm } from '../../lib/ConfirmContext.jsx';
import { useToast } from '../../lib/ToastContext.jsx';
import { NEXT_ACTION, ORDER_LABEL, PAYMENT_METHODS, nextStatus } from '../../lib/config.js';
import { dateTime, errMsg, orderNo, peso, pesoShort } from '../../lib/format.js';
import OrderTracker from '../../components/OrderTracker.jsx';
import { Badge, Button, EmptyState, Panel, Tabs } from '../../components/ui.jsx';

export default function OrdersTab({ orders, reload }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [filter, setFilter] = useState('active');
  const [busyId, setBusyId] = useState(null);

  const isActive = (o) => !['delivered', 'cancelled'].includes(o.status);
  const shown = orders.filter((o) => (filter === 'active' ? isActive(o) : filter === 'done' ? o.status === 'delivered' : o.status === 'cancelled'));

  async function move(order, status) {
    setBusyId(order.id);
    const { error } = await supabase.rpc('set_order_status', { p_order: order.id, p_status: status });
    setBusyId(null);
    if (error) return toast.error(errMsg(error));
    reload();
  }

  async function cancel(order) {
    const ok = await confirm({
      title: `Cancel order ${orderNo(order.order_no)}?`,
      message: 'The customer is told, stock goes back on your menu, and any points they used are returned.',
      confirmText: 'Cancel order',
      danger: true,
    });
    if (ok) move(order, 'cancelled');
  }

  return (
    <div>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: 'active', label: 'Active', count: orders.filter(isActive).length },
          { id: 'done', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ]}
      />

      {shown.length === 0 && (
        <EmptyState title={filter === 'active' ? 'No active orders' : 'Nothing here yet'}>
          {filter === 'active' ? 'New orders appear here the moment a customer places one.' : 'Orders show up here once they reach this status.'}
        </EmptyState>
      )}

      <div className="mt-6 space-y-5">
        {shown.map((o) => {
          const next = nextStatus(o.status);
          return (
            <Panel key={o.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-medium">{orderNo(o.order_no)}</p>
                  <p className="text-sm text-ink-600">{dateTime(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-medium">{peso(o.total)}</p>
                  <p className="text-sm text-ink-600">{PAYMENT_METHODS.find((m) => m.id === o.payment_method)?.label}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-1 text-[15px]">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4">
                    <span>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</span>
                    <span className="font-mono text-ink-700">{pesoShort(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-lg bg-steam-100 p-3.5 text-sm">
                <p className="font-semibold">{o.contact_name || 'Customer'}{o.contact_phone && <span className="font-normal text-ink-700">, {o.contact_phone}</span>}</p>
                <p className="mt-0.5 text-ink-700">{o.delivery_address}</p>
                {o.notes && <p className="mt-1.5 font-medium">Note: {o.notes}</p>}
              </div>

              {o.status !== 'cancelled' && <div className="mt-5"><OrderTracker status={o.status} /></div>}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                {o.status === 'delivered' ? <Badge tone="success">Delivered</Badge> : o.status === 'cancelled' ? <Badge tone="danger">Cancelled</Badge> : <Badge tone="warn">{ORDER_LABEL[o.status]}</Badge>}
                {isActive(o) && (
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => cancel(o)} disabled={busyId === o.id}>Cancel</Button>
                    {next && <Button variant="primary" size="sm" loading={busyId === o.id} onClick={() => move(o, next)}>{NEXT_ACTION[o.status]}</Button>}
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
