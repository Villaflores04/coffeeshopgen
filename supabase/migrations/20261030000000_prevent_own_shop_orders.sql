-- Prevent shop owners from ordering from their own shop.
-- Enforced inside the SECURITY DEFINER RPC, so it cannot be bypassed by the browser.

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
  -- A shop owner must not be able to create or fulfill orders for their own shop.
  if v_shop.owner_id = v_uid then
    raise exception 'You cannot order from your own shop';
  end if;
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
