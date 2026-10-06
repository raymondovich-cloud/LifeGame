-- Finance collection history for period dynamics.
-- Version 1.0

begin;

create table public.finance_snapshots (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    collection text not null check (
        collection in (
            'actual-earnings',
            'financial-burden',
            'mandatory-expenses',
            'financial-cushion'
        )
    ),
    occurred_at timestamptz not null,
    total numeric not null default 0,
    entries jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.finance_snapshots is
    'Historical Finance collection snapshots used for period dynamics; scoped to one authenticated user.';

create index finance_snapshots_user_collection_occurred_idx
    on public.finance_snapshots (user_id, collection, occurred_at);

alter table public.finance_snapshots enable row level security;

create policy finance_snapshots_select_own
    on public.finance_snapshots
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy finance_snapshots_insert_own
    on public.finance_snapshots
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

grant select, insert
    on public.finance_snapshots
    to authenticated;

commit;
