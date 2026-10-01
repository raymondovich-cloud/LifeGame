-- LifeGame 3.0
-- Identity Foundation database contract tests
--
-- These tests validate the database security structure.
-- Full two-user behavioral RLS tests require the Supabase test helpers
-- and will be added with the complete local Supabase test harness.

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_table(
    'public',
    'profiles',
    'public.profiles exists'
);

select has_table(
    'private',
    'security_events',
    'private.security_events exists'
);

select has_column(
    'public',
    'profiles',
    'id',
    'profiles.id exists'
);

select col_is_pk(
    'public',
    'profiles',
    'id',
    'profiles.id is the primary key'
);

select results_eq(
    $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
    $$,
    $$values (4::bigint)$$,
    'profiles has exactly four operation-specific RLS policies'
);

select results_eq(
    $$
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
    $$,
    $$values (true)$$,
    'profiles has RLS enabled'
);

select results_eq(
    $$
    select has_schema_privilege('anon', 'private', 'USAGE')
    $$,
    $$values (false)$$,
    'anon has no USAGE privilege on private schema'
);

select results_eq(
    $$
    select has_schema_privilege('authenticated', 'private', 'USAGE')
    $$,
    $$values (false)$$,
    'authenticated has no USAGE privilege on private schema'
);

select results_eq(
    $$
    select has_table_privilege(
        'anon',
        'public.profiles',
        'SELECT,INSERT,UPDATE,DELETE'
    )
    $$,
    $$values (false)$$,
    'anon has no direct privileges on profiles'
);

select results_eq(
    $$
    select has_table_privilege(
        'authenticated',
        'public.profiles',
        'SELECT,INSERT,UPDATE,DELETE'
    )
    $$,
    $$values (true)$$,
    'authenticated has the required table privileges; RLS limits rows'
);

select * from finish();

rollback;
