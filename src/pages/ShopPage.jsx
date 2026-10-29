import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, ExternalLink, MapPin, Phone, Plus, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useCart } from '../lib/CartContext.jsx';
import { pesoShort, timeAgo } from '../lib/format.js';
import CartTicket from '../components/CartTicket.jsx';
import { Badge, EmptyState, Leader, LinkButton, Skeleton, Stars, Thumb, cn } from '../components/ui.jsx';

function MenuItem({ shop, product }) {
  const { addItem } = useCart();
  const sizes = product.sizes ?? [];
  const [size, setSize] = useState(sizes[0]?.name ?? null);
  const extra = Number(sizes.find((s) => s.name === size)?.extra ?? 0);
  const out = product.stock <= 0;
  const closed = !shop.is_open;

  return (
    <li className="flex gap-4 py-5">
      {product.image_url && <Thumb src={product.image_url} alt={product.name} className="size-20 rounded-lg sm:size-24" />}
      <div className="min-w-0 flex-1">
        <Leader
          left={<h3 className="font-display text-xl font-bold tracking-tight">{product.name}</h3>}
          right={<span className="font-semibold tabular-nums">{pesoShort(Number(product.price) + extra)}</span>}
        />
        {product.description && <p className="mt-0.5 text-[15px] text-ink-600">{product.description}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {sizes.length > 0 ? (
            <div className="inline-flex rounded-lg border border-ink-900/18 p-0.5" role="radiogroup" aria-label={`Size for ${product.name}`}>
              {sizes.map((s) => (
                <button
                  key={s.name}
                  role="radio"
                  aria-checked={size === s.name}
                  onClick={() => setSize(s.name)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    size === s.name ? 'bg-ink-900 text-foam' : 'text-ink-700 hover:bg-ink-900/6'
                  )}
                >
                  {s.name}
                  {Number(s.extra) > 0 && <span className="ml-1 opacity-70">+{pesoShort(s.extra)}</span>}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {!out && product.stock <= 5 && <Badge tone="warn">{product.stock} left</Badge>}
            <button
              onClick={() => addItem(shop, product, size)}
              disabled={out || closed}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-900/25 bg-foam px-3.5 text-sm font-semibold transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-foam disabled:pointer-events-none disabled:opacity-45"
            >
              {out ? 'Sold out' : <><Plus className="size-4" aria-hidden /> Add</>}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function ShopPage() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    Promise.all([
      supabase.from('shops').select('*').eq('id', id).eq('status', 'approved').maybeSingle(),
      supabase.from('products').select('*').eq('shop_id', id).eq('is_active', true).order('category').order('name'),
      supabase.from('shop_ratings').select('*').eq('shop_id', id).maybeSingle(),
      supabase.from('reviews').select('*').eq('shop_id', id).order('created_at', { ascending: false }).limit(6),
    ]).then(([s, p, r, rv]) => {
      if (!alive) return;
      setShop(s.data);
      setProducts(p.data ?? []);
      setRating(r.data);
      setReviews(rv.data ?? []);
      setState(s.data ? 'ready' : 'missing');
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const groups = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const k = p.category || 'Menu';
      map.set(k, [...(map.get(k) ?? []), p]);
    });
    return [...map.entries()];
  }, [products]);

  if (state === 'loading') return <Skeleton className="mt-8 h-96 w-full" />;
  if (state === 'missing') {
    return (
      <EmptyState title="We couldn’t find that shop" action={<LinkButton to="/" variant="dark">Browse shops</LinkButton>}>
        It may have closed, or the link is out of date.
      </EmptyState>
    );
  }

  const social = shop.social_links ?? {};

  return (
    <div className="pt-6 sm:pt-8">
      <div className="h-40 overflow-hidden rounded-2xl bg-kraft-200 sm:h-60">
        {shop.cover_url && <img src={shop.cover_url} alt="" className="size-full object-cover" />}
      </div>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Thumb src={shop.logo_url} alt="" className="size-20 rounded-xl border-4 border-steam-100 sm:-mt-14 sm:size-28" iconClass="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{shop.name}</h1>
            {shop.is_open ? <Badge tone="success">Open</Badge> : <Badge>Closed</Badge>}
          </div>
          {shop.tagline && <p className="mt-1.5 text-lg text-ink-700">{shop.tagline}</p>}
          {rating && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Stars value={rating.avg_rating} />
              <span className="font-semibold">{rating.avg_rating}</span>
              <span className="text-ink-600">from {rating.review_count} review{rating.review_count === 1 ? '' : 's'}</span>
            </p>
          )}
        </div>
      </header>

      <ul className="mt-6 grid gap-x-8 gap-y-2.5 text-[15px] text-ink-700 sm:grid-cols-2">
        {shop.address && <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{shop.address}</li>}
        {shop.business_hours && <li className="flex gap-2.5"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden />{shop.business_hours}</li>}
        {shop.contact_phone && <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden />{shop.contact_phone}</li>}
        <li className="flex gap-2.5">
          <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {shop.delivery_fee > 0 ? `${pesoShort(shop.delivery_fee)} delivery` : 'Free delivery'}
          {shop.min_order > 0 && `, minimum order ${pesoShort(shop.min_order)}`}
          {shop.delivery_info && `. ${shop.delivery_info}`}
        </li>
        {Object.entries(social).filter(([, v]) => v).map(([k, v]) => (
          <li key={k} className="flex gap-2.5">
            <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span><span className="capitalize">{k}</span>: {v}</span>
          </li>
        ))}
      </ul>
      {shop.description && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-700">{shop.description}</p>}

      {!shop.is_open && (
        <p className="mt-6 rounded-lg bg-kraft-200 px-4 py-3 text-sm font-medium">
          {shop.name} is closed right now. You can look at the menu, but ordering is paused until it reopens.
        </p>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_21rem]">
        <div>
          {groups.length === 0 && <EmptyState title="The menu is empty">This shop hasn’t added products yet.</EmptyState>}

          {groups.length > 1 && (
            <nav className="sticky top-16 z-20 -mx-4 mb-2 flex gap-2 overflow-x-auto bg-steam-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" aria-label="Menu sections">
              {groups.map(([name]) => (
                <a key={name} href={`#cat-${encodeURIComponent(name)}`} className="rounded-lg border border-ink-900/18 bg-foam px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap hover:border-ink-900">
                  {name}
                </a>
              ))}
            </nav>
          )}

          {groups.map(([name, items]) => (
            <section key={name} id={`cat-${encodeURIComponent(name)}`} className="scroll-mt-32">
              <h2 className="mt-8 mb-1 font-display text-2xl font-extrabold tracking-tight">{name}</h2>
              <ul className="divide-y divide-ink-900/10 border-y border-ink-900/10">
                {items.map((p) => (
                  <MenuItem key={p.id} shop={shop} product={p} />
                ))}
              </ul>
            </section>
          ))}

          {reviews.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">What customers say</h2>
              <ul className="mt-4 divide-y divide-ink-900/10 border-y border-ink-900/10">
                {reviews.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center gap-3">
                      <Stars value={r.rating} size="size-3.5" />
                      <span className="text-sm font-semibold">{r.reviewer_name}</span>
                      <span className="text-sm text-ink-600">{timeAgo(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-[15px] text-ink-700">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <CartTicket />
          </div>
        </aside>
      </div>
    </div>
  );
}
