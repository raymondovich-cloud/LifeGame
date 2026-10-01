-- LifeGame 3.0
-- Identity Foundation
-- Migration: 0001_identity_foundation
-- Date: 2026-10-01
--
-- Scope:
--   - public.profiles
--   - private.security_events
--   - grants
--   - RLS policies
--
-- Deliberately excluded:
--   - passwords
--   - custom sessions
--   - encryption keys
--   - domain data
--   - application logic
--
-- Supabase Auth remains the source of truth for authentication identity.

begin;

-- ============================================================
-- 1. Private schema
-- ============================================================

create schema if not exists private;

-- The private schema must not be exposed through the Data API.
-- Do not grant API roles access to it.

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- service_role is intentionally not granted here.
-- Supabase's service_role is an administrative role and bypasses RLS.
-- Server-side infrastructure may access private objects through
-- its existing privileged database connection.

-- ============================================================
-- 2. Public profile
-- ============================================================

create table public.profiles (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,

    created_at timestamptz not null
        default timezone('utc', now()),

    updated_at timestamptz not null
        default timezone('utc', now())
);

comment on table public.profiles is
    'Minimal LifeGame application profile. Canonical identity is auth.users.id.';

comment on column public.profiles.id is
    'Canonical LifeGame user identity; equals auth.users.id.';

comment on column public.profiles.display_name is
    'Optional non-sensitive display name.';

comment on column public.profiles.created_at is
    'UTC creation timestamp.';

comment on column public.profiles.updated_at is
    'UTC last-update timestamp.';

-- Ownership lookup / RLS performance.
create index profiles_id_idx
    on public.profiles (id);

-- ============================================================
-- 3. Profiles timestamp maintenance
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

comment on function public.set_updated_at() is
    'Generic timestamp helper for LifeGame tables. SECURITY INVOKER only.';

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- The trigger function is not an API endpoint.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

-- ============================================================
-- 4. Profiles grants
-- ============================================================

-- Start from deny-by-default for API roles.
revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

-- Authenticated users may operate on their own row only;
-- RLS below supplies the row-level authorization boundary.
grant select, insert, update, delete
on table public.profiles
to authenticated;

-- No profile access for anon.
-- service_role remains administrative and is intentionally not
-- granted through this migration.

-- ============================================================
-- 5. Profiles RLS
-- ============================================================

alter table public.profiles enable row level security;

-- Explicit policies per operation.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (
    (select auth.uid()) is not null
    and (select auth.uid()) = id
);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = id
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
    (select auth.uid()) is not null
    and (select auth.uid()) = id
)
with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = id
);

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (
    (select auth.uid()) is not null
    and (select auth.uid()) = id
);

-- ============================================================
-- 6. Private security events
-- ============================================================

create table private.security_events (
    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references auth.users(id)
        on delete set null,

    event_type text not null,

    occurred_at timestamptz not null
        default timezone('utc', now()),

    session_id text,

    metadata jsonb,

    created_at timestamptz not null
        default timezone('utc', now())
);

comment on table private.security_events is
    'Internal LifeGame security/audit events. Never directly exposed to clients.';

comment on column private.security_events.user_id is
    'Optional canonical auth user UUID. Set NULL when retaining an event after account deletion.';

comment on column private.security_events.event_type is
    'Stable security event identifier, e.g. identity.authentication.failed.';

comment on column private.security_events.occurred_at is
    'UTC time at which the security event occurred.';

comment on column private.security_events.session_id is
    'Optional non-secret session reference. Never store access or refresh tokens here.';

comment on column private.security_events.metadata is
    'Structured non-secret event metadata. Never store passwords, tokens, recovery secrets, or encryption keys.';

-- Security-event lookup index.
create index security_events_user_id_idx
    on private.security_events (user_id);

create index security_events_occurred_at_idx
    on private.security_events (occurred_at);

create index security_events_type_idx
    on private.security_events (event_type);

-- No API-role grants.
revoke all on table private.security_events from public;
revoke all on table private.security_events from anon;
revoke all on table private.security_events from authenticated;

-- Explicitly keep RLS enabled as defense in depth if the schema is
-- ever exposed accidentally in a future configuration.
alter table private.security_events enable row level security;

-- No policies are created for client roles.
-- With no grants and no policies, direct client access is denied.

-- ============================================================
-- 7. Default privileges
-- ============================================================
--
-- This migration protects the objects it creates.
-- Future user-owned tables must independently define their grants
-- and RLS policies according to the Identity Database Schema.
--
-- We intentionally do not globally alter Supabase-managed defaults
-- here because those defaults are project/environment dependent.

commit;
