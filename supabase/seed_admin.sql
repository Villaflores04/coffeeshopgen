-- =====================================================================
-- TEST ADMIN ACCOUNT. For test systems only.
--
--   Email:    admin@gmail.com
--   Password: #admin321
--
-- This repository is public, so this login is public too. Anyone who finds it
-- can sign in as admin on your site. Use it while building, then remove it
-- (see the bottom of this file) before real customers arrive.
--
-- Run AFTER supabase/migrations/20261028000000_init.sql, in the SQL Editor.
-- Safe to run more than once. If an account with this email already exists
-- (for example you signed up with it in the app), it is promoted to admin and
-- its password is left alone.
-- =====================================================================

do $$
declare
  v_email text := 'admin@gmail.com';
  v_pass  text := '#admin321';
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Admin"}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    -- The on_auth_user_created trigger creates the matching profile row.
  end if;

  update public.profiles set role = 'admin' where id = v_id;
  raise notice 'Admin ready: % (user id %)', v_email, v_id;
end
$$;

-- ---------------------------------------------------------------------
-- REMOVE THE TEST ADMIN (run this before going live):
--   delete from auth.users where email = 'admin@gmail.com';
-- ---------------------------------------------------------------------
