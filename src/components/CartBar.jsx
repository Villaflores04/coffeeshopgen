import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '../lib/CartContext.jsx';
import { peso } from '../lib/format.js';

/** Mobile-only shortcut to the cart. On desktop the cart ticket sits beside the menu. */
export default function CartBar() {
  const { count, subtotal, shop } = useCart();
  const { pathname } = useLocation();
  // Closing hides the bar until something more is added to the cart.
  const [hiddenAt, setHiddenAt] = useState(0);
  if (!count || count <= hiddenAt || pathname === '/cart' || pathname === '/login') return null;

  return (
    <div className="animate-rise fixed inset-x-4 bottom-4 z-40 flex items-stretch overflow-hidden rounded-xl bg-ink-900 text-foam shadow-xl lg:hidden">
      <Link to="/cart" className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3.5 pl-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative shrink-0">
            <ShoppingBag className="size-5" aria-hidden />
            <span className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full bg-cherry-500 text-[10px] font-bold">{count}</span>
          </span>
          <span className="truncate text-sm font-semibold">View order from {shop?.name}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{peso(subtotal)}</span>
      </Link>
      <button onClick={() => setHiddenAt(count)} aria-label="Hide cart bar" className="grid w-12 shrink-0 place-items-center hover:bg-white/10">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
