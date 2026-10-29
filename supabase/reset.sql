-- =====================================================================
-- DESTRUCTIVE: wipes every CoffeeShopGen table, function and policy.
-- Only run this if you already ran the old v1 schema and want a clean
-- start before running migrations/20261028000000_init.sql.
-- It does NOT delete your auth users.
-- =====================================================================

drop view  if exists public.shop_ratings;
drop table if exists public.reviews, public.reward_points, public.order_items,
                     public.orders, public.products, public.shops, public.profiles cascade;

drop function if exists public.place_order(uuid, jsonb, text, text, text, int, text);
drop function if exists public.set_order_status(uuid, text);
drop function if exists public.submit_review(uuid, int, text);
drop function if exists public.review_shop(uuid, boolean, text);
drop function if exists public.resubmit_shop(uuid);
drop function if exists public.approve_shop(uuid, boolean, text);
drop function if exists public.admin_stats();
drop function if exists public.reward_balance(uuid);
drop function if exists public.is_admin();
drop function if exists public.handle_new_user() cascade;

drop policy if exists shop_images_insert on storage.objects;
drop policy if exists shop_images_select on storage.objects;
drop policy if exists shop_images_update on storage.objects;
drop policy if exists shop_images_delete on storage.objects;
