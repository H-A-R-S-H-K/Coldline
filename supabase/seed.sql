-- Runs after migrations on `supabase db reset` / first `supabase start`.
-- Creates Denise's login and loads the demo jobs.
--
-- Login: denise@example.com / followup123

do $$
declare
  uid uuid := '00000000-0000-0000-0000-00000000d001';
begin
  if not exists (select 1 from auth.users where email = 'denise@example.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'denise@example.com', crypt('followup123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Denise"}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'denise@example.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
end;
$$;

select public.reset_demo_data('America/Chicago');
