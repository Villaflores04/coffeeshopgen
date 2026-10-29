import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useCart } from '../lib/CartContext.jsx';
import { useToast } from '../lib/ToastContext.jsx';
import { MAX_REDEEM_RATIO, PAYMENT_METHODS, PESOS_PER_POINT_EARNED } from '../lib/config.js';
import { errMsg, peso, pesoShort } from '../lib/format.js';
import { QtyStepper } from '../components/CartTicket.jsx';
import { Ticket, TicketLine, TicketRule } from '../components/Ticket.jsx';
import { Button, EmptyState, Field, Input, LinkButton, Textarea, cn } from '../components/ui.jsx';

export default function Cart() {
  const cart = useCart();
  const { session, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [balance, setBalance] = useState(0);
  const [form, setForm] = useState({ phone: '', address: '', notes: '', payment: 'cod' });
  const [points, setPoints] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fresh delivery fee, minimum and open status for the shop in the cart.
  const shopId = cart.shop?.id;
  useEffect(() => {
    if (!shopId) return;
    supabase
      .from('shops')
      .select('id,name,delivery_fee,min_order,is_open')
      .eq('id', shopId)
      .maybeSingle()
      .then(({ data }) => setShop(data));
  }, [shopId]);

  // Points the customer can spend now.
  useEffect(() => {
    if (!session) return;
    supabase
      .from('reward_points')
      .select('points,status')
      .then(({ data }) =>
        setBalance((data ?? []).filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.points, 0))
      );
  }, [session]);

  // Prefill from the profile once it loads.
  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, phone: f.phone || profile.phone || '', address: f.address || profile.default_address || '' }));
  }, [profile]);

  const fee = Number(shop?.delivery_fee ?? cart.shop?.delivery_fee ?? 0);
  const minOrder = Number(shop?.min_order ?? cart.shop?.min_order ?? 0);
  const maxPoints = Math.max(0, Math.min(balance, Math.floor(cart.subtotal * MAX_REDEEM_RATIO)));
  const usedPoints = Math.min(points, maxPoints);
  const total = cart.subtotal + fee - usedPoints;
  const earn = Math.floor((cart.subtotal - usedPoints) / PESOS_PER_POINT_EARNED);
  const belowMin = cart.subtotal < minOrder;
  const closed = shop && !shop.is_open;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const lines = useMemo(() => cart.items, [cart.items]);

  if (cart.items.length === 0) {
    return (
      <EmptyState icon={ShoppingBag} title="Your order is empty" action={<LinkButton to="/" variant="dark">Browse shops</LinkButton>}>
        Pick a shop and add something to get started.
      </EmptyState>
    );
  }

  async function place(e) {
    e.preventDefault();
    if (!session) return navigate('/login', { state: { from: '/cart' } });

    setBusy(true);
    setError('');

    const { data, error: err } = await supabase.rpc('place_order', {
      p_shop: cart.shop.id,
      p_items: cart.items.map((i) => ({ product_id: i.productId, size: i.size, qty: i.qty })),
      p_address: form.address,
      p_phone: form.phone,
      p_payment: form.payment,
      p_points: usedPoints,
      p_notes: form.notes || null,
    });

    if (err) {
      setBusy(false);
      return setError(errMsg(err));
    }

    // Remember contact details for next time. A failure here shouldn't block the order.
    supabase.from('profiles').update({ phone: form.phone || null, default_address: form.address }).eq('id', session.user.id).then(refreshProfile);

    cart.clear();
    toast.success('Order placed. The shop has been notified.');
    navigate('/orders', { state: { placed: data } });
  }

  return (
    <div className="pt-8 pb-4 sm:pt-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Checkout</h1>
      <p className="mt-2 text-ink-700">
        Ordering from <Link to={`/shops/${cart.shop.id}`} className="font-semibold underline underline-offset-2">{cart.shop.name}</Link>
      </p>

      <form id="checkout" onSubmit={place} className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl font-bold">Delivery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" hint="The rider may call you.">
                <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Delivery address">
                  <Textarea rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" required />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Note for the shop (optional)">
                  <Input value={form.notes} onChange={set('notes')} placeholder="Less ice, extra napkins" />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={form.payment === m.id}
                  onClick={() => setForm({ ...form, payment: m.id })}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    form.payment === m.id ? 'border-ink-900 bg-foam ring-2 ring-ink-900' : 'border-ink-900/18 bg-foam hover:border-ink-900/50'
                  )}
                >
                  <span className="block font-semibold">{m.label}</span>
                  <span className="mt-0.5 block text-sm text-ink-600">{m.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-600">You pay when the order arrives. Card payments aren’t available yet.</p>
          </section>

          {session && balance > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold">Use your points</h2>
              <div className="mt-4 rounded-xl border border-ink-900/12 bg-foam p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-700">You have <strong>{balance}</strong> points. Each is worth ₱1, up to half your order.</span>
                  <span className="font-display text-2xl font-bold tabular-nums">{usedPoints}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  value={usedPoints}
                  disabled={maxPoints === 0}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  aria-label="Points to use"
                  className="mt-4 w-full accent-cherry-500"
                />
                {maxPoints === 0 && <p className="mt-2 text-sm text-ink-600">Add a bit more to your order to use points.</p>}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="sticky top-24">
            <Ticket>
              <p className="font-medium">{cart.shop.name}</p>
              <TicketRule />
              <ul className="space-y-3">
                {lines.map((i) => (
                  <li key={i.key}>
                    <TicketLine
                      left={<>{i.name}{i.size && <span className="text-ink-600"> ({i.size})</span>}</>}
                      right={pesoShort(i.unitPrice * i.qty)}
                    />
                    <div className="mt-1.5">
                      <QtyStepper value={i.qty} max={i.max} onChange={(q) => cart.setQty(i.key, q)} />
                    </div>
                  </li>
                ))}
              </ul>
              <TicketRule />
              <TicketLine left="Subtotal" right={peso(cart.subtotal)} />
              <TicketLine left="Delivery" right={fee > 0 ? peso(fee) : 'Free'} className="mt-1" />
              {usedPoints > 0 && <TicketLine left="Points" right={`−${peso(usedPoints)}`} className="mt-1" />}
              <TicketLine left="Total" right={peso(total)} strong className="mt-2" />
              <p className="mt-3 text-ink-600">You’ll earn {earn} point{earn === 1 ? '' : 's'} once it’s delivered.</p>

              {belowMin && <p role="alert" className="mt-3 font-sans text-sm text-cherry-600">The minimum order is {pesoShort(minOrder)}. Add {pesoShort(minOrder - cart.subtotal)} more.</p>}
              {closed && <p role="alert" className="mt-3 font-sans text-sm text-cherry-600">{shop.name} is closed right now.</p>}
              {error && <p role="alert" className="mt-3 font-sans text-sm text-cherry-600">{error}</p>}

              <Button form="checkout" variant="primary" size="lg" className="mt-4 w-full font-sans" loading={busy} disabled={belowMin || closed}>
                {session ? `Place order, ${peso(total)}` : 'Log in to place order'}
              </Button>
            </Ticket>
          </div>
        </aside>
      </form>
    </div>
  );
}
