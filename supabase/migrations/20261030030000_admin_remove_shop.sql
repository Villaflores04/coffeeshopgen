-- Let admins permanently remove a shop (e.g. a fraudulent or closed business).
-- Safety rules:
--   * only an active admin can do it
--   * blocked while the shop still has orders in progress (finish or cancel them first)
--   * the owner is moved back to a customer account so they can apply again
--   * the shop's products, past orders and reviews are deleted with it; points customers
--     already earned stay on their accounts
--   * the removal and its reason are written to the admin activity log
create or replace function public.admin_remove_shop(p_shop uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_shop public.shops;
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Only active admins can remove shops';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to remove a shop';
  end if;

  select * into v_shop from public.shops where id = p_shop for update;
  if not found then raise exception 'Shop not found'; end if;

  if exists (
    select 1 from public.orders o
    where o.shop_id = p_shop and o.status not in ('delivered', 'cancelled')
  ) then
    raise exception 'This shop still has orders in progress. Wait for them to finish or be cancelled first';
  end if;

  insert into public.admin_activity_logs(admin_id, action, target_type, target_id, target_label, reason, details)
  values (v_admin, 'shop_removed', 'shop', p_shop, v_shop.name, btrim(p_reason),
          jsonb_build_object('status', v_shop.status, 'owner_id', v_shop.owner_id));

  delete from public.shops where id = p_shop;

  update public.profiles set role = 'customer'
  where id = v_shop.owner_id and role = 'owner';
end;
$$;
revoke all on function public.admin_remove_shop(uuid, text) from public, anon;
grant execute on function public.admin_remove_shop(uuid, text) to authenticated;
