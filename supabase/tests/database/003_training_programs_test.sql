-- supabase/tests/database/003_training_programs_test.sql — Version 1.2
-- Verifies direct access denial, owner binding, immutable identity and revision CAS for programs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','program-test-a@example.invalid','not-a-real-password-hash',now(),now(),now(),'{}'::jsonb),
('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','program-test-b@example.invalid','not-a-real-password-hash',now(),now(),now(),'{}'::jsonb);
select ok((select relrowsecurity from pg_class where oid='public.training_programs'::regclass),'training_programs has RLS enabled');
select is((select count(*)::bigint from pg_policies where schemaname='public' and tablename='training_programs'),0::bigint,'no direct client RLS policies are granted');
select ok(not has_table_privilege('authenticated','public.training_programs','SELECT'),'authenticated cannot directly select programs');
select ok(not has_table_privilege('authenticated','public.training_programs','INSERT'),'authenticated cannot directly insert programs');
select ok(not has_table_privilege('authenticated','public.training_programs','UPDATE'),'authenticated cannot directly update programs');
select ok(not has_table_privilege('anon','public.training_programs','SELECT'),'anon cannot directly select programs');
set local role service_role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.training_programs(id,user_id,start_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2026-10-05','active',1,decode('01','hex'),decode(repeat('11',12),'hex'),decode(repeat('22',16),'hex'),decode('aabb','hex'),'dev-key-v1')$$,'trusted server can create a program for its verified owner');
select throws_ok($$insert into public.training_programs(id,user_id,start_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version) values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','2026-10-05','active',1,decode('01','hex'),decode(repeat('11',12),'hex'),decode(repeat('22',16),'hex'),decode('aabb','hex'),'dev-key-v1')$$,'42501','training program owner mismatch','verified user context cannot write a program for another owner');
update public.training_programs set status='paused' where id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001' and revision=0;
select is((select revision from public.training_programs where id='20000000-0000-4000-8000-000000000001'),1::bigint,'stale expected revision leaves the stored revision unchanged');
update public.training_programs set status='paused' where id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001' and revision=1;
select is((select revision from public.training_programs where id='20000000-0000-4000-8000-000000000001'),2::bigint,'successful compare-and-swap increments revision');
select throws_ok($$update public.training_programs set user_id='10000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001' and revision=2$$,'42501','training program identity and ownership are immutable','program ownership cannot be changed');
reset role;
set local role authenticated;
select throws_ok($$select id from public.training_programs$$,'42501','permission denied for table training_programs','authenticated client cannot read program table directly');
reset role;
select * from finish();
rollback;
