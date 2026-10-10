-- supabase/tests/database/002_training_sessions_test.sql — Version 1.1
-- Real PostgreSQL role/RLS/trigger tests. Ciphertext fixture bytes are dummy data, not a crypto test.

begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data
)
values
(
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'training-test-a@example.invalid', 'not-a-real-password-hash',
    now(), now(), now(), '{}'::jsonb
),
(
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'training-test-b@example.invalid', 'not-a-real-password-hash',
    now(), now(), now(), '{}'::jsonb
);

select ok(
    (select relrowsecurity from pg_class where oid = 'public.training_sessions'::regclass),
    'training_sessions has RLS enabled'
);

select results_eq(
    $$
    select count(*)::bigint from pg_policies
    where schemaname = 'public' and tablename = 'training_sessions'
    $$,
    $$ values (3::bigint) $$,
    'training_sessions has explicit SELECT, INSERT and UPDATE policies'
);

select ok(
    exists (
        select 1 from pg_indexes
        where schemaname = 'public'
          and tablename = 'training_sessions'
          and indexname = 'training_sessions_user_date_idx'
    ),
    'training_sessions has a user/date lookup index'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
    $$
    insert into public.training_sessions (
        id, user_id, session_date, status, revision,
        payload_ciphertext, payload_nonce, payload_tag,
        payload_wrapped_key, payload_key_version
    ) values (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '2026-10-10', 'planned', 1,
        decode('01', 'hex'), decode(repeat('11', 12), 'hex'),
        decode(repeat('22', 16), 'hex'), decode('aabb', 'hex'),
        'aws-kms-training-v1'
    )
    $$,
    'User A can create an own encrypted-payload session at revision 1'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
    $$
    insert into public.training_sessions (
        id, user_id, session_date, status, revision,
        payload_ciphertext, payload_nonce, payload_tag,
        payload_wrapped_key, payload_key_version
    ) values (
        '20000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000002',
        '2026-10-10', 'planned', 1,
        decode('03', 'hex'), decode(repeat('33', 12), 'hex'),
        decode(repeat('44', 16), 'hex'), decode('ccdd', 'hex'),
        'aws-kms-training-v1'
    )
    $$,
    'User B can create an own encrypted-payload session'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select results_eq(
    $$ select id from public.training_sessions order by id $$,
    $$ values ('20000000-0000-4000-8000-000000000001'::uuid) $$,
    'User A can read only User A sessions'
);

select results_eq(
    $$ select count(*)::bigint from public.training_sessions where id = '20000000-0000-4000-8000-000000000002' $$,
    $$ values (0::bigint) $$,
    'User A cannot read User B session by known UUID'
);

select results_eq(
    $$
    update public.training_sessions
       set status = 'in_progress'
     where id = '20000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001'
       and revision = 0
    returning id
    $$,
    $$ select null::uuid where false $$,
    'A stale expected revision does not update a session'
);

select results_eq(
    $$
    update public.training_sessions
       set status = 'in_progress', revision = 900
     where id = '20000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001'
       and revision = 1
    returning revision
    $$,
    $$ values (2::bigint) $$,
    'Successful compare-and-swap increments revision exactly once and ignores client-supplied revision'
);

select results_eq(
    $$
    update public.training_sessions
       set revision = 999
     where id = '20000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001'
       and revision = 2
    returning revision
    $$,
    $$ values (3::bigint) $$,
    'A client cannot skip revisions by supplying an arbitrary value'
);

select throws_ok(
    $$
    update public.training_sessions
       set status = 'planned'
     where id = '20000000-0000-4000-8000-000000000001'
       and revision = 3
    $$,
    '23514',
    'training session status transition is invalid',
    'Invalid lifecycle transition is rejected by the database'
);

select throws_ok(
    $$
    update public.training_sessions
       set user_id = '10000000-0000-4000-8000-000000000002'
     where id = '20000000-0000-4000-8000-000000000001'
       and revision = 3
    $$,
    '42501',
    'training session identity and ownership are immutable',
    'User A cannot transfer a session to User B'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
    $$
    update public.training_sessions
       set status = 'in_progress'
     where id = '20000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001'
       and revision = 3
    returning id
    $$,
    $$ select null::uuid where false $$,
    'User B cannot update User A session by known UUID'
);

select results_eq(
    $$
    select count(*)::bigint from public.training_sessions
     where id = '20000000-0000-4000-8000-000000000002'
       and octet_length(payload_ciphertext) > 0
       and octet_length(payload_nonce) = 12
       and octet_length(payload_tag) = 16
       and octet_length(payload_wrapped_key) > 0
    $$,
    $$ values (1::bigint) $$,
    'Stored encrypted payload envelope has ciphertext, 12-byte nonce, 16-byte tag and wrapped DEK'
);

set local role anon;

select throws_ok(
    $$ select id from public.training_sessions $$,
    '42501',
    'permission denied for table training_sessions',
    'Anonymous role cannot read training sessions'
);

select * from finish();
rollback;
