-- Version 1.0
-- LifeGame Health: user-scoped persistent facts with RLS.
-- Migration: 20261008210000_health_user_scoped_storage

begin;

create table public.health_facts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('body', 'activity', 'recovery', 'lifestyle')),
    recorded_at timestamptz not null,
    source text not null default 'manual',
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.health_facts is
    'Private LifeGame Health facts, scoped to one authenticated user. Indexes and diagnoses are derived and are not stored here.';

create index health_facts_user_category_recorded_idx
    on public.health_facts (user_id, category, recorded_at);

alter table public.health_facts enable row level security;

create policy health_facts_select_own
    on public.health_facts
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy health_facts_insert_own
    on public.health_facts
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy health_facts_update_own
    on public.health_facts
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy health_facts_delete_own
    on public.health_facts
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

grant select, insert, update, delete
    on public.health_facts
    to authenticated;

commit;
