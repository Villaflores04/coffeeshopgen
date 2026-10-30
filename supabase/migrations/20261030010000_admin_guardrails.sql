-- Keep suspended users able to read their own profile so the UI can explain the suspension.
drop policy if exists profiles_active_account_guard on public.profiles;

-- Enforce account suspension in write paths that run through SECURITY DEFINER RPCs.
create or replace function public.guard_active_account_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_account_active() then
    raise exception 'Your account is suspended. Contact the marketplace administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_active_shop_write on public.shops;
create trigger guard_active_shop_write
  before insert or update on public.shops
  for each row execute function public.guard_active_account_write();

drop trigger if exists guard_active_review_write on public.reviews;
create trigger guard_active_review_write
  before insert on public.reviews
  for each row execute function public.guard_active_account_write();
