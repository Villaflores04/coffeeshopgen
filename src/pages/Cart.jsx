import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCart } from '../lib/CartContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { btnCls, btnGhostCls, cardCls, inputCls, peso } from '../lib/ui.js';

export default function Cart() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cod');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (cart.items.length === 0) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/" className="mt-4 inline-block text-amber-700 underline">Browse shops</Link>
      </div>
    );
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!session) return navigate('/login', { state: { from: '/cart' } });

    setBusy(true);
    setError('');

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id: session.user.id,
        shop_id: cart.shop.id,
        total: cart.total,
        delivery_address: address,
        payment_method: payment,
      })
      .select()
      .single();

    if (orderErr) {
      setBusy(false);
      return setError(orderErr.message);
    }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        name: i.name,
        size: i.size,
        unit_price: i.price,
        quantity: i.qty,
      }))
    );

    if (itemsErr) {
      setBusy(false);
      return setError(itemsErr.message);
    }

    // Rewards: 1 point for every ₱100 spent.
    await supabase.from('reward_points').insert({
      customer_id: session.user.id,
      order_id: order.id,
      points: Math.floor(cart.total / 100),
      reason: 'Order purchase',
    });

    cart.clearCart();
    setBusy(false);
    navigate('/orders');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-bold">Your cart</h1>
        <p className="text-sm text-stone-600">From <span className="font-semibold">{cart.shop.name}</span></p>

        {cart.items.map((i) => (
          <div key={i.key} className={`${cardCls} flex items-center justify-between gap-4`}>
            <div>
              <p className="font-semibold">{i.name} {i.size && <span className="text-stone-500">({i.size})</span>}</p>
              <p className="text-sm text-stone-600">{peso(i.price)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button className={btnGhostCls} onClick={() => cart.updateQty(i.key, -1)}>−</button>
              <span className="w-6 text-center">{i.qty}</span>
              <button className={btnGhostCls} onClick={() => cart.updateQty(i.key, 1)}>+</button>
              <button className="ml-2 text-sm text-red-600 hover:underline"
                      onClick={() => cart.updateQty(i.key, -i.qty)}>Remove</button>
            </div>
          </div>
        ))}
      </section>

      <aside className={`${cardCls} h-fit`}>
        <h2 className="text-lg font-semibold">Checkout</h2>
        <p className="mt-2 flex justify-between text-lg font-bold">
          <span>Total</span><span>{peso(cart.total)}</span>
        </p>
        <p className="text-xs text-stone-500">You'll earn {Math.floor(cart.total / 100)} reward point(s).</p>

        <form onSubmit={placeOrder} className="mt-5 space-y-4">
          <textarea className={inputCls} rows={3} placeholder="Delivery address"
                    value={address} onChange={(e) => setAddress(e.target.value)} required />
          <select className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="cod">Cash on delivery</option>
            <option value="gcash">GCash</option>
            <option value="card">Card</option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className={`${btnCls} w-full`} disabled={busy}>
            {busy ? 'Placing order…' : session ? 'Place order' : 'Log in to order'}
          </button>
        </form>
      </aside>
    </div>
  );
}
