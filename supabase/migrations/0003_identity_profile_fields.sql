-- LifeGame 3.0
-- Identity Profile Fields
-- Version: 1.0
--
-- Responsibility:
-- - store registration profile data in the user-scoped public profile row
-- - extend the existing Auth bootstrap trigger
--
-- Canonical profile data lives in public.profiles.
-- auth.users.raw_user_meta_data is used only as signup bootstrap input.

alter table public.profiles
    add column if not exists birth_date date;

create or replace function private.handle_new_identity_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        display_name,
        birth_date
    )
    values (
        new.id,
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
    );

    insert into private.security_events (
        user_id,
        event_type,
        occurred_at,
        metadata
    )
    values (
        new.id,
        'identity.user.registered',
        coalesce(new.created_at, now()),
        jsonb_build_object('source', 'auth.users')
    );

    return new;
end;
$$;

revoke all on function private.handle_new_identity_user() from public;
revoke all on function private.handle_new_identity_user() from anon;
revoke all on function private.handle_new_identity_user() from authenticated;
