-- supabase/migrations/20261010160000_create_training_sessions.sql — Version 1.1
-- Private training-session persistence; direct authenticated table access is denied, and writes must use the server-side handler.

begin;

create table public.training_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    session_date date not null,
    status text not null check (status in ('planned', 'in_progress', 'completed')),
    revision bigint not null default 1 check (revision > 0),
    payload_ciphertext bytea not null check (octet_length(payload_ciphertext) between 1 and 262144),
    payload_nonce bytea not null check (octet_length(payload_nonce) = 12),
    payload_tag bytea not null check (octet_length(payload_tag) = 16),
    payload_wrapped_key bytea not null check (octet_length(payload_wrapped_key) between 1 and 8192),
    payload_key_version text not null check (char_length(btrim(payload_key_version)) between 1 and 200),
    created_at timestamptz not null default clock_timestamp(),
    updated_at timestamptz not null default clock_timestamp()
);

comment on table public.training_sessions is
    'Private LifeGame training sessions. Direct authenticated/anon table access is revoked; a trusted server handler performs owner-scoped access. Private payload fields contain authenticated ciphertext.';
comment on column public.training_sessions.session_date is
    'Minimal calendar metadata; reveals training frequency and is not encrypted.';
comment on column public.training_sessions.status is
    'Minimal lifecycle metadata; valid values are planned, in_progress, completed.';
comment on column public.training_sessions.revision is
    'Database-maintained monotonic revision. Updates must filter by the expected revision for atomic compare-and-swap.';
comment on column public.training_sessions.payload_ciphertext is
    'AES-256-GCM ciphertext for private training payload. Plaintext must never be stored here.';
comment on column public.training_sessions.payload_nonce is
    '12-byte AES-GCM nonce; unique per encryption operation.';
comment on column public.training_sessions.payload_tag is
    '16-byte AES-GCM authentication tag.';
comment on column public.training_sessions.payload_wrapped_key is
    'KMS-wrapped per-record DEK. The plaintext DEK must never be stored in PostgreSQL.';
comment on column public.training_sessions.payload_key_version is
    'Opaque encryption-key configuration version used to resolve the KMS key during decryption.';

create index training_sessions_user_date_idx
    on public.training_sessions (user_id, session_date desc);

alter table public.training_sessions enable row level security;

create policy training_sessions_select_own
    on public.training_sessions
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy training_sessions_insert_own
    on public.training_sessions
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy training_sessions_update_own
    on public.training_sessions
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

revoke all on table public.training_sessions from public;
revoke all on table public.training_sessions from anon;
revoke all on table public.training_sessions from authenticated;
-- User JWTs must not access the table directly. The Edge Function verifies the user first,
-- then uses a server-only service-role client and explicit user_id filters in the repository.
-- RLS remains enabled as defense in depth; service_role is never exposed to clients.
grant select, insert, update on table public.training_sessions to service_role;

create or replace function private.enforce_training_session_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    authenticated_user_id uuid;
begin
    authenticated_user_id := (select auth.uid());

    if authenticated_user_id is null and current_user <> 'service_role' then
        raise exception 'training session requires an authenticated user or trusted server role'
            using errcode = '42501';
    end if;

    if tg_op = 'INSERT' then
        if authenticated_user_id is not null and new.user_id is distinct from authenticated_user_id then
            raise exception 'training session owner must match authenticated user'
                using errcode = '42501';
        end if;

        if new.revision is distinct from 1 then
            raise exception 'new training session must start at revision 1'
                using errcode = '23514';
        end if;

        new.created_at := clock_timestamp();
        new.updated_at := new.created_at;
        return new;
    end if;

    if authenticated_user_id is not null and old.user_id is distinct from authenticated_user_id then
        raise exception 'training session owner must match authenticated user'
            using errcode = '42501';
    end if;

    if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
        raise exception 'training session identity and ownership are immutable'
            using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (
           (old.status = 'planned' and new.status = 'in_progress')
           or (old.status = 'in_progress' and new.status = 'completed')
       ) then
        raise exception 'training session status transition is invalid'
            using errcode = '23514';
    end if;

    new.created_at := old.created_at;
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
    return new;
end;
$$;

comment on function private.enforce_training_session_write() is
    'SECURITY INVOKER trigger: binds writes to auth.uid(), preserves immutable identity, enforces valid status transitions, and increments revision atomically.';

revoke all on function private.enforce_training_session_write() from public;
revoke all on function private.enforce_training_session_write() from anon;
revoke all on function private.enforce_training_session_write() from authenticated;

create trigger training_sessions_enforce_write
    before insert or update on public.training_sessions
    for each row
    execute function private.enforce_training_session_write();

commit;
