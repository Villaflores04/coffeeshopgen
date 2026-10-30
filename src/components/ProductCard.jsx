import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Store } from 'lucide-react';
import { useCart } from '../lib/CartContext.jsx';
import { pesoShort } from '../lib/format.js';
import { Badge, Thumb, cn } from './ui.jsx';

/** Grid card for one product. Used on the landing page and on every shop page. */
export default function ProductCard({ shop, product, isOwnShop = false, showShop = false }) {
  const { addItem } = useCart();
  const sizes = product.sizes ?? [];
  const [size, setSize] = useState(sizes[0]?.name ?? null);
  const extra = Number(sizes.find((s) => s.name === size)?.extra ?? 0);
  const out = product.stock <= 0;
  const blocked = out || !shop.is_open || isOwnShop;

  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border border-ink-900/10 bg-foam transition-shadow hover:shadow-lg">
      <div className="relative">
        <Thumb src={product.image_url} alt={product.name} className="aspect-square w-full" iconClass="size-9" />
        {out && (
          <span className="absolute inset-0 grid place-items-center bg-ink-950/55 text-sm font-bold text-foam">Sold out</span>
        )}
        {!out && product.stock <= 5 && (
          <Badge tone="warn" className="absolute top-2 left-2">{product.stock} left</Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 font-display text-[17px] leading-snug font-bold tracking-tight">{product.name}</h3>
        {product.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-600">{product.description}</p>}

        {showShop && (
          <Link to={`/shops/${shop.id}`} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:underline">
            <Store className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{shop.name}</span>
            {!shop.is_open && <span className="text-ink-500">(closed)</span>}
          </Link>
        )}

        {sizes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1" role="radiogroup" aria-label={`Size for ${product.name}`}>
            {sizes.map((s) => (
              <button
                key={s.name}
                type="button"
                role="radio"
                aria-checked={size === s.name}
                onClick={() => setSize(s.name)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
                  size === s.name ? 'border-ink-900 bg-ink-900 text-foam' : 'border-ink-900/18 text-ink-700 hover:border-ink-900/50'
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-display text-xl font-extrabold tabular-nums">{pesoShort(Number(product.price) + extra)}</span>
          <button
            type="button"
            onClick={() => addItem(shop, product, size)}
            disabled={blocked}
            aria-label={`Add ${product.name} to cart`}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-cherry-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-cherry-600 disabled:pointer-events-none disabled:bg-ink-900/12 disabled:text-ink-600"
          >
            {isOwnShop ? 'Your shop' : out ? 'Sold out' : !shop.is_open ? 'Closed' : <><Plus className="size-4" aria-hidden /> Add</>}
          </button>
        </div>
      </div>
    </li>
  );
}

export const ProductGrid = ({ children, narrow = false }) => (
  <ul className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3', narrow ? 'xl:grid-cols-3' : 'xl:grid-cols-4')}>{children}</ul>
);
