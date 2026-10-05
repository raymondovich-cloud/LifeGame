-- Version 1.0
-- LifeGame Finance: user-scoped PostgreSQL storage foundation.
-- Migration: 20261005144756_create_finance_user_scoped_storage
--
-- Canonical Finance state is persisted per authenticated user.
-- Assets snapshots are historical derived state and are not primary state.

begin;

create table public.finance_assets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    amount numeric not null check (amount > 0),
    liquidity text not null check (liquidity in ('liquid', 'illiquid')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_assets is
    'Current Finance Assets state, scoped to one authenticated user.';

create index finance_assets_user_id_idx
    on public.finance_assets (user_id);

create table public.finance_actual_earnings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    amount numeric not null check (amount > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_actual_earnings is
    'Current Finance Actual Earnings state, scoped to one authenticated user.';

create index finance_actual_earnings_user_id_idx
    on public.finance_actual_earnings (user_id);

create table public.finance_burdens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    debt numeric not null check (debt > 0),
    payment numeric not null check (payment >= 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_burdens is
    'Current Finance Financial Burden state, scoped to one authenticated user.';

create index finance_burdens_user_id_idx
    on public.finance_burdens (user_id);

create table public.finance_mandatory_expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    amount numeric not null check (amount > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_mandatory_expenses is
    'Current Finance Mandatory Expenses state, scoped to one authenticated user.';

create index finance_mandatory_expenses_user_id_idx
    on public.finance_mandatory_expenses (user_id);

create table public.finance_cushions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    amount numeric not null check (amount > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_cushions is
    'Current Finance Financial Cushion state, scoped to one authenticated user.';

create index finance_cushions_user_id_idx
    on public.finance_cushions (user_id);

create table public.finance_asset_snapshots (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    occurred_at timestamptz not null,
    total numeric not null default 0,
    entries jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_asset_snapshots is
    'Historical Assets snapshots, scoped to one authenticated user; derived history, not primary state.';

create index finance_asset_snapshots_user_occurred_idx
    on public.finance_asset_snapshots (user_id, occurred_at);

alter table public.finance_assets enable row level security;
alter table public.finance_actual_earnings enable row level security;
alter table public.finance_burdens enable row level security;
alter table public.finance_mandatory_expenses enable row level security;
alter table public.finance_cushions enable row level security;
alter table public.finance_asset_snapshots enable row level security;

create policy finance_assets_select_own
    on public.finance_assets
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_assets_insert_own
    on public.finance_assets
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy finance_assets_update_own
    on public.finance_assets
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy finance_assets_delete_own
    on public.finance_assets
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_actual_earnings_select_own
    on public.finance_actual_earnings
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_actual_earnings_insert_own
    on public.finance_actual_earnings
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy finance_actual_earnings_update_own
    on public.finance_actual_earnings
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy finance_actual_earnings_delete_own
    on public.finance_actual_earnings
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_burdens_select_own
    on public.finance_burdens
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_burdens_insert_own
    on public.finance_burdens
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy finance_burdens_update_own
    on public.finance_burdens
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy finance_burdens_delete_own
    on public.finance_burdens
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_mandatory_expenses_select_own
    on public.finance_mandatory_expenses
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_mandatory_expenses_insert_own
    on public.finance_mandatory_expenses
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy finance_mandatory_expenses_update_own
    on public.finance_mandatory_expenses
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy finance_mandatory_expenses_delete_own
    on public.finance_mandatory_expenses
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_cushions_select_own
    on public.finance_cushions
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_cushions_insert_own
    on public.finance_cushions
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy finance_cushions_update_own
    on public.finance_cushions
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy finance_cushions_delete_own
    on public.finance_cushions
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_asset_snapshots_select_own
    on public.finance_asset_snapshots
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_asset_snapshots_insert_own
    on public.finance_asset_snapshots
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
    on public.finance_assets,
       public.finance_actual_earnings,
       public.finance_burdens,
       public.finance_mandatory_expenses,
       public.finance_cushions,
       public.finance_asset_snapshots
    to authenticated;

commit;
