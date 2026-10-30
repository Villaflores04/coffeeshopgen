import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardList, Gift, Search, Star, Store, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { pesoShort } from '../lib/format.js';
import ProductCard, { ProductGrid } from '../components/ProductCard.jsx';
import { Ticket, TicketLine, TicketRule } from '../components/Ticket.jsx';
import { Badge, EmptyState, LinkButton, Skeleton, Tabs, Thumb, Select, inputCls, cn } from '../components/ui.jsx';

function Hero() {
  return (
    <section className="grid items-center gap-10 pt-10 pb-12 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16 lg:pb-16">
      <div>
        <h1 className="font-display text-[clamp(2.5rem,6.5vw,5rem)] leading-[0.97] font-extrabold tracking-[-0.035em] text-balance">
          Coffee from the counter down the street.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-700">
          Pick a coffee shop, browse its menu, and watch your order arrive. Every order earns points toward the next one.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#browse" className="inline-flex h-13 items-center rounded-lg bg-cherry-500 px-7 font-semibold text-white hover:bg-cherry-600">
            Browse shops
          </a>
          <LinkButton to="/owner" variant="outline" size="lg">Open your shop</LinkButton>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-sm lg:mr-0 lg:block lg:rotate-[1.5deg]" aria-hidden>
        <Ticket print>
          <p className="font-medium">Tala Coffee Bar</p>
          <p className="text-ink-600">Order #1042</p>
          <TicketRule />
          <TicketLine left="2× Flat white (L)" right="₱360" />
          <TicketLine left="1× Butter croissant" right="₱95" className="mt-1.5" />
          <TicketRule />
          <TicketLine left="Delivery" right="₱49" />
          <TicketLine left="Total" right="₱504" strong className="mt-1.5" />
          <TicketRule />
          <div className="flex items-center justify-between font-sans">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cherry-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-cherry-500" />
              </span>
              Out for delivery
            </span>
            <span className="rounded-md bg-kraft-200 px-2 py-0.5 text-xs font-semibold">+25 points</span>
          </div>
        </Ticket>
      </div>
    </section>
  );
}

/** Signed-in landing strip: who you are, and the next useful thing to do. */
function Welcome({ user, profile, role }) {
  const first = (profile?.full_name || user.email || 'there').split(' ')[0];
  const seller = role === 'owner';
  const tiles = [
    { to: '#browse', icon: Store, title: 'Browse shops', text: 'See every menu.' },
    { to: '/orders', icon: ClipboardList, title: 'My orders', text: 'Track deliveries.' },
    { to: '/rewards', icon: Gift, title: 'Rewards', text: 'Points and referrals' },
    seller
      ? { to: '/owner', icon: Store, title: 'My shop', text: 'Orders and menu.' }
      : { to: '/owner', icon: Store, title: 'Open a shop', text: 'Sell coffee here.' },
  ];
  return (
    <section className="pt-8 pb-6 sm:pt-12">
      <p className="text-sm font-medium text-ink-600">{seller ? 'Seller account' : 'Welcome back'}</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Hi, {first}.</h1>
      <p className="mt-2 max-w-xl text-ink-700">
        {seller
          ? 'Browse other shops like a customer, or jump to your dashboard to manage orders and products.'
          : 'Pick a coffee shop below to see its menu. New here? Browse, add to your cart, and check out in a minute.'}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ to, icon: Icon, title, text }) => {
          const cls = 'group flex items-center gap-3.5 rounded-xl border border-ink-900/10 bg-foam p-4 transition-colors hover:border-ink-900/35';
          const inner = (
            <>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-kraft-200"><Icon className="size-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="block truncate text-[13px] text-ink-600">{text}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          );
          return to.startsWith('#') ? <a key={title} href={to} className={cls}>{inner}</a> : <Link key={title} to={to} className={cls}>{inner}</Link>;
        })}
      </div>
    </section>
  );
}

function ShopCard({ shop }) {
  const r = shop.rating;
  return (
    <li>
      <Link to={`/shops/${shop.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink-900/10 bg-foam transition-shadow hover:shadow-lg">
        <div className="relative h-32 bg-kraft-200">
          {shop.cover_url && <img src={shop.cover_url} alt="" loading="lazy" className="size-full object-cover" />}
          <span className="absolute top-2.5 right-2.5">{shop.is_open ? <Badge tone="success">Open</Badge> : <Badge>Closed</Badge>}</span>
        </div>
        <div className="relative flex flex-1 flex-col px-4 pb-4">
          <Thumb src={shop.logo_url} alt="" className="-mt-8 size-16 rounded-xl border-4 border-foam" iconClass="size-6" />
          <h3 className="mt-2 truncate font-display text-xl font-bold tracking-tight group-hover:underline decoration-2 underline-offset-4">{shop.name}</h3>
          <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[14px] text-ink-600">{shop.tagline || shop.description || shop.address || 'Coffee shop'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-ink-700">
            {r ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="size-3.5 fill-kraft-400 text-kraft-400" aria-hidden />{r.avg_rating}
                <span className="font-normal text-ink-600">({r.review_count})</span>
              </span>
            ) : <span className="text-ink-600">New</span>}
            <span className="inline-flex items-center gap-1"><Truck className="size-3.5" aria-hidden />{shop.delivery_fee > 0 ? pesoShort(shop.delivery_fee) : 'Free'}</span>
            <span className="text-ink-600">{shop.productCount} item{shop.productCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function Home() {
  const { user, profile, role } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'products' ? 'products' : 'shops';
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('rating');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('shops').select('*').eq('status', 'approved'),
      supabase.from('shop_ratings').select('*'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]).then(([s, r, p]) => {
      if (!alive) return;
      if (s.error) setError('We couldn’t load shops. Check your connection and try again.');
      const ratings = new Map((r.data ?? []).map((x) => [x.shop_id, x]));
      const shopIds = new Set((s.data ?? []).map((x) => x.id));
      const live = (p.data ?? []).filter((x) => shopIds.has(x.shop_id));
      const counts = live.reduce((m, x) => m.set(x.shop_id, (m.get(x.shop_id) ?? 0) + 1), new Map());
      setShops((s.data ?? []).map((x) => ({ ...x, rating: ratings.get(x.id), productCount: counts.get(x.id) ?? 0 })));
      setProducts(live);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);
  const q = query.trim().toLowerCase();

  const shopList = useMemo(() => {
    const out = shops.filter((s) => (!openOnly || s.is_open) && (!q || `${s.name} ${s.tagline ?? ''} ${s.address ?? ''}`.toLowerCase().includes(q)));
    const by = {
      rating: (a, b) => (b.rating?.avg_rating ?? 0) - (a.rating?.avg_rating ?? 0),
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      fee: (a, b) => a.delivery_fee - b.delivery_fee,
    }[sort];
    return out.sort(by);
  }, [shops, q, openOnly, sort]);

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const productList = useMemo(
    () => products.filter((p) => {
      const s = shopById.get(p.shop_id);
      return (!openOnly || s?.is_open) && (category === 'All' || p.category === category)
        && (!q || `${p.name} ${p.category ?? ''} ${p.description ?? ''} ${s?.name ?? ''}`.toLowerCase().includes(q));
    }),
    [products, shopById, q, category, openOnly]
  );

  const setView = (v) => setParams(v === 'products' ? { view: 'products' } : {}, { replace: true });

  return (
    <>
      {user ? <Welcome user={user} profile={profile} role={role} /> : <Hero />}

      <section id="browse" className="scroll-mt-24 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={view}
            onChange={setView}
            items={[{ id: 'shops', label: `Shops${shops.length ? ` (${shops.length})` : ''}` }, { id: 'products', label: `Products${products.length ? ` (${products.length})` : ''}` }]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-600" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={view === 'shops' ? 'Search shops' : 'Search coffee, pastries, shops'}
                aria-label={view === 'shops' ? 'Search shops' : 'Search products'}
                className={cn(inputCls, 'w-64! pl-9')}
              />
            </div>
            {view === 'shops' && (
              <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort shops" className="w-auto!">
                <option value="rating">Top rated</option>
                <option value="newest">Newest</option>
                <option value="fee">Lowest delivery fee</option>
              </Select>
            )}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="size-4 accent-ink-900" />
              Open now
            </label>
          </div>
        </div>

        {view === 'products' && categories.length > 2 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
                  category === c ? 'border-ink-900 bg-ink-900 text-foam' : 'border-ink-900/18 bg-foam text-ink-700 hover:border-ink-900/50'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          )}
          {!loading && error && <p className="py-10 text-center text-cherry-600">{error}</p>}

          {!loading && !error && view === 'shops' && (
            shopList.length === 0 ? (
              <EmptyState title={shops.length ? 'No shops match that' : 'No shops yet'} action={!shops.length && <LinkButton to="/owner" variant="dark">Open the first one</LinkButton>}>
                {shops.length ? 'Try a different search, or turn off Open now.' : 'Approved shops show up here as soon as they go live.'}
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shopList.map((s) => <ShopCard key={s.id} shop={s} />)}
              </ul>
            )
          )}

          {!loading && !error && view === 'products' && (
            productList.length === 0 ? (
              <EmptyState title="No products match that">Try a different search or category.</EmptyState>
            ) : (
              <ProductGrid>
                {productList.map((p) => {
                  const s = shopById.get(p.shop_id);
                  return <ProductCard key={p.id} shop={s} product={p} showShop isOwnShop={Boolean(user && s.owner_id === user.id)} />;
                })}
              </ProductGrid>
            )
          )}
        </div>
      </section>

      {role !== 'owner' && (
        <section className="mt-20 rounded-2xl bg-ink-900 p-8 text-foam sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Run a coffee shop? Put your menu online today.</h2>
              <p className="mt-3 max-w-lg text-steam-300">
                Apply in a few minutes. Once we’ve checked your details you get a shop page, an order dashboard and your own customers. We take 5% of each order, nothing else.
              </p>
            </div>
            <div className="md:text-right">
              <LinkButton to="/owner" variant="primary" size="lg">Apply to open a shop</LinkButton>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
