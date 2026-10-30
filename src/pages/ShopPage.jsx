import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, MapPin, Phone, Search, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { pesoShort, timeAgo } from '../lib/format.js';
import CartTicket from '../components/CartTicket.jsx';
import ProductCard, { ProductGrid } from '../components/ProductCard.jsx';
import { Badge, EmptyState, LinkButton, Skeleton, Stars, Thumb, inputCls, cn } from '../components/ui.jsx';

export default function ShopPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

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

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category || 'Menu'))], [products]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map();
    products.filter((p) => (cat === 'All' || (p.category || 'Menu') === cat) && (!q || `${p.name} ${p.description ?? ''}`.toLowerCase().includes(q))).forEach((p) => {
      const k = p.category || 'Menu';
      map.set(k, [...(map.get(k) ?? []), p]);
    });
    return [...map.entries()];
  }, [products, query, cat]);

  if (state === 'loading') return <Skeleton className="mt-8 h-96 w-full" />;
  if (state === 'missing') {
    return (
      <EmptyState title="We couldn’t find that shop" action={<LinkButton to="/" variant="dark">Browse shops</LinkButton>}>
        It may have closed, or the link is out of date.
      </EmptyState>
    );
  }

  const social = shop.social_links ?? {};
  const isOwnShop = Boolean(user && shop.owner_id === user.id);

  return (
    <div className="pt-6 sm:pt-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden /> All shops
      </Link>
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

      {isOwnShop && (
        <p className="mt-6 rounded-lg border border-ink-900/10 bg-kraft-200 px-4 py-3 text-sm font-medium">
          This is your shop. You can preview your menu, but you can’t place orders from your own shop account.
        </p>
      )}

      {!shop.is_open && (
        <p className="mt-6 rounded-lg bg-kraft-200 px-4 py-3 text-sm font-medium">
          {shop.name} is closed right now. You can look at the menu, but ordering is paused until it reopens.
        </p>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_21rem]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-600" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${shop.name}`} aria-label="Search this shop's products" className={cn(inputCls, 'pl-9')} />
            </div>
            <span className="text-sm text-ink-600">{products.length} product{products.length === 1 ? '' : 's'}</span>
          </div>

          {categories.length > 2 && (
            <div className="sticky top-16 z-20 -mx-4 mt-3 flex gap-2 overflow-x-auto bg-steam-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" role="tablist" aria-label="Menu sections">
              {categories.map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
                  className={cn('rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
                    cat === c ? 'border-ink-900 bg-ink-900 text-foam' : 'border-ink-900/18 bg-foam text-ink-700 hover:border-ink-900/50')}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {products.length === 0 && <EmptyState title="The menu is empty">This shop hasn’t added products yet.</EmptyState>}
          {products.length > 0 && groups.length === 0 && <EmptyState title="Nothing matches that">Try another search or category.</EmptyState>}

          {groups.map(([name, items]) => (
            <section key={name} className="mt-6">
              <h2 className="mb-3 font-display text-2xl font-extrabold tracking-tight">{name}</h2>
              <ProductGrid narrow>
                {items.map((p) => <ProductCard key={p.id} shop={shop} product={p} isOwnShop={isOwnShop} />)}
              </ProductGrid>
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
