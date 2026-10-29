import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/CartContext.jsx';
import { peso } from '../lib/format.js';

/** Mobile-only shortcut to the cart. On desktop the cart ticket sits beside the menu. */
export default function CartBar() {
  const { count, subtotal, shop } = useCart();
  const { pathname } = useLocation();
  if (!count || pathname === '/cart' || pathname === '/login') return null;

  return (
    <Link
      to="/cart"
      className="animate-rise fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-xl bg-ink-900 px-5 py-3.5 text-foam shadow-xl lg:hidden"
    >
      <span className="flex items-center gap-3">
        <span className="relative">
          <ShoppingBag className="size-5" aria-hidden />
          <span className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full bg-cherry-500 text-[10px] font-bold">
            {count}
          </span>
        </span>
        <span className="text-sm font-semibold">View order from {shop?.name}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums">{peso(subtotal)}</span>
    </Link>
  );
}
