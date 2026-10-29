-- Optional demo data (run AFTER the migration and AFTER you have signed up once).
-- It turns the earliest account into the owner of one approved demo shop with a
-- small menu, so the storefront isn't empty while you test.

do $$
declare
  v_owner uuid;
  v_shop  uuid;
begin
  select id into v_owner from auth.users order by created_at limit 1;
  if v_owner is null then
    raise notice 'Sign up in the app first, then run this seed again.';
    return;
  end if;

  if exists (select 1 from public.shops where owner_id = v_owner) then
    raise notice 'That account already has a shop. Nothing to seed.';
    return;
  end if;

  insert into public.shops (owner_id, name, tagline, description, address, contact_phone,
                            business_hours, delivery_info, delivery_fee, min_order, status, reviewed_at)
  values (v_owner, 'Tala Coffee Bar', 'Single-origin pour-overs and a very good flat white',
          'A small roastery counter in the middle of town. We roast on Mondays and Thursdays.',
          '12 Mabini Street, Quezon City', '+63 917 000 0000', 'Daily, 7:00 AM to 8:00 PM',
          'Delivers within 5 km', 49, 150, 'approved', now())
  returning id into v_shop;

  update public.profiles set role = 'owner' where id = v_owner and role = 'customer';

  insert into public.products (shop_id, name, description, category, price, sizes, stock) values
    (v_shop, 'Flat white',    'Double ristretto, silky steamed milk.',   'Espresso', 140,
       '[{"name":"Small","extra":0},{"name":"Medium","extra":20},{"name":"Large","extra":40}]', 40),
    (v_shop, 'Americano',     'Espresso over hot water.',                'Espresso', 110,
       '[{"name":"Small","extra":0},{"name":"Medium","extra":20},{"name":"Large","extra":40}]', 40),
    (v_shop, 'Spanish latte', 'Espresso, condensed milk, steamed milk.', 'Espresso', 155,
       '[{"name":"Medium","extra":0},{"name":"Large","extra":30}]', 30),
    (v_shop, 'Cold brew',     'Steeped 18 hours, served over ice.',      'Iced',     150,
       '[{"name":"Medium","extra":0},{"name":"Large","extra":30}]', 25),
    (v_shop, 'Iced spanish',  'Our Spanish latte, over ice.',            'Iced',     165,
       '[]', 25),
    (v_shop, 'Butter croissant', 'Baked this morning.',                  'Pastry',    95, '[]', 12),
    (v_shop, 'Basque cheesecake','Burnt top, creamy centre.',            'Pastry',   185, '[]', 8);
end
$$;
