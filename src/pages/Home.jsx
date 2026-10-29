import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { pesoShort } from '../lib/format.js';
import { Ticket, TicketLine, TicketRule } from '../components/Ticket.jsx';
import { Badge, EmptyState, Leader, LinkButton, Skeleton, Thumb, Select, inputCls, cn } from '../components/ui.jsx';

function Hero() {
  return (
    <section className="grid items-center gap-12 pt-12 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20 lg:pb-24">
      <div>
        <h1 className="font-display text-[clamp(2.75rem,7.2vw,5.75rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance">
          Coffee from the counter down the street.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-700">
          Order from independent coffee shops near you, watch your cup make its way to the door, and collect points that pay for the next one.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#shops" className="inline-flex h-13 items-center rounded-lg bg-cherry-500 px-7 font-semibold text-white hover:bg-cherry-600">
            Browse shops
          </a>
          <LinkButton to="/owner" variant="outline" size="lg">
            Open your shop
          </LinkButton>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm lg:mr-0 lg:rotate-[1.5deg]" aria-hidden>
        <Ticket print>
          <p className="font-medium">Tala Coffee Bar</p>
          <p className="text-ink-600">Order #1042</p>
          <TicketRule />
          <TicketLine left="2× Flat white (L)" right="₱360" />
          <TicketLine left="1× Butter croissant" right="₱95" className="mt-1.5" />
          <TicketRule />
          <TicketLine left="Points used" right="−₱20" />
          <TicketLine left="Delivery" right="₱49" />
          <TicketLine left="Total" right="₱484" strong className="mt-1.5" />
          <TicketRule />
          <div className="flex items-center justify-between font-sans">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cherry-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-cherry-500" />
              </span>
              Out for delivery
            </span>
            <span className="rounded-md bg-kraft-200 px-2 py-0.5 text-xs font-semibold">+23 points</span>
          </div>
        </Ticket>
      </div>
    </section>
  );
}

function ShopRow({ shop }) {
  const rating = shop.rating;
  return (
    <Link
      to={`/shops/${shop.id}`}
      className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-5 transition-colors hover:bg-foam sm:gap-5"
    >
      <Thumb src={shop.logo_url} alt="" className="size-14 rounded-lg sm:size-16" iconClass="size-6" />
      <div className="min-w-0 flex-1">
        <Leader
          left={
            <span className="block truncate font-display text-xl font-bold tracking-tight group-hover:underline decoration-2 underline-offset-4 sm:text-2xl">
              {shop.name}
            </span>
          }
          right={
            <span className="text-sm font-semibold tabular-nums">
              {shop.delivery_fee > 0 ? `${pesoShort(shop.delivery_fee)} delivery` : 'Free delivery'}
            </span>
          }
        />
        <p className="mt-0.5 line-clamp-1 text-[15px] text-ink-600">{shop.tagline || shop.description || shop.address}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
          {rating ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="size-3.5 fill-kraft-400 text-kraft-400" aria-hidden />
              {rating.avg_rating}
              <span className="font-normal text-ink-600">({rating.review_count})</span>
            </span>
          ) : (
            <span className="text-ink-600">New</span>
          )}
          {shop.min_order > 0 && <span>Min. order {pesoShort(shop.min_order)}</span>}
          {shop.is_open ? <Badge tone="success">Open</Badge> : <Badge>Closed</Badge>}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase
        .from('shops')
        .select('id,name,tagline,description,logo_url,address,delivery_fee,min_order,is_open,created_at')
        .eq('status', 'approved'),
      supabase.from('shop_ratings').select('*'),
    ]).then(([s, r]) => {
      if (!alive) return;
      if (s.error) setError('We couldn’t load shops. Check your connection and try again.');
      const ratings = new Map((r.data ?? []).map((x) => [x.shop_id, x]));
      setShops((s.data ?? []).map((x) => ({ ...x, rating: ratings.get(x.id) })));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = shops.filter(
      (s) => (!openOnly || s.is_open) && (!q || `${s.name} ${s.tagline ?? ''} ${s.address ?? ''}`.toLowerCase().includes(q))
    );
    const by = {
      rating: (a, b) => (b.rating?.avg_rating ?? 0) - (a.rating?.avg_rating ?? 0),
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      fee: (a, b) => a.delivery_fee - b.delivery_fee,
    }[sort];
    return out.sort(by);
  }, [shops, query, openOnly, sort]);

  return (
    <>
      <Hero />

      <section id="shops" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Shops</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-600" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shops"
                aria-label="Search shops"
                className={cn(inputCls, 'w-52! pl-9')}
              />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort shops" className="w-auto!">
              <option value="rating">Top rated</option>
              <option value="newest">Newest</option>
              <option value="fee">Lowest delivery fee</option>
            </Select>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="size-4 accent-ink-900" />
              Open now
            </label>
          </div>
        </div>

        <div className="mt-4 divide-y divide-ink-900/10 border-y border-ink-900/10">
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="my-4 h-20" />)}
          {!loading && error && <p className="py-10 text-center text-cherry-600">{error}</p>}
          {!loading && !error && list.length === 0 && (
            <EmptyState title={shops.length ? 'No shops match that' : 'No shops yet'} action={!shops.length && <LinkButton to="/owner" variant="dark">Open the first one</LinkButton>}>
              {shops.length ? 'Try a different search, or turn off Open now.' : 'Approved shops show up here as soon as they go live.'}
            </EmptyState>
          )}
          {list.map((s) => (
            <ShopRow key={s.id} shop={s} />
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-2xl bg-ink-900 p-8 text-foam sm:p-12">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Run a coffee shop? Put your menu online today.</h2>
            <p className="mt-3 max-w-lg text-steam-300">
              Apply in a few minutes. Once we’ve checked your details you get a shop page, an order dashboard and your own customers. We take 5% of each order, nothing else.
            </p>
          </div>
          <div className="md:text-right">
            <LinkButton to="/owner" variant="primary" size="lg">
              Apply to open a shop
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
