-- LifeGame 3.0
-- Identity Foundation — behavioral RLS tests
--
-- These tests use the real Supabase roles and auth.uid() claim path.
-- They do not require test-helper extensions and do not modify production
-- migrations or install test-only objects into the database.

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixed test identities. The transaction is rolled back at the end.
insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
)
values
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'lifegame-test-a@example.invalid',
    'not-a-real-password-hash', now(), now(), now()
),
(
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'lifegame-test-b@example.invalid',
    'not-a-real-password-hash', now(), now(), now()
);

insert into public.profiles (id, display_name)
values
    ('00000000-0000-0000-0000-000000000001', 'Test User A'),
    ('00000000-0000-0000-0000-000000000002', 'Test User B');

select ok(
    (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
    'profiles has RLS enabled'
);

select results_eq(
    $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
    $$,
    $$values (4::bigint)$$,
    'profiles has exactly four operation-specific policies'
);

-- User A.
set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000001',
    true
);

select results_eq(
    $$select id from public.profiles order by id$$,
    $$values ('00000000-0000-0000-0000-000000000001'::uuid)$$,
    'User A can see only User A profile'
);

select lives_ok(
    $$
    update public.profiles
    set display_name = 'Test User A Updated'
    where id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User A can update own profile'
);

select results_eq(
    $$select display_name from public.profiles
      where id = '00000000-0000-0000-0000-000000000001'$$,
    $$values ('Test User A Updated'::text)$$,
    'User A update is persisted inside the test transaction'
);

select results_eq(
    $$select count(*)::bigint from public.profiles
      where id = '00000000-0000-0000-0000-000000000002'$$,
    $$values (0::bigint)$$,
    'User A cannot read User B profile'
);

select lives_ok(
    $$
    update public.profiles
    set display_name = 'Hacked B'
    where id = '00000000-0000-0000-0000-000000000002'
    $$,
    'User A cannot update User B profile'
);

select lives_ok(
    $$
    delete from public.profiles
    where id = '00000000-0000-0000-0000-000000000002'
    $$,
    'User A cannot delete User B profile'
);

select results_eq(
    $$select count(*)::bigint from public.profiles
      where id = '00000000-0000-0000-0000-000000000002'$$,
    $$values (1::bigint)$$,
    'User B profile remains unchanged after User A write attempts'
);

select throws_ok(
    $$
    update public.profiles
    set id = '00000000-0000-0000-0000-000000000002'
    where id = '00000000-0000-0000-0000-000000000001'
    $$,
    '42501',
    'User A cannot transfer profile ownership to User B'
);

-- User B.
select set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000002',
    true
);

select results_eq(
    $$select id from public.profiles order by id$$,
    $$values ('00000000-0000-0000-0000-000000000002'::uuid)$$,
    'User B can see only User B profile'
);

select lives_ok(
    $$
    update public.profiles
    set display_name = 'Test User B Updated'
    where id = '00000000-0000-0000-0000-000000000002'
    $$,
    'User B can update own profile'
);

select results_eq(
    $$select count(*)::bigint from public.profiles
      where id = '00000000-0000-0000-0000-000000000001'$$,
    $$values (0::bigint)$$,
    'User B cannot read User A profile'
);

-- Anonymous client.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
    $$select * from public.profiles$$,
    '42501',
    'Anonymous client is denied access to profiles'
);

select throws_ok(
    $$
    insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-000000000003', 'Anonymous')
    $$,
    '42501',
    'Anonymous client cannot insert profiles'
);

-- Security events are server-side only.
set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000001',
    true
);

select ok(
    not has_table_privilege(
        'authenticated',
        'private.security_events',
        'SELECT,INSERT,UPDATE,DELETE'
    ),
    'authenticated has no direct privileges on security_events'
);

select throws_ok(
    $$select * from private.security_events$$,
    '42501',
    'authenticated cannot read security_events'
);

select ok(
    not has_table_privilege(
        'anon',
        'private.security_events',
        'SELECT,INSERT,UPDATE,DELETE'
    ),
    'anon has no direct privileges on security_events'
);

select * from finish();

rollback;
