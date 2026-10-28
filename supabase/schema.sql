-- =====================================================================
-- CoffeeShop Gen - Supabase schema
-- Run this whole file in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- ---------- TABLES ----------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'customer' check (role in ('customer', 'owner', 'admin')),
  created_at  timestamptz not null default now()
);

create table if not exists shops (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  description     text,
  logo_url        text,
  cover_url       text,
  address         text,
  contact_phone   text,
  contact_email   text,
  business_hours  text,
  social_links    jsonb not null default '{}'::jsonb,
  delivery_info   text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at      timestamptz not null default now()
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id) on delete cascade,
  name        text not null,
  description text,
  category    text,
  price       numeric(10, 2) not null check (price >= 0),
  image_url   text,
  sizes       text[] not null default '{}',
  stock       int not null default 0 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references profiles(id) on delete cascade,
  shop_id          uuid not null references shops(id) on delete cascade,
  status           text not null default 'placed' check (status in (
                     'placed', 'confirmed', 'packed', 'ready_for_pickup',
                     'in_transit', 'delivered', 'cancelled')),
  total            numeric(10, 2) not null check (total >= 0),
  delivery_address text not null,
  payment_method   text not null default 'cod' check (payment_method in ('cod', 'gcash', 'card')),
  created_at       timestamptz not null default now()
);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,
  size        text,
  unit_price  numeric(10, 2) not null,
  quantity    int not null check (quantity > 0)
);

create table if not exists reward_points (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  order_id     uuid references orders(id) on delete set null,
  points       int not null,
  reason       text,
  created_at   timestamptz not null default now()
);

-- ---------- HELPERS ---------------------------------------------------

-- Auto-create a profile row whenever someone signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Admin-only: approve or reject a shop. Approving also promotes the owner.
create or replace function approve_shop(p_shop uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if not is_admin() then
    raise exception 'Only admins can review shops';
  end if;

  update shops
     set status = case when p_approve then 'approved' else 'rejected' end,
         rejection_reason = case when p_approve then null else p_reason end
   where id = p_shop
  returning owner_id into v_owner;

  if p_approve then
    update profiles set role = 'owner' where id = v_owner and role = 'customer';
  end if;
end;
$$;

grant execute on function approve_shop(uuid, boolean, text) to authenticated;

-- ---------- COLUMN-LEVEL GUARDS ---------------------------------------
-- Users may edit their own name, but not their role.
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

-- Owners may edit shop details, but not status (only approve_shop can change it).
revoke update on shops from authenticated;
grant update (name, description, logo_url, cover_url, address, contact_phone,
              contact_email, business_hours, social_links, delivery_info)
  on shops to authenticated;

-- ---------- ROW LEVEL SECURITY ----------------------------------------

alter table profiles      enable row level security;
alter table shops         enable row level security;
alter table products      enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;
alter table reward_points enable row level security;

-- profiles
create policy "profiles: read all"   on profiles for select using (true);
create policy "profiles: update own" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- shops
create policy "shops: public read approved" on shops for select
  using (status = 'approved');
create policy "shops: owner read own" on shops for select
  using (owner_id = auth.uid());
create policy "shops: admin read all" on shops for select
  using (is_admin());
create policy "shops: apply" on shops for insert
  with check (owner_id = auth.uid());
create policy "shops: owner update own" on shops for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- products
create policy "products: public read active" on products for select
  using (
    is_active and exists (
      select 1 from shops s where s.id = products.shop_id and s.status = 'approved'
    )
  );
create policy "products: owner read own" on products for select
  using (exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid()));
create policy "products: owner insert" on products for insert
  with check (exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid()));
create policy "products: owner update" on products for update
  using (exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid()));
create policy "products: owner delete" on products for delete
  using (exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid()));

-- orders
create policy "orders: customer insert" on orders for insert
  with check (customer_id = auth.uid());
create policy "orders: customer read own" on orders for select
  using (customer_id = auth.uid());
create policy "orders: shop owner read" on orders for select
  using (exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()));
create policy "orders: shop owner update status" on orders for update
  using (exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()));
create policy "orders: admin read" on orders for select
  using (is_admin());

-- order_items
create policy "order_items: customer insert" on order_items for insert
  with check (exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid()));
create policy "order_items: read related" on order_items for select
  using (exists (
    select 1 from orders o
    left join shops s on s.id = o.shop_id
    where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or s.owner_id = auth.uid())
  ));

-- reward_points
create policy "rewards: read own" on reward_points for select
  using (customer_id = auth.uid());
create policy "rewards: insert own" on reward_points for insert
  with check (customer_id = auth.uid());

-- ---------- ADMIN SETUP -----------------------------------------------
-- After you sign up with your own account once, run this (replace the email):
--   update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
