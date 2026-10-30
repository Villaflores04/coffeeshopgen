-- Admin control center: distinct shop states, account suspension, safe management and audit trail.
-- Existing orders/reviews are retained. Shop/account removal is soft-disable only.

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz;

alter table public.shops
  drop constraint if exists shops_status_check;
alter table public.shops
  add constraint shops_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended'));

create table if not exists public.admin_activity_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_logs_created_idx
  on public.admin_activity_logs (created_at desc);
create index if not exists profiles_suspension_idx
  on public.profiles (is_suspended, role);
create index if not exists shops_status_created_idx
  on public.shops (status, created_at desc);

alter table public.admin_activity_logs enable row level security;
revoke all on public.admin_activity_logs from anon, authenticated;
grant select on public.admin_activity_logs to authenticated;
create policy admin_activity_logs_admin_read
  on public.admin_activity_logs for select to authenticated
  using (public.is_admin());

-- A restrictive policy is important: it ANDs with the existing permissive policies.
-- It therefore blocks suspended users even when another table policy would allow access.
create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_suspended = false
  );
$$;
revoke all on function public.is_account_active() from public, anon;
grant execute on function public.is_account_active() to authenticated;

drop policy if exists profiles_active_account_guard on public.profiles;
create policy profiles_active_account_guard on public.profiles
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

drop policy if exists shops_active_account_guard on public.shops;
create policy shops_active_account_guard on public.shops
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

drop policy if exists products_active_shop_guard on public.products;
create policy products_active_shop_guard on public.products
  as restrictive for all to authenticated
  using (
    public.is_account_active()
    and exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and (s.owner_id <> (select auth.uid()) or s.status = 'approved')
    )
  )
  with check (
    public.is_account_active()
    and exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.owner_id = (select auth.uid())
        and s.status = 'approved'
    )
  );

drop policy if exists orders_active_account_guard on public.orders;
create policy orders_active_account_guard on public.orders
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

drop policy if exists order_items_active_account_guard on public.order_items;
create policy order_items_active_account_guard on public.order_items
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

drop policy if exists rewards_active_account_guard on public.reward_points;
create policy rewards_active_account_guard on public.reward_points
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

drop policy if exists reviews_active_account_guard on public.reviews;
create policy reviews_active_account_guard on public.reviews
  as restrictive for all to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

-- Central admin shop workflow. Suspend is no longer mislabeled rejection.
create or replace function public.admin_manage_shop(
  p_shop uuid,
  p_action text,
  p_reason text default null,
  p_changes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_shop public.shops;
  v_next_status text;
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Only active admins can manage shops';
  end if;

  select * into v_shop from public.shops where id = p_shop for update;
  if not found then raise exception 'Shop not found'; end if;

  if p_action = 'approve' then
    if v_shop.status not in ('pending', 'rejected') then
      raise exception 'Only pending or rejected applications can be approved';
    end if;
    v_next_status := 'approved';
  elsif p_action = 'reject' then
    if v_shop.status not in ('pending', 'rejected') then
      raise exception 'Only applications can be rejected';
    end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'A rejection reason is required'; end if;
    v_next_status := 'rejected';
  elsif p_action = 'suspend' then
    if v_shop.status <> 'approved' then raise exception 'Only live shops can be suspended'; end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'A suspension reason is required'; end if;
    v_next_status := 'suspended';
  elsif p_action = 'restore' then
    if v_shop.status <> 'suspended' then raise exception 'This shop is not suspended'; end if;
    v_next_status := 'approved';
  elsif p_action = 'update' then
    update public.shops set
      name = coalesce(nullif(btrim(p_changes->>'name'), ''), name),
      tagline = nullif(p_changes->>'tagline', ''),
      description = nullif(p_changes->>'description', ''),
      address = nullif(p_changes->>'address', ''),
      contact_phone = nullif(p_changes->>'contact_phone', ''),
      contact_email = nullif(p_changes->>'contact_email', ''),
      business_hours = nullif(p_changes->>'business_hours', ''),
      delivery_info = nullif(p_changes->>'delivery_info', ''),
      delivery_fee = coalesce(nullif(p_changes->>'delivery_fee', '')::numeric, delivery_fee),
      min_order = coalesce(nullif(p_changes->>'min_order', '')::numeric, min_order)
    where id = p_shop;
    insert into public.admin_activity_logs(admin_id, action, target_type, target_id, target_label, details)
    values (v_admin, 'shop_updated', 'shop', p_shop, v_shop.name, p_changes);
    return;
  else
    raise exception 'Unsupported shop action';
  end if;

  update public.shops
    set status = v_next_status,
        rejection_reason = case when p_action in ('reject', 'suspend') then btrim(p_reason) else null end,
        reviewed_at = now()
  where id = p_shop;

  if p_action = 'approve' then
    update public.profiles set role = 'owner' where id = v_shop.owner_id and role = 'customer';
  end if;

  insert into public.admin_activity_logs(admin_id, action, target_type, target_id, target_label, reason, details)
  values (v_admin, 'shop_' || p_action, 'shop', p_shop, v_shop.name, nullif(btrim(p_reason), ''),
          jsonb_build_object('from', v_shop.status, 'to', v_next_status, 'owner_id', v_shop.owner_id));
end;
$$;
revoke all on function public.admin_manage_shop(uuid, text, text, jsonb) from public, anon;
grant execute on function public.admin_manage_shop(uuid, text, text, jsonb) to authenticated;

create or replace function public.admin_set_account_suspension(
  p_user uuid,
  p_suspend boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_target public.profiles;
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Only active admins can manage accounts';
  end if;
  select * into v_target from public.profiles where id = p_user for update;
  if not found then raise exception 'Account not found'; end if;
  if v_target.role = 'admin' then raise exception 'Admin accounts cannot be suspended here'; end if;

  if p_suspend and coalesce(btrim(p_reason), '') = '' then
    raise exception 'A suspension reason is required';
  end if;

  update public.profiles set
    is_suspended = p_suspend,
    suspension_reason = case when p_suspend then btrim(p_reason) else null end,
    suspended_at = case when p_suspend then now() else null end
  where id = p_user;

  insert into public.admin_activity_logs(admin_id, action, target_type, target_id, target_label, reason)
  values (v_admin, case when p_suspend then 'account_suspended' else 'account_restored' end,
          'account', p_user, coalesce(v_target.full_name, 'Unnamed account'),
          case when p_suspend then btrim(p_reason) else null end);
end;
$$;
revoke all on function public.admin_set_account_suspension(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_account_suspension(uuid, boolean, text) to authenticated;

create or replace function public.admin_update_profile(
  p_user uuid,
  p_full_name text,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_target public.profiles;
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Only active admins can edit accounts';
  end if;
  select * into v_target from public.profiles where id = p_user for update;
  if not found then raise exception 'Account not found'; end if;
  if v_target.role = 'admin' then raise exception 'Admin profile editing is disabled here'; end if;
  update public.profiles
    set full_name = nullif(btrim(p_full_name), ''),
        phone = nullif(btrim(p_phone), '')
  where id = p_user;
  insert into public.admin_activity_logs(admin_id, action, target_type, target_id, target_label)
  values (v_admin, 'account_updated', 'account', p_user, coalesce(v_target.full_name, 'Unnamed account'));
end;
$$;
revoke all on function public.admin_update_profile(uuid, text, text) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

-- Block suspended customers/owners inside SECURITY DEFINER order workflows too.
create or replace function public.guard_order_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_shop_status text;
begin
  if v_actor is not null and not public.is_account_active() then
    raise exception 'Your account is suspended. Contact support for help';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    select s.status into v_shop_status
    from public.shops s where s.id = new.shop_id;
    if exists (select 1 from public.shops s where s.id = new.shop_id and s.owner_id = v_actor)
       and v_shop_status <> 'approved' then
      raise exception 'Your shop is not active, so order updates are disabled';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_order_actor on public.orders;
create trigger guard_order_actor
  before insert or update of status on public.orders
  for each row execute function public.guard_order_actor();

-- Owner product edits/deletes and owner order actions require an approved shop.
-- Admin statistics are corrected: Customers means customer-role accounts only.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Only active admins can view stats';
  end if;
  return jsonb_build_object(
    'pending_shops', (select count(*) from public.shops where status = 'pending'),
    'approved_shops', (select count(*) from public.shops where status = 'approved'),
    'suspended_shops', (select count(*) from public.shops where status = 'suspended'),
    'customers', (select count(*) from public.profiles where role = 'customer' and not is_suspended),
    'owners', (select count(*) from public.profiles where role = 'owner' and not is_suspended),
    'suspended_accounts', (select count(*) from public.profiles where is_suspended),
    'total_accounts', (select count(*) from public.profiles),
    'orders', (select count(*) from public.orders where status <> 'cancelled'),
    'gmv', coalesce((select sum(total) from public.orders where status = 'delivered'), 0),
    'platform_fees', coalesce((select sum(platform_fee) from public.orders where status = 'delivered'), 0)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Replace old RPC behavior: callers must use the explicit action-based function.
-- Keep the old signature for compatibility, but never map suspension to rejection.
create or replace function public.review_shop(p_shop uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_manage_shop(
    p_shop,
    case when p_approve then 'approve' else 'reject' end,
    p_reason,
    '{}'::jsonb
  );
end;
$$;
