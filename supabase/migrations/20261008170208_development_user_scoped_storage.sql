-- supabase/migrations/20261008193000_development_user_scoped_storage.sql — Version 1.0
begin;
create table public.development_facts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,category text not null check(category in('direction','goals','growth','execution','balance')),payload jsonb not null default '{}'::jsonb,recorded_at bigint not null,created_at timestamptz not null default now());
create index development_facts_user_category_recorded_idx on public.development_facts(user_id,category,recorded_at desc);
alter table public.development_facts enable row level security;
create policy "development_facts_select_own" on public.development_facts for select using(auth.uid()=user_id);
create policy "development_facts_insert_own" on public.development_facts for insert with check(auth.uid()=user_id);
create policy "development_facts_update_own" on public.development_facts for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "development_facts_delete_own" on public.development_facts for delete using(auth.uid()=user_id);
comment on table public.development_facts is 'Private LifeGame Development facts, scoped to one authenticated user. Indexes and diagnoses are derived and are not stored here.';
commit;