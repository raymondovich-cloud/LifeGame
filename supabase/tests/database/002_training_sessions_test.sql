-- supabase/tests/database/002_training_sessions_test.sql — Version 1.3
-- Confirms direct user-table access is denied and trusted server writes retain trigger invariants.

begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','training-test-a@example.invalid','not-a-real-password-hash',now(),now(),now(),'{}'::jsonb),
('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','training-test-b@example.invalid','not-a-real-password-hash',now(),now(),now(),'{}'::jsonb);

select ok((select relrowsecurity from pg_class where oid = 'public.training_sessions'::regclass), 'training_sessions has RLS enabled');
select results_eq($$ select count(*)::bigint from pg_policies where schemaname='public' and tablename='training_sessions' $$, $$ values (3::bigint) $$, 'ownership RLS policies remain as defense in depth');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='training_sessions' and indexname='training_sessions_user_date_idx'), 'training_sessions has a user/date lookup index');
select ok(not has_table_privilege('authenticated','public.training_sessions','SELECT'), 'authenticated users cannot directly select the table');
select ok(not has_table_privilege('authenticated','public.training_sessions','INSERT'), 'authenticated users cannot directly insert rows');
select ok(not has_table_privilege('authenticated','public.training_sessions','UPDATE'), 'authenticated users cannot directly update rows');
select ok(not has_table_privilege('anon','public.training_sessions','SELECT'), 'anonymous users cannot directly select the table');

set local role service_role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$ insert into public.training_sessions (id,user_id,session_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2026-10-10','planned',1,decode('01','hex'),decode(repeat('11',12),'hex'),decode(repeat('22',16),'hex'),decode('aabb','hex'),'test-key-v1') $$, 'Trusted server can create a session for the verified user');
select throws_ok($$ insert into public.training_sessions (id,user_id,session_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','2026-10-10','planned',1,decode('03','hex'),decode(repeat('33',12),'hex'),decode(repeat('44',16),'hex'),decode('ccdd','hex'),'test-key-v1') $$, '42501', 'training session owner must match authenticated user', 'When a verified user context exists, the trigger rejects a different owner');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$ insert into public.training_sessions (id,user_id,session_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','2026-10-10','planned',1,decode('03','hex'),decode(repeat('33',12),'hex'),decode(repeat('44',16),'hex'),decode('ccdd','hex'),'test-key-v1') $$, 'Trusted server can create a session for a second verified user');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select results_eq($$ update public.training_sessions set status='in_progress' where id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001' and revision=0 returning id $$, $$ select null::uuid where false $$, 'A stale expected revision does not update a session');
select results_eq($$ update public.training_sessions set status='in_progress' where id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001' and revision=1 returning revision $$, $$ values (2::bigint) $$, 'Successful compare-and-swap increments revision exactly once');
select throws_ok($$ update public.training_sessions set status='planned' where id='20000000-0000-4000-8000-000000000001' and revision=2 $$, '23514', 'training session status transition is invalid', 'Invalid lifecycle transition is rejected by the database');
select throws_ok($$ update public.training_sessions set user_id='10000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001' and revision=2 $$, '42501', 'training session identity and ownership are immutable', 'Trusted server updates cannot transfer an existing session to another owner');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok($$ select id from public.training_sessions $$, '42501', 'permission denied for table training_sessions', 'Authenticated clients cannot read rows directly; they must use the server handler');
select throws_ok($$ insert into public.training_sessions (user_id,session_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values ('10000000-0000-4000-8000-000000000001','2026-10-10','planned',1,decode('01','hex'),decode(repeat('11',12),'hex'),decode(repeat('22',16),'hex'),decode('aabb','hex'),'test-key-v1') $$, '42501', 'permission denied for table training_sessions', 'Authenticated clients cannot insert rows directly');
select throws_ok($$ update public.training_sessions set status='completed' where id='20000000-0000-4000-8000-000000000001' $$, '42501', 'permission denied for table training_sessions', 'Authenticated clients cannot update rows directly');
reset role;
set local role anon;
select throws_ok($$ select id from public.training_sessions $$, '42501', 'permission denied for table training_sessions', 'Anonymous clients cannot read training sessions');

select * from finish();
rollback;