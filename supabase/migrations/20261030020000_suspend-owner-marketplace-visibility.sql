-- Ensure a suspended owner cannot keep selling through a still-approved shop.
-- Hide the shop and its catalog from public browsing until the owner is restored.
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read on public.shops
  for select to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1 from public.profiles p
      where p.id = shops.owner_id and p.is_suspended = false
    )
  );

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.shops s
      join public.profiles p on p.id = s.owner_id
      where s.id = products.shop_id
        and s.status = 'approved'
        and p.is_suspended = false
    )
  );

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.shops s
      join public.profiles p on p.id = s.owner_id
      where s.id = reviews.shop_id
        and s.status = 'approved'
        and p.is_suspended = false
    )
  );

-- Suspended users may still read their own profile to see the reason,
-- but cannot keep editing profile details while suspended.
drop policy if exists profiles_active_update_guard on public.profiles;
create policy profiles_active_update_guard on public.profiles
  as restrictive for update to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

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

  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.shops s
      join public.profiles owner_profile on owner_profile.id = s.owner_id
      where s.id = new.shop_id
        and (s.status <> 'approved' or owner_profile.is_suspended)
    ) then
      raise exception 'This shop is not currently accepting orders';
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
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
