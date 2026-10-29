-- =====================================================================
-- CoffeeShopGen: initial schema
--
-- Run once on a fresh Supabase project:
--   Dashboard > SQL Editor > New query > paste this file > Run
-- or, with the Supabase CLI:  supabase db push
--
-- Design rules
--   * The browser never writes orders, order items, rewards or shop status
--     directly. Those go through SECURITY DEFINER functions that validate
--     everything server-side (prices, stock, points, permissions).
--   * Every table has Row Level Security enabled.
--   * Column-level grants stop users from editing roles or shop status.
-- =====================================================================

-- ---------- TABLES ---------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  phone             text,
  default_address   text,
  role              text not null default 'customer' check (role in ('customer', 'owner', 'admin')),
  referral_code     text unique,
  referred_by       uuid references public.profiles(id) on delete set null,
  referral_rewarded boolean not null default false,
  created_at        timestamptz not null default now()
);

create table public.shops (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references public.profiles(id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 80),
  tagline          text,
  description      text,
  logo_url         text,
  cover_url        text,
  address          text,
  contact_phone    text,
  contact_email    text,
  business_hours   text,
  social_links     jsonb not null default '{}'::jsonb,
  delivery_info    text,
  delivery_fee     numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  min_order        numeric(10, 2) not null default 0 check (min_order >= 0),
  is_open          boolean not null default true,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  category    text,
  price       numeric(10, 2) not null check (price >= 0),
  -- [{"name": "Large", "extra": 20}, ...]  (empty array = one size)
  sizes       jsonb not null default '[]'::jsonb,
  image_url   text,
  stock       int not null default 0 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         bigint generated always as identity (start with 1000),
  customer_id      uuid not null references public.profiles(id) on delete cascade,
  shop_id          uuid not null references public.shops(id) on delete cascade,
  status           text not null default 'placed' check (status in (
                     'placed', 'confirmed', 'packed', 'picked_up',
                     'in_transit', 'out_for_delivery', 'delivered', 'cancelled')),
  subtotal         numeric(10, 2) not null default 0,
  delivery_fee     numeric(10, 2) not null default 0,
  discount         numeric(10, 2) not null default 0,
  platform_fee     numeric(10, 2) not null default 0,
  total            numeric(10, 2) not null default 0,
  points_redeemed  int not null default 0,
  points_earned    int not null default 0,
  contact_name     text,
  contact_phone    text,
  delivery_address text not null,
  notes            text,
  payment_method   text not null default 'cod' check (payment_method in ('cod', 'gcash')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  size        text,
  unit_price  numeric(10, 2) not null,
  quantity    int not null check (quantity > 0)
);

create table public.reward_points (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  points      int not null,                     -- negative when redeemed
  kind        text not null check (kind in ('earn', 'redeem', 'refund', 'referral')),
  status      text not null default 'confirmed' check (status in ('pending', 'confirmed', 'void')),
  note        text,
  created_at  timestamptz not null default now()
);

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  shop_id       uuid not null references public.shops(id) on delete cascade,
  customer_id   uuid not null references public.profiles(id) on delete cascade,
  reviewer_name text,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_shop_idx     on public.orders (shop_id, created_at desc);
create index products_shop_idx   on public.products (shop_id);
create index rewards_customer_idx on public.reward_points (customer_id, created_at desc);
create index reviews_shop_idx    on public.reviews (shop_id, created_at desc);

-- Average rating per shop. security_invoker => respects the reviews RLS policy.
create view public.shop_ratings with (security_invoker = true) as
  select shop_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as review_count
  from public.reviews
  group by shop_id;

-- ---------- HELPERS --------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Internal: confirmed point balance for a user.
create or replace function public.reward_balance(p_user uuid)
returns int
language sql security definer stable
set search_path = public
as $$
  select coalesce(sum(points), 0)::int
  from public.reward_points
  where customer_id = p_user and status = 'confirmed';
$$;
revoke all on function public.reward_balance(uuid) from public, anon, authenticated;

-- Create a profile (with a referral code) for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_code     text := upper(substr(md5(new.id::text || clock_timestamp()::text), 1, 8));
begin
  select id into v_referrer
  from public.profiles
  where referral_code = upper(coalesce(new.raw_user_meta_data ->> 'referral_code', ''));

  insert into public.profiles (id, full_name, referral_code, referred_by)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_code, v_referrer);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ORDERS ---------------------------------------------------

-- Places an order atomically. Prices, stock, delivery fee, points and fees are
-- all computed here from the database, never trusted from the browser.
-- p_items: [{"product_id": "<uuid>", "size": "Large" | null, "qty": 2}, ...]
create or replace function public.place_order(
  p_shop    uuid,
  p_items   jsonb,
  p_address text,
  p_phone   text,
  p_payment text default 'cod',
  p_points  int  default 0,
  p_notes   text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_shop     public.shops;
  v_prod     public.products;
  v_item     jsonb;
  v_order    uuid;
  v_qty      int;
  v_size     text;
  v_extra    numeric;
  v_unit     numeric;
  v_subtotal numeric := 0;
  v_points   int := greatest(coalesce(p_points, 0), 0);
  v_discount numeric := 0;
  v_earn     int;
begin
  if v_uid is null then raise exception 'Log in to place an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if coalesce(btrim(p_address), '') = '' then raise exception 'Enter a delivery address'; end if;
  if p_payment not in ('cod', 'gcash') then raise exception 'Choose a payment method'; end if;

  select * into v_shop from public.shops where id = p_shop and status = 'approved';
  if not found then raise exception 'This shop is not available'; end if;
  if not v_shop.is_open then raise exception '% is closed right now', v_shop.name; end if;

  -- Serialize this customer's orders so points can't be double-spent.
  perform 1 from public.profiles where id = v_uid for update;

  insert into public.orders (customer_id, shop_id, delivery_address, contact_name,
                             contact_phone, payment_method, notes)
  select v_uid, p_shop, btrim(p_address), p.full_name,
         nullif(btrim(p_phone), ''), p_payment, nullif(btrim(p_notes), '')
  from public.profiles p where p.id = v_uid
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'qty')::int, 0);
    if v_qty < 1 or v_qty > 50 then raise exception 'Invalid quantity'; end if;

    select * into v_prod
    from public.products
    where id = (v_item ->> 'product_id')::uuid and shop_id = p_shop and is_active
    for update;
    if not found then raise exception 'An item in your cart is no longer available'; end if;
    if v_prod.stock < v_qty then
      raise exception 'Only % left of %', v_prod.stock, v_prod.name;
    end if;

    v_size  := nullif(v_item ->> 'size', '');
    v_extra := 0;
    if jsonb_array_length(v_prod.sizes) > 0 then
      select coalesce((e ->> 'extra')::numeric, 0) into v_extra
      from jsonb_array_elements(v_prod.sizes) e
      where e ->> 'name' = v_size
      limit 1;
      if not found then raise exception 'Choose a size for %', v_prod.name; end if;
    else
      v_size := null;
    end if;

    v_unit     := v_prod.price + v_extra;
    v_subtotal := v_subtotal + v_unit * v_qty;

    insert into public.order_items (order_id, product_id, name, size, unit_price, quantity)
    values (v_order, v_prod.id, v_prod.name, v_size, v_unit, v_qty);

    update public.products set stock = stock - v_qty where id = v_prod.id;
  end loop;

  if v_subtotal < v_shop.min_order then
    raise exception 'The minimum order for % is ₱%', v_shop.name, trim_scale(v_shop.min_order);
  end if;

  -- Redeem points: 1 point = ₱1, up to half of the subtotal.
  if v_points > 0 then
    if v_points > public.reward_balance(v_uid) then
      raise exception 'You don''t have enough points';
    end if;
    if v_points > floor(v_subtotal * 0.5) then
      raise exception 'You can use up to % points on this order', floor(v_subtotal * 0.5);
    end if;
    v_discount := v_points;
    insert into public.reward_points (customer_id, order_id, points, kind, status, note)
    values (v_uid, v_order, -v_points, 'redeem', 'confirmed', 'Used on an order');
  end if;

  -- Earn 1 point per ₱20 paid. Stays pending until the order is delivered.
  v_earn := floor((v_subtotal - v_discount) / 20);
  if v_earn > 0 then
    insert into public.reward_points (customer_id, order_id, points, kind, status, note)
    values (v_uid, v_order, v_earn, 'earn', 'pending', 'Earned on an order');
  end if;

  update public.orders
     set subtotal        = v_subtotal,
         delivery_fee    = v_shop.delivery_fee,
         discount        = v_discount,
         platform_fee    = round(v_subtotal * 0.05, 2),
         total           = v_subtotal + v_shop.delivery_fee - v_discount,
         points_redeemed = v_points,
         points_earned   = v_earn
   where id = v_order;

  return v_order;
end;
$$;

-- Moves an order forward (shop owner) or cancels it (customer while "placed",
-- or the shop at any time before delivery).
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_o        public.orders;
  v_is_owner boolean;
  v_steps    text[] := array['placed', 'confirmed', 'packed', 'picked_up',
                             'in_transit', 'out_for_delivery', 'delivered'];
  v_cur      int;
  v_next     int;
  v_cust     public.profiles;
begin
  if v_uid is null then raise exception 'Log in first'; end if;

  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  v_is_owner := exists (select 1 from public.shops where id = v_o.shop_id and owner_id = v_uid);
  if not v_is_owner and v_o.customer_id <> v_uid then raise exception 'Not allowed'; end if;
  if v_o.status in ('delivered', 'cancelled') then
    raise exception 'This order is already %', v_o.status;
  end if;

  if p_status = 'cancelled' then
    if not v_is_owner and v_o.status <> 'placed' then
      raise exception 'This order can no longer be cancelled';
    end if;

    -- Put the stock back.
    update public.products p
       set stock = p.stock + s.qty
      from (select product_id, sum(quantity)::int as qty
              from public.order_items
             where order_id = p_order and product_id is not null
             group by product_id) s
     where p.id = s.product_id;

    -- Void points that were waiting, and give back points that were spent.
    update public.reward_points set status = 'void'
     where order_id = p_order and kind = 'earn' and status = 'pending';

    if v_o.points_redeemed > 0 then
      insert into public.reward_points (customer_id, order_id, points, kind, status, note)
      values (v_o.customer_id, p_order, v_o.points_redeemed, 'refund', 'confirmed', 'Order cancelled');
    end if;

    update public.orders set status = 'cancelled', updated_at = now() where id = p_order;
    return;
  end if;

  if not v_is_owner then raise exception 'Only the shop can update this order'; end if;

  v_cur  := array_position(v_steps, v_o.status);
  v_next := array_position(v_steps, p_status);
  if v_next is null or v_next <> v_cur + 1 then raise exception 'Invalid status change'; end if;

  update public.orders set status = p_status, updated_at = now() where id = p_order;

  if p_status = 'delivered' then
    update public.reward_points set status = 'confirmed'
     where order_id = p_order and kind = 'earn' and status = 'pending';

    -- Referral bonus: once per referred customer, on a qualifying first order,
    -- and the referrer is capped at 10 bonuses per month.
    select * into v_cust from public.profiles where id = v_o.customer_id for update;
    if v_cust.referred_by is not null and not v_cust.referral_rewarded and v_o.subtotal >= 200 then
      insert into public.reward_points (customer_id, order_id, points, kind, status, note)
      values (v_cust.id, p_order, 50, 'referral', 'confirmed', 'Welcome bonus from a friend''s invite');

      if (select count(*) from public.reward_points
           where customer_id = v_cust.referred_by and kind = 'referral'
             and created_at >= date_trunc('month', now())) < 10 then
        insert into public.reward_points (customer_id, order_id, points, kind, status, note)
        values (v_cust.referred_by, p_order, 50, 'referral', 'confirmed', 'A friend you invited ordered');
      end if;

      update public.profiles set referral_rewarded = true where id = v_cust.id;
    end if;
  end if;
end;
$$;

create or replace function public.submit_review(p_order uuid, p_rating int, p_comment text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_o public.orders;
  v_name text;
begin
  select * into v_o from public.orders where id = p_order and customer_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if v_o.status <> 'delivered' then raise exception 'You can review an order once it''s delivered'; end if;

  select split_part(coalesce(nullif(btrim(full_name), ''), 'Customer'), ' ', 1)
    into v_name from public.profiles where id = auth.uid();

  insert into public.reviews (order_id, shop_id, customer_id, reviewer_name, rating, comment)
  values (p_order, v_o.shop_id, auth.uid(), v_name, p_rating, nullif(btrim(p_comment), ''));
exception
  when unique_violation then raise exception 'You already reviewed this order';
end;
$$;

-- ---------- SHOP REVIEW (ADMIN) --------------------------------------

create or replace function public.review_shop(p_shop uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can review shops'; end if;

  update public.shops
     set status           = case when p_approve then 'approved' else 'rejected' end,
         rejection_reason = case when p_approve then null else p_reason end,
         reviewed_at      = now()
   where id = p_shop
  returning owner_id into v_owner;

  if v_owner is null then raise exception 'Shop not found'; end if;

  if p_approve then
    update public.profiles set role = 'owner' where id = v_owner and role = 'customer';
  end if;
end;
$$;

-- A rejected owner fixes their details and sends the application again.
create or replace function public.resubmit_shop(p_shop uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.shops
     set status = 'pending', rejection_reason = null
   where id = p_shop and owner_id = auth.uid() and status = 'rejected';
  if not found then raise exception 'Nothing to resubmit'; end if;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can view stats'; end if;
  return jsonb_build_object(
    'pending_shops',  (select count(*) from public.shops where status = 'pending'),
    'approved_shops', (select count(*) from public.shops where status = 'approved'),
    'customers',      (select count(*) from public.profiles),
    'orders',         (select count(*) from public.orders where status <> 'cancelled'),
    'gmv',            coalesce((select sum(total) from public.orders where status = 'delivered'), 0),
    'platform_fees',  coalesce((select sum(platform_fee) from public.orders where status = 'delivered'), 0)
  );
end;
$$;

-- Function permissions: logged-in users only.
revoke all on function public.place_order(uuid, jsonb, text, text, text, int, text) from public, anon;
revoke all on function public.set_order_status(uuid, text)       from public, anon;
revoke all on function public.submit_review(uuid, int, text)     from public, anon;
revoke all on function public.review_shop(uuid, boolean, text)   from public, anon;
revoke all on function public.resubmit_shop(uuid)                from public, anon;
revoke all on function public.admin_stats()                      from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, int, text) to authenticated;
grant execute on function public.set_order_status(uuid, text)     to authenticated;
grant execute on function public.submit_review(uuid, int, text)   to authenticated;
grant execute on function public.review_shop(uuid, boolean, text) to authenticated;
grant execute on function public.resubmit_shop(uuid)              to authenticated;
grant execute on function public.admin_stats()                    to authenticated;

-- ---------- TABLE PRIVILEGES -----------------------------------------

revoke all on public.profiles, public.shops, public.products, public.orders,
              public.order_items, public.reward_points, public.reviews,
              public.shop_ratings
  from anon, authenticated;

grant select on public.shops, public.products, public.reviews, public.shop_ratings to anon;
grant select on public.profiles, public.shops, public.products, public.orders,
                public.order_items, public.reward_points, public.reviews,
                public.shop_ratings
  to authenticated;

-- Customers can edit only their own contact details (never their role).
grant update (full_name, phone, default_address) on public.profiles to authenticated;

-- Owners can apply and edit shop details, but never status or owner.
grant insert (owner_id, name, tagline, description, logo_url, cover_url, address,
              contact_phone, contact_email, business_hours, social_links,
              delivery_info, delivery_fee, min_order)
  on public.shops to authenticated;
grant update (name, tagline, description, logo_url, cover_url, address,
              contact_phone, contact_email, business_hours, social_links,
              delivery_info, delivery_fee, min_order, is_open)
  on public.shops to authenticated;

grant insert, update, delete on public.products to authenticated;

-- ---------- ROW LEVEL SECURITY ---------------------------------------

alter table public.profiles      enable row level security;
alter table public.shops         enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.reward_points enable row level security;
alter table public.reviews       enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- shops
create policy shops_public_read on public.shops for select to anon, authenticated
  using (status = 'approved');
create policy shops_owner_read on public.shops for select to authenticated
  using (owner_id = auth.uid());
create policy shops_admin_read on public.shops for select to authenticated
  using (public.is_admin());
create policy shops_owner_insert on public.shops for insert to authenticated
  with check (owner_id = auth.uid());
create policy shops_owner_update on public.shops for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- products
create policy products_public_read on public.products for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.shops s where s.id = products.shop_id and s.status = 'approved'));
create policy products_owner_read on public.products for select to authenticated
  using (exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()));
create policy products_owner_insert on public.products for insert to authenticated
  with check (exists (select 1 from public.shops s
    where s.id = products.shop_id and s.owner_id = auth.uid() and s.status = 'approved'));
create policy products_owner_update on public.products for update to authenticated
  using (exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()));
create policy products_owner_delete on public.products for delete to authenticated
  using (exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()));

-- orders (read-only from the browser; writes go through functions)
create policy orders_customer_read on public.orders for select to authenticated
  using (customer_id = auth.uid());
create policy orders_owner_read on public.orders for select to authenticated
  using (exists (select 1 from public.shops s where s.id = orders.shop_id and s.owner_id = auth.uid()));
create policy orders_admin_read on public.orders for select to authenticated
  using (public.is_admin());

-- order_items: visible whenever the parent order is visible
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

-- rewards
create policy rewards_read_own on public.reward_points for select to authenticated
  using (customer_id = auth.uid());

-- reviews
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = reviews.shop_id and s.status = 'approved'));

-- ---------- STORAGE (shop and product images) ------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-images', 'shop-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public buckets serve files by URL. These policies let each user manage
-- only files inside their own folder (<user id>/...).
create policy shop_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy shop_images_select on storage.objects for select to authenticated
  using (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy shop_images_update on storage.objects for update to authenticated
  using (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy shop_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- REALTIME -------------------------------------------------
-- Live order tracking for customers and shops (respects RLS).
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- ---------- MAKE YOURSELF ADMIN --------------------------------------
-- Sign up in the app first, then run (with your email):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
